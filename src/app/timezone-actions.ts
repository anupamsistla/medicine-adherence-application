"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isValidTimeZone } from "@/lib/timezone";

export async function setUserTimeZone(timeZone: string): Promise<void> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId || !isValidTimeZone(timeZone)) return;

  await prisma.user.updateMany({
    where: { id: userId, timeZone: { not: timeZone } },
    data: { timeZone },
  });
}
