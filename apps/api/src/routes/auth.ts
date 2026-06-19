import { Elysia, t } from "elysia";
import { db, users } from "@beefurca/database";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import {
  signAccessToken,
  signRefreshToken,
  verifyToken,
  isRefreshTokenActive,
  revokeRefreshToken,
  authPlugin,
} from "../middleware/auth";
import { RegisterInputSchema, LoginInputSchema } from "@beefurca/shared-types";

export const authRoutes = new Elysia({ prefix: "/auth" })
  .use(authPlugin)
  .post(
    "/register",
    async ({ body, set }) => {
      // Strict validation via shared Zod schema (email format, password/nickname length)
      const parsed = RegisterInputSchema.safeParse(body);
      if (!parsed.success) {
        set.status = 400;
        return { error: "Validation failed", details: parsed.error.format() };
      }

      // Check if email or nickname is already taken
      const [existingUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, body.email))
        .limit(1);

      if (existingUser) {
        set.status = 400;
        return { error: "Email is already registered" };
      }

      const [existingNickname] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.nickname, body.nickname))
        .limit(1);

      if (existingNickname) {
        set.status = 400;
        return { error: "Nickname is already taken" };
      }

      // Hash password and insert user.
      // SECURITY: роль НИКОГДА не берётся из тела запроса — иначе любой
      // зарегистрировался бы как Organizer/Admin. Все регистрируются как Player;
      // повышение роли возможно только через PUT /admin/users/:id/role.
      const passwordHash = await bcrypt.hash(body.password, 12);
      const [newUser] = await db
        .insert(users)
        .values({
          nickname: body.nickname,
          email: body.email,
          fullName: body.fullName || null,
          phone: body.phone || null,
          passwordHash,
          role: "Player",
          elo: 1000,
          isTrusted: false,
          isBanned: false,
          isDeleted: false,
        })
        .returning({
          id: users.id,
          nickname: users.nickname,
          email: users.email,
          role: users.role,
        });

      return { message: "Registration successful", user: newUser };
    },
    {
      body: t.Object({
        nickname: t.String(),
        email: t.String(),
        password: t.String(),
        fullName: t.Optional(t.String()),
        phone: t.Optional(t.String()),
      }),
    }
  )
  .post(
    "/login",
    async ({ body, set }) => {
      const parsed = LoginInputSchema.safeParse(body);
      if (!parsed.success) {
        set.status = 400;
        return { error: "Validation failed", details: parsed.error.format() };
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, body.email))
        .limit(1);

      if (!user || user.isDeleted) {
        set.status = 401;
        return { error: "Invalid email or password" };
      }

      if (user.isBanned) {
        set.status = 403;
        return { error: "Your account is banned" };
      }

      // Аккаунт без локального пароля создан через Discord OAuth
      if (!user.passwordHash) {
        set.status = 400;
        return { error: "This account uses Discord sign-in. Please log in with Discord." };
      }

      const isMatch = await bcrypt.compare(body.password, user.passwordHash);
      if (!isMatch) {
        set.status = 401;
        return { error: "Invalid email or password" };
      }

      const payload = {
        userId: user.id,
        nickname: user.nickname,
        email: user.email,
        role: user.role,
      };

      // Sign tokens
      const accessToken = await signAccessToken(payload);
      const refreshToken = await signRefreshToken(payload);

      // Set cookies. Оба токена httpOnly+secure, чтобы их нельзя было украсть
      // из JS при XSS; клиент дополнительно получает accessToken в теле ответа
      // для использования в заголовке Authorization.
      set.headers["set-cookie"] = [
        `access_token=${accessToken}; Path=/; HttpOnly; Secure; Max-Age=900; SameSite=Lax`,
        `refresh_token=${refreshToken}; Path=/; HttpOnly; Secure; Max-Age=604800; SameSite=Lax`,
      ];

      return {
        message: "Login successful",
        accessToken,
        user: {
          id: user.id,
          nickname: user.nickname,
          email: user.email,
          role: user.role,
        },
      };
    },
    {
      body: t.Object({
        email: t.String(),
        password: t.String(),
      }),
    }
  )
  .post("/refresh", async ({ headers, set }) => {
    const cookieHeader = headers["cookie"] || "";
    const match = cookieHeader.match(/refresh_token=([^;]+)/);
    if (!match) {
      set.status = 401;
      return { error: "No refresh token cookie found" };
    }

    const refreshToken = match[1];

    try {
      const payload = await verifyToken(refreshToken);

      if (!payload.jti) {
        set.status = 401;
        return { error: "Invalid refresh token structure" };
      }

      const active = await isRefreshTokenActive(payload.userId, payload.jti);
      if (!active) {
        set.status = 401;
        return { error: "Refresh token is expired or revoked" };
      }

      // Verify db user is active
      const [dbUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, payload.userId))
        .limit(1);

      if (!dbUser || dbUser.isDeleted || dbUser.isBanned) {
        set.status = 401;
        return { error: "User is banned or no longer exists" };
      }

      // Rotate: revoke old, sign new
      await revokeRefreshToken(payload.userId, payload.jti);

      const userPayload = {
        userId: dbUser.id,
        nickname: dbUser.nickname,
        email: dbUser.email,
        role: dbUser.role,
      };

      const newAccessToken = await signAccessToken(userPayload);
      const newRefreshToken = await signRefreshToken(userPayload);

      // Update cookies (оба httpOnly+secure)
      set.headers["set-cookie"] = [
        `access_token=${newAccessToken}; Path=/; HttpOnly; Secure; Max-Age=900; SameSite=Lax`,
        `refresh_token=${newRefreshToken}; Path=/; HttpOnly; Secure; Max-Age=604800; SameSite=Lax`,
      ];

      return {
        accessToken: newAccessToken,
        user: userPayload,
      };
    } catch (err) {
      set.status = 401;
      return { error: "Invalid refresh token" };
    }
  })
  .post("/logout", async ({ headers, set }) => {
    const cookieHeader = headers["cookie"] || "";
    const match = cookieHeader.match(/refresh_token=([^;]+)/);
    
    if (match) {
      const refreshToken = match[1];
      try {
        const payload = await verifyToken(refreshToken);
        if (payload.jti) {
          await revokeRefreshToken(payload.userId, payload.jti);
        }
      } catch (err) {
        // Ignore invalid token on logout
      }
    }

    // Clear cookies
    set.headers["set-cookie"] = [
      "access_token=; Path=/; Max-Age=0",
      "refresh_token=; Path=/; Max-Age=0",
    ];

    return { message: "Logged out successfully" };
  })
  // --- DISCORD OAUTH ---
  // 1. Старт авторизации: редирект на страницу согласия Discord
  .get("/discord", ({ set }) => {
    const clientId = process.env.DISCORD_CLIENT_ID;
    const redirectUri = process.env.DISCORD_REDIRECT_URI;
    if (!clientId || !redirectUri) {
      set.status = 500;
      return { error: "Discord OAuth is not configured on the server" };
    }

    // state защищает от CSRF: кладём в cookie и сверяем в callback
    const state = crypto.randomUUID();
    set.headers["set-cookie"] =
      `oauth_state=${state}; Path=/; HttpOnly; Secure; Max-Age=600; SameSite=Lax`;

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "identify email",
      state,
    });

    set.status = 302;
    set.headers["location"] = `${DISCORD_API}/oauth2/authorize?${params.toString()}`;
    return null;
  })
  // 2. Callback: обмен кода на токен, получение профиля, выдача сессии
  .get(
    "/discord/callback",
    async ({ query, headers, set }) => {
      const clientId = process.env.DISCORD_CLIENT_ID;
      const clientSecret = process.env.DISCORD_CLIENT_SECRET;
      const redirectUri = process.env.DISCORD_REDIRECT_URI;
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

      if (!clientId || !clientSecret || !redirectUri) {
        set.status = 500;
        return { error: "Discord OAuth is not configured on the server" };
      }
      if (!query.code) {
        set.status = 400;
        return { error: "Missing authorization code" };
      }

      // Проверка CSRF-state
      const cookieHeader = headers["cookie"] || "";
      const stateMatch = cookieHeader.match(/oauth_state=([^;]+)/);
      if (!stateMatch || !query.state || stateMatch[1] !== query.state) {
        set.status = 400;
        return { error: "Invalid OAuth state" };
      }

      try {
        // Обмен кода на access_token Discord
        const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: "authorization_code",
            code: query.code,
            redirect_uri: redirectUri,
          }).toString(),
        });
        if (!tokenRes.ok) {
          set.status = 401;
          return { error: "Failed to exchange Discord authorization code" };
        }
        const tokenData: any = await tokenRes.json();

        // Профиль Discord
        const meRes = await fetch(`${DISCORD_API}/users/@me`, {
          headers: { authorization: `Bearer ${tokenData.access_token}` },
        });
        if (!meRes.ok) {
          set.status = 401;
          return { error: "Failed to fetch Discord profile" };
        }
        const dUser: any = await meRes.json();

        const account = await findOrCreateDiscordUser(dUser);

        if (account.isBanned || account.isDeleted) {
          set.status = 403;
          return { error: "Your account is banned or no longer exists" };
        }

        const payload = {
          userId: account.id,
          nickname: account.nickname,
          email: account.email,
          role: account.role,
        };
        const accessToken = await signAccessToken(payload);
        const refreshToken = await signRefreshToken(payload);

        set.headers["set-cookie"] = [
          "oauth_state=; Path=/; Max-Age=0",
          `access_token=${accessToken}; Path=/; HttpOnly; Secure; Max-Age=900; SameSite=Lax`,
          `refresh_token=${refreshToken}; Path=/; HttpOnly; Secure; Max-Age=604800; SameSite=Lax`,
        ];

        set.status = 302;
        set.headers["location"] = `${frontendUrl}/dashboard`;
        return null;
      } catch (err: any) {
        set.status = 500;
        return { error: `Discord OAuth failed: ${err.message}` };
      }
    },
    {
      query: t.Object({
        code: t.Optional(t.String()),
        state: t.Optional(t.String()),
      }),
    }
  );

