"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const settingsSchema = z.object({
  reminderMinutesBefore: z.coerce
    .number()
    .int()
    .min(1, { error: "Must be at least 1 minute." })
    .max(1440, { error: "Must be 1440 minutes (24h) or less." }),
  lowStockThresholdPercent: z.coerce
    .number()
    .int()
    .min(1, { error: "Must be at least 1%." })
    .max(100, { error: "Must be 100% or less." }),
  expiryAlertDaysBefore: z.coerce
    .number()
    .int()
    .min(1, { error: "Must be at least 1 day." })
    .max(365, { error: "Must be 365 days or less." }),
});

export type SettingsFormState = { error?: string; success?: boolean } | undefined;

export async function updateSettings(
  _prevState: SettingsFormState,
  formData: FormData
): Promise<SettingsFormState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const parsed = settingsSchema.safeParse({
    reminderMinutesBefore: formData.get("reminderMinutesBefore"),
    lowStockThresholdPercent: formData.get("lowStockThresholdPercent"),
    expiryAlertDaysBefore: formData.get("expiryAlertDaysBefore"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues.map((issue) => issue.message).join(" ") };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: parsed.data,
  });

  revalidatePath("/settings");
  return { success: true };
}
