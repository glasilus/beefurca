import { Elysia } from "elysia";
import { importPKCS8, importSPKI, jwtVerify, SignJWT } from "jose";
import { getOrGenerateKeys } from "../utils/keys";
import { db, users } from "@beefurca/database";
import { eq } from "drizzle-orm";
import { redis } from "../utils/redis";

const { privateKey, publicKey } = getOrGenerateKeys();

// Re-export общего Redis-клиента для обратной совместимости импортов.
export { redis };

// Access/Refresh TTL configurations
const accessTTL = process.env.JWT_ACCESS_TTL || "15m";
const refreshTTL = process.env.JWT_REFRESH_TTL || "7d";
const refreshTTLSeconds = 7 * 24 * 60 * 60; // 7 days in seconds

export interface JWTPayload {
  userId: string;
  nickname: string;
  email: string;
  role: "Player" | "Referee" | "Organizer" | "Admin";
  jti?: string;
}

/**
 * Sign an Access Token (RS256)
 */
export async function signAccessToken(payload: Omit<JWTPayload, "jti">): Promise<string> {
  const pkey = await importPKCS8(privateKey, "RS256");
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuedAt()
    .setExpirationTime(accessTTL)
    .sign(pkey);
}

/**
 * Sign a Refresh Token (RS256), register it in Redis with UUID JTI
 */
export async function signRefreshToken(
  payload: Omit<JWTPayload, "jti">
): Promise<string> {
  const pkey = await importPKCS8(privateKey, "RS256");
  const jti = crypto.randomUUID();
  const token = await new SignJWT({ ...payload, jti })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuedAt()
    .setExpirationTime(refreshTTL)
    .sign(pkey);

  // Store in Redis: key is refresh_token:<userId>:<jti>, value is "active"
  const redisKey = `refresh_token:${payload.userId}:${jti}`;
  await redis.set(redisKey, "active", "EX", refreshTTLSeconds);

  return token;
}

/**
 * Verify any JWT Token
 */
export async function verifyToken(token: string): Promise<JWTPayload> {
  const pubkey = await importSPKI(publicKey, "RS256");
  const { payload } = await jwtVerify(token, pubkey);
  return payload as unknown as JWTPayload;
}

/**
 * Revoke a specific refresh token in Redis
 */
export async function revokeRefreshToken(userId: string, jti: string): Promise<void> {
  const redisKey = `refresh_token:${userId}:${jti}`;
  await redis.del(redisKey);
}

/**
 * Revoke ALL refresh tokens for a user (useful for bans or global logouts)
 */
export async function revokeAllUserTokens(userId: string): Promise<void> {
  // Find all keys for this user in Redis
  const pattern = `refresh_token:${userId}:*`;
  let cursor = "0";
  do {
    const [nextCursor, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
    cursor = nextCursor;
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } while (cursor !== "0");
}

/**
 * Checks if a specific refresh token JTI is active in Redis
 */
export async function isRefreshTokenActive(userId: string, jti: string): Promise<boolean> {
  const redisKey = `refresh_token:${userId}:${jti}`;
  const status = await redis.get(redisKey);
  return status === "active";
}

/**
 * Elysia Authentication derive plugin
 */
export const authPlugin = (app: Elysia) =>
  app.derive(async ({ request, headers, set }) => {
    const authHeader = headers["authorization"];
    let token: string | null = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } else {
      // Check cookies as fallback
      const cookieHeader = headers["cookie"] || "";
      const match = cookieHeader.match(/access_token=([^;]+)/);
      if (match) {
        token = match[1];
      }
    }

    if (!token) {
      return { user: null };
    }

    try {
      const payload = await verifyToken(token);

      // Verify database status to handle instant bans / deletions
      const [dbUser] = await db
        .select({
          isBanned: users.isBanned,
          isDeleted: users.isDeleted,
        })
        .from(users)
        .where(eq(users.id, payload.userId))
        .limit(1);

      if (!dbUser || dbUser.isBanned || dbUser.isDeleted) {
        set.status = 401;
        return { user: null, authError: "User account is banned or inactive" };
      }

      return {
        user: {
          id: payload.userId,
          nickname: payload.nickname,
          email: payload.email,
          role: payload.role,
        },
      };
    } catch (err) {
      return { user: null, authError: "Invalid or expired access token" };
    }
  });

/**
 * Role checking helper
 */
export function checkRole(user: any, allowedRoles: string[], set: any) {
  if (!user) {
    set.status = 401;
    throw new Error("Unauthorized");
  }
  if (!allowedRoles.includes(user.role)) {
    set.status = 403;
    throw new Error("Forbidden: Insufficient privileges");
  }
}