const DISCORD_API = "https://discord.com/api";

/**
 * Находит существующего пользователя по discordId, иначе привязывает Discord к
 * аккаунту с тем же email, иначе создаёт нового пользователя (без пароля).
 */
async function findOrCreateDiscordUser(dUser: {
  id: string;
  username?: string;
  global_name?: string;
  email?: string | null;
}) {
  const discordId = dUser.id;

  // 1. Уже привязан по discordId
  const [byDiscord] = await db
    .select()
    .from(users)
    .where(eq(users.discordId, discordId))
    .limit(1);
  if (byDiscord) return byDiscord;

  // 2. Есть аккаунт с таким email — привязываем Discord к нему
  if (dUser.email) {
    const [byEmail] = await db
      .select()
      .from(users)
      .where(eq(users.email, dUser.email))
      .limit(1);
    if (byEmail) {
      const [linked] = await db
        .update(users)
        .set({ discordId })
        .where(eq(users.id, byEmail.id))
        .returning();
      return linked;
    }
  }

  // 3. Создаём нового пользователя
  const email = dUser.email || `discord_${discordId}@users.beefurca.local`;
  const baseNick = (dUser.global_name || dUser.username || `discord_${discordId}`).slice(0, 40);

  let nickname = baseNick;
  const [nickTaken] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.nickname, nickname))
    .limit(1);
  if (nickTaken) nickname = `${baseNick}_${discordId.slice(-4)}`;

  const [created] = await db
    .insert(users)
    .values({
      nickname,
      email,
      fullName: dUser.global_name || null,
      passwordHash: null,
      discordId,
      role: "Player",
      elo: 1000,
      isTrusted: false,
      isBanned: false,
      isDeleted: false,
    })
    .returning();

  return created;
}
