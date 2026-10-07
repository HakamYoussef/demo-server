import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

// PM2 may start Node from a different working directory.
export const apiEnvPath = fileURLToPath(new URL("./.env", import.meta.url));
// Keep generated server configuration in an ignored file, outside tracked source.
export const apiLocalEnvPath = fileURLToPath(new URL("./.env.local", import.meta.url));
dotenv.config({ path: apiLocalEnvPath });
dotenv.config({ path: apiEnvPath });

export function requireMongoUri(env = process.env) {
  const uri = env.MONGODB_URI?.trim();
  if (!uri) {
    throw new Error("MONGODB_URI is missing. Set it in " + apiEnvPath + " or the process environment before restarting the API.");
  }
  return uri;
}

