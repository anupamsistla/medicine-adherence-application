"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { hashResetToken, passwordSchema } from "@/lib/password-reset";

export type ResetPasswordState = { error?: string; done?: boolean } | undefined;

export async function resetPassword(
  _prev: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!token) return { error: "This reset link is invalid. Request a new one." };

  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (password !== confirm) return { error: "The passwords don't match." };

  const user = await prisma.user.findFirst({
    where: {
      passwordResetTokenHash: hashResetToken(token),
      passwordResetExpiresAt: { gt: new Date() },
    },
  });
  if (!user) return { error: "This reset link has expired or was already used. Request a new one." };

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(password, 10),
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
    },
  });

  return { done: true };
}
