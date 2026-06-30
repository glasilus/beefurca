import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL ||
  "postgres://beefurca:beefurca_secure_password@localhost:5432/beefurca_db";

// для долгоживущего серверного API
export const client = postgres(connectionString);
export const db = drizzle(client, { schema });

// реэкспорт схемы и типов для других пакетов
export * from "./schema";
