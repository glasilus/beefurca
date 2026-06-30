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
      // строгая валидация общей Zod-схемой (формат email, длина пароля и никнейма)
      const parsed = RegisterInputSchema.safeParse(body);
      if (!parsed.success) {
        set.status = 400;
        return { error: "Validation failed", details: parsed.error.format() };
      }

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

      // SECURITY: роль НИКОГДА не берётся из тела запроса - иначе любой
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

      // Защита от учётных записей без установленного пароля
      if (!user.passwordHash) {
        set.status = 400;
        return { error: "Для этого аккаунта не задан пароль." };
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

      const accessToken = await signAccessToken(payload);
      const refreshToken = await signRefreshToken(payload);

      // Set cookies. Оба токена httpOnly+secure, чтобы их нельзя было украсть
      // из JS при XSS; клиент дополнительно получает accessToken в теле ответа
      // для использования в заголовке Authorization.
      set.headers["set-cookie"] = [
        `access_token=${accessToken}; Path=/; HttpOnly; Secure; Max-Age=900; SameSite=None`,
        `refresh_token=${refreshToken}; Path=/; HttpOnly; Secure; Max-Age=604800; SameSite=None`,
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

      const [dbUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, payload.userId))
        .limit(1);

      if (!dbUser || dbUser.isDeleted || dbUser.isBanned) {
        set.status = 401;
        return { error: "User is banned or no longer exists" };
      }

      // ротация: отзываем старый токен, выпускаем новый
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
        `access_token=${newAccessToken}; Path=/; HttpOnly; Secure; Max-Age=900; SameSite=None`,
        `refresh_token=${newRefreshToken}; Path=/; HttpOnly; Secure; Max-Age=604800; SameSite=None`,
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
        // при выходе игнорируем невалидный токен
      }
    }

    set.headers["set-cookie"] = [
      "access_token=; Path=/; Max-Age=0",
      "refresh_token=; Path=/; Max-Age=0",
    ];

    return { message: "Logged out successfully" };
  });
