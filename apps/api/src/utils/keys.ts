import crypto from "crypto";
import fs from "fs";
import path from "path";

export interface KeyPair {
  privateKey: string;
  publicKey: string;
}

/**
 * Loads RSA keys from files or dynamically generates them if they don't exist.
 * Ensures zero-configuration setup for dev/production onboarding.
 */
export function getOrGenerateKeys(): KeyPair {
  const privatePath = process.env.JWT_PRIVATE_KEY_PATH || "keys/private.pem";
  const publicPath = process.env.JWT_PUBLIC_KEY_PATH || "keys/public.pem";

  // If both exist, load and return
  if (fs.existsSync(privatePath) && fs.existsSync(publicPath)) {
    const privateKey = fs.readFileSync(privatePath, "utf8");
    const publicKey = fs.readFileSync(publicPath, "utf8");
    return { privateKey, publicKey };
  }

  // Ensure directories exist
  const privateDir = path.dirname(privatePath);
  const publicDir = path.dirname(publicPath);
  
  if (!fs.existsSync(privateDir)) {
    fs.mkdirSync(privateDir, { recursive: true });
  }
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  console.log("RSA JWT keys not found. Generating new 2048-bit key pair...");

  // Generate new key pair
  const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: "spki",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
    },
  });

  fs.writeFileSync(privatePath, privateKey, "utf8");
  fs.writeFileSync(publicPath, publicKey, "utf8");

  console.log(`RSA keys generated successfully:\n - Private: ${privatePath}\n - Public: ${publicPath}`);

  return { privateKey, publicKey };
}
