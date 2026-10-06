import Link from "next/link";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDosesInRange, groupDosesByDay } from "@/lib/schedule";
import { getZonedParts, zonedDateToInstant } from "@/lib/timezone";
import { getUserTimeZone } from "@/lib/user-timezone";
import {
  PERIODS,
  type Period,
  getPeriodRange,
  getPreviousPeriodDate,
  getNextPeriodDate,
  formatPeriodLabel,
  toDateParam,
  parseDateParam,
  withYear,
} from "@/lib/history-period";
import { AppNav } from "@/components/app-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DoseList } from "./dose-list";
import { AdherenceGrid } from "./adherence-grid";
import { buildMonthCells } from "./grid-cells";
import { HistoryFilters } from "./history-filters";

const YEAR_OPTIONS_COUNT = 5;

function buildHref(period: Period, date: Date, timeZone: string, medicationId?: string) {
  const params = new URLSearchParams({ period, date: toDateParam(date, timeZone) });
  if (medicationId) params.set("medicationId", medicationId);
  return `/history?${params.toString()}`;
}

function buildExportHref(period: Period, date: Date, timeZone: string, medicationId?: string) {
  const params = new URLSearchParams({ period, date: toDateParam(date, timeZone) });
  if (medicationId) params.set("medicationId", medicationId);
  return `/api/history/export?${params.toString()}`;
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    period?: string;
    date?: string;
    year?: string;
    medicationId?: string;
  }>;
}) {
  const params = await searchParams;
  const session = await auth();
  const userId = session!.user.id;
  const timeZone = await getUserTimeZone(userId);
  const now = new Date();

  const period: Period = (PERIODS as string[]).includes(params.period ?? "")
    ? (params.period as Period)
    : "day";
  let focusDate = parseDateParam(params.date, now, timeZone);
  if (params.year) {
    const year = Number(params.year);
    if (Number.isInteger(year)) focusDate = withYear(focusDate, year, timeZone);
  }
  const medicationId = params.medicationId || undefined;

  const allMedications = await prisma.medication.findMany({ where: { userId } });
  const medications = medicationId
    ? allMedications.filter((m) => m.id === medicationId)
    : allMedications;

  const { start, end } = getPeriodRange(period, focusDate, timeZone);

  const doseLogs = await prisma.doseLog.findMany({
    where: { userId, scheduledFor: { gte: start, lt: end } },
    select: { medicationId: true, scheduledFor: true, takenAt: true },
  });

  const doses = getDosesInRange(medications, doseLogs, start, end, now, timeZone);

  const prevHref = buildHref(
    period,
    getPreviousPeriodDate(period, focusDate, timeZone),
    timeZone,
    medicationId
  );
  const nextHref = buildHref(
    period,
    getNextPeriodDate(period, focusDate, timeZone),
    timeZone,
    medicationId
  );

  const yearOptions = Array.from(
    { length: YEAR_OPTIONS_COUNT },
    (_, i) => getZonedParts(now, timeZone).year - i
  );

  return (
    <div className="min-h-full bg-muted/30">
      <AppNav userEmail={session?.user?.email} />

      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">
            Adherence history
          </h1>
          <Button
            variant="outline"
            size="sm"
            render={<a href={buildExportHref(period, focusDate, timeZone, medicationId)} />}
          >
            <Download className="size-4" />
            Export PDF
          </Button>
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div className="inline-flex rounded-lg border bg-card p-1">
            {PERIODS.map((p) => (
              <Button
                key={p}
                size="sm"
                variant={p === period ? "secondary" : "ghost"}
                render={<Link href={buildHref(p, focusDate, timeZone, medicationId)} />}
              >
                {p[0].toUpperCase() + p.slice(1)}
              </Button>
            ))}
          </div>

          <HistoryFilters
            period={period}
            focusDate={focusDate}
            timeZone={timeZone}
            medicationId={medicationId}
            medications={allMedications}
            yearOptions={yearOptions}
          />
        </div>

        <div className="mb-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" render={<Link href={prevHref} />}>
            <ChevronLeft className="size-4" />
            Previous
          </Button>
          <p className="font-medium">{formatPeriodLabel(period, focusDate, timeZone)}</p>
          <Button variant="ghost" size="sm" render={<Link href={nextHref} />}>
            Next
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <Card>
          <CardContent>
            {medications.length === 0 ? (
              <p className="py-6 text-center text-muted-foreground">
                No medications to show.
              </p>
            ) : period === "month" ? (
              <AdherenceGrid
                cells={buildMonthCells(
                  groupDosesByDay(doses, timeZone),
                  getZonedParts(focusDate, timeZone).year,
                  getZonedParts(focusDate, timeZone).month - 1,
                  timeZone,
                  (dayOfMonth) => {
                    const { year, month } = getZonedParts(focusDate, timeZone);
                    return buildHref(
                      "day",
                      zonedDateToInstant(year, month, dayOfMonth, 0, 0, timeZone),
                      timeZone,
                      medicationId
                    );
                  }
                )}
                columns={7}
              />
            ) : (
              <DoseList doses={doses} groupByDay={period === "week"} timeZone={timeZone} />
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
