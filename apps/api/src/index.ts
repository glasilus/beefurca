import { Elysia } from "elysia";
import { node } from "@elysiajs/node";
import { cors } from "@elysiajs/cors";
import dotenv from "dotenv";
import { authRoutes } from "./routes/auth";
import { userRoutes } from "./routes/users";
import { tournamentRoutes } from "./routes/tournaments";
import { matchRoutes } from "./routes/matches";
import { adminRoutes } from "./routes/admin";
import { bootstrapAdmin } from "./utils/bootstrap";
import { startSseListener } from "./utils/sse";

// Load environment variables
dotenv.config();

// CORS: список разрешённых источников задаётся через ALLOWED_ORIGINS
// (через запятую). Если не задан — в dev разрешаем localhost-фронты.
// Конкретные домены вместе с credentials:true защищают от CSRF (origin:true был
// небезопасен).
const allowedOrigins = (process.env.ALLOWED_ORIGINS ||
  "http://localhost:3000,http://localhost:19006")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

// adapter: node() — Elysia рассчитан на Bun; этот адаптер позволяет запускать
// его под Node.js (иначе app.listen() падает: "WebStandard does not support listen").
const app = new Elysia({ adapter: node() })
  .use(cors({
    origin: allowedOrigins,
    credentials: true,
  }))
  .use(authRoutes)
  .use(userRoutes)
  .use(tournamentRoutes)
  .use(matchRoutes)
  .use(adminRoutes)
  .get("/health", () => ({ status: "OK", timestamp: new Date().toISOString() }));

// Bootstrap first admin account, subscribe to PG LISTEN, then start server
bootstrapAdmin()
  .then(() => startSseListener())
  .then(() => {
    const port = process.env.PORT || 5000;
    app.listen(port);
    console.log(`🚀 Elysia API Server is running on port ${port}`);
    console.log(` - Health check: http://localhost:${port}/health`);
  });
