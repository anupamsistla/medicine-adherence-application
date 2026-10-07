"use server";

import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { appUrl, newResetToken, RESET_TOKEN_TTL_MS } from "@/lib/password-reset";
import * as z from "zod";

export type ForgotPasswordState = { message?: string; error?: string } | undefined;

const emailSchema = z.email();

export async function requestPasswordReset(
  _prev: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const parsed = emailSchema.safeParse(String(formData.get("email") ?? "").trim());
  if (!parsed.success) return { error: "Enter a valid email address." };

  const user = await prisma.user.findUnique({ where: { email: parsed.data } });
  if (user) {
    const { token, hash } = newResetToken();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetTokenHash: hash,
        passwordResetExpiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    });

    try {
      await sendEmail({
        to: user.email,
        subject: "Reset your MedTrack password",
        text: `We received a request to reset your MedTrack password.\n\nUse this link within one hour to choose a new password:\n${appUrl()}/reset-password?token=${token}\n\nIf you didn't ask for this, you can ignore this email and your password will stay the same.`,
      });
    } catch (error) {
      console.error("Password reset email failed", error);
    }
  }

  return {
    message: "If an account exists for that email, we've sent a link to reset the password.",
  };
}
