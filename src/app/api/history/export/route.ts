import { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDosesInRange } from "@/lib/schedule";
import {
  PERIODS,
  type Period,
  getPeriodRange,
  formatPeriodLabel,
  toDateParam,
  parseDateParam,
  withYear,
} from "@/lib/history-period";
import { AdherenceReportDocument } from "./adherence-report";

export async function GET(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }
  const patientName = session.user.name || session.user.email || "Unknown patient";

  const searchParams = request.nextUrl.searchParams;

  const period: Period = (PERIODS as string[]).includes(searchParams.get("period") ?? "")
    ? (searchParams.get("period") as Period)
    : "day";

  const now = new Date();
  let focusDate = parseDateParam(searchParams.get("date") ?? undefined, now);
  const yearParam = searchParams.get("year");
  if (yearParam) {
    const year = Number(yearParam);
    if (Number.isInteger(year)) focusDate = withYear(focusDate, year);
  }
  const medicationId = searchParams.get("medicationId") || undefined;

  const allMedications = await prisma.medication.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });
  const medications = medicationId
    ? allMedications.filter((m) => m.id === medicationId)
    : allMedications;

  const { start, end } = getPeriodRange(period, focusDate);

  const doseLogs = await prisma.doseLog.findMany({
    where: { userId, scheduledFor: { gte: start, lt: end } },
    select: { medicationId: true, scheduledFor: true, takenAt: true },
  });

  const doses = getDosesInRange(medications, doseLogs, start, end, now);

  const periodLabel = formatPeriodLabel(period, focusDate);
  const medicationLabel = medicationId
    ? (allMedications.find((m) => m.id === medicationId)?.name ?? "Selected medication")
    : "All medications";

  const buffer = await renderToBuffer(
    AdherenceReportDocument({
      patientName,
      periodLabel,
      medicationLabel,
      generatedAt: now,
      doses,
    })
  );

  const filename = `adherence-${period}-${toDateParam(focusDate)}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
