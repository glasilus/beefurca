import Redis from "ioredis";

/**
 * Единый общий Redis-клиент для всего API.
 * Используется для ротации refresh-токенов, rate limiting и кэша лидербордов.
 * Один инстанс на процесс вместо отдельного подключения в каждом модуле.
 */
const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const redis = new Redis(redisUrl);
