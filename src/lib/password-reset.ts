import { createHash, randomBytes } from "node:crypto";
import * as z from "zod";

export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export const passwordSchema = z
  .string()
  .min(8, { error: "Password must be at least 8 characters long." })
  .regex(/[a-zA-Z]/, { error: "Password must contain at least one letter." })
  .regex(/[0-9]/, { error: "Password must contain at least one number." });

export function newResetToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashResetToken(token) };
}

export function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function appUrl() {
  const url = process.env.APP_URL;
  if (!url) throw new Error("APP_URL is not set.");
  return url.replace(/\/$/, "");
}
