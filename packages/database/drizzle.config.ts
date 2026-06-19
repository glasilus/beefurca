import type { Config } from "drizzle-kit";

export default {
  schema: "./schema.ts",
  out: "./migrations",
  driver: "pg",
  dbCredentials: {
    connectionString: process.env.DATABASE_URL || "postgres://beefurca:beefurca_secure_password@localhost:5432/beefurca_db",
  },
} satisfies Config;
