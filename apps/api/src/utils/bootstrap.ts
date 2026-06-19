import { db, users } from "@beefurca/database";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

/**
 * Checks for the existence of any Admin role user.
 * If none exist, bootstraps the first Admin using environment variables.
 */
export async function bootstrapAdmin(): Promise<void> {
  try {
    // Check if there's any user with Admin role
    const existingAdmins = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, "Admin"))
      .limit(1);

    if (existingAdmins.length > 0) {
      console.log("Bootstrap: Admin user already exists. Skipping bootstrap.");
      return;
    }

    const email = process.env.BOOTSTRAP_ADMIN_EMAIL || "admin@beefurca.com";
    const password =
      process.env.BOOTSTRAP_ADMIN_PASSWORD || "change_this_to_a_secure_password";
    const nickname = process.env.BOOTSTRAP_ADMIN_NICKNAME || "SuperAdmin";

    console.log(`Bootstrap: No admin users found. Creating bootstrap admin:
 - Nickname: ${nickname}
 - Email: ${email}`);

    const passwordHash = await bcrypt.hash(password, 12);

    await db.insert(users).values({
      nickname,
      email,
      passwordHash,
      role: "Admin",
      elo: 1000,
      isTrusted: true, // Admin is trusted by default
      isBanned: false,
      isDeleted: false,
    });

    console.log("Bootstrap: First Admin account successfully created.");
  } catch (error) {
    console.error("Bootstrap: Error creating default Admin user:", error);
  }
}
