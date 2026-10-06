import { prisma } from "./prisma";
import { DEFAULT_TIME_ZONE } from "./timezone";

export async function getUserTimeZone(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { timeZone: true } });
  return user?.timeZone ?? DEFAULT_TIME_ZONE;
}
