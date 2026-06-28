import crypto from "crypto";
import fs from "fs";
import path from "path";

export interface KeyPair {
  privateKey: string;
  publicKey: string;
}

/**
 * Loads RSA keys in priority order:
 *  1. JWT_PRIVATE_KEY / JWT_PUBLIC_KEY env vars (production — survives redeployment)
 *  2. Key files at JWT_PRIVATE_KEY_PATH / JWT_PUBLIC_KEY_PATH (dev convenience)
 *  3. Auto-generate and save to files (first-run dev only — NOT suitable for production)
 */
export function getOrGenerateKeys(): KeyPair {
  const privateKeyEnv = process.env.JWT_PRIVATE_KEY;
  const publicKeyEnv = process.env.JWT_PUBLIC_KEY;

  if (privateKeyEnv && publicKeyEnv) {
    // Env vars may have literal \n instead of real newlines (Railway/Vercel quirk)
    return {
      privateKey: privateKeyEnv.replace(/\\n/g, "\n"),
      publicKey: publicKeyEnv.replace(/\\n/g, "\n"),
    };
  }

  const privatePath = process.env.JWT_PRIVATE_KEY_PATH || "keys/private.pem";
  const publicPath = process.env.JWT_PUBLIC_KEY_PATH || "keys/public.pem";

  if (fs.existsSync(privatePath) && fs.existsSync(publicPath)) {
    return {
      privateKey: fs.readFileSync(privatePath, "utf8"),
      publicKey: fs.readFileSync(publicPath, "utf8"),
    };
  }

  // Dev fallback: generate and save for this session
  console.warn(
    "JWT_PRIVATE_KEY / JWT_PUBLIC_KEY env vars not set. " +
    "Generating ephemeral RSA keys — tokens will be invalidated on restart. " +
    "Set these vars in production."
  );

  const dir = path.dirname(privatePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const pubDir = path.dirname(publicPath);
  if (!fs.existsSync(pubDir)) fs.mkdirSync(pubDir, { recursive: true });

  const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });

  fs.writeFileSync(privatePath, privateKey, "utf8");
  fs.writeFileSync(publicPath, publicKey, "utf8");

  return { privateKey, publicKey };
}
