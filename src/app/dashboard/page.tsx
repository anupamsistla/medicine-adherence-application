import Link from "next/link";
import { CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getTodaysDoses, formatDoseTiming, type DoseStatus } from "@/lib/schedule";
import { AppNav } from "@/components/app-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MarkAsTakenButton } from "./mark-as-taken-button";

const STATUS_BADGE: Record<
  DoseStatus,
  { label: string; icon: typeof CheckCircle2; className: string }
> = {
  taken: {
    label: "Taken",
    icon: CheckCircle2,
    className: "bg-success/10 text-success",
  },
  missed: {
    label: "Missed",
    icon: AlertTriangle,
    className: "bg-destructive/10 text-destructive",
  },
  upcoming: {
    label: "Upcoming",
    icon: Clock,
    className: "bg-muted text-muted-foreground",
  },
};

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;
  const now = new Date();

  const medications = await prisma.medication.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const doseLogs = await prisma.doseLog.findMany({
    where: { userId, scheduledFor: { gte: startOfToday } },
    select: { medicationId: true, scheduledFor: true, takenAt: true },
  });

  const todaysDoses = getTodaysDoses(medications, doseLogs, now);

  return (
    <div className="min-h-full bg-muted/30">
      <AppNav userEmail={session?.user?.email} />

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-6 flex items-baseline justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">
            Today&apos;s schedule
          </h1>
          <p className="text-sm text-muted-foreground">
            {now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium text-muted-foreground">
              {medications.length === 0
                ? "Get started"
                : `${todaysDoses.length} dose${todaysDoses.length === 1 ? "" : "s"} scheduled`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {medications.length === 0 ? (
              <div className="flex flex-col items-start gap-3 py-6">
                <p className="text-muted-foreground">
                  You haven&apos;t added any medications yet.
                </p>
                <Button render={<Link href="/medications/new" />}>
                  Add your first medication
                </Button>
              </div>
            ) : todaysDoses.length === 0 ? (
              <p className="py-6 text-muted-foreground">
                Nothing scheduled today.
              </p>
            ) : (
              <ul className="divide-y">
                {todaysDoses.map((dose) => {
                  const status = STATUS_BADGE[dose.status];
                  const StatusIcon = status.icon;
                  return (
                    <li
                      key={`${dose.medication.id}-${dose.scheduledFor.toISOString()}`}
                      className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"
                    >
                      <div>
                        <p className="font-medium">{dose.medication.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {dose.medication.amountPerDose} {dose.medication.unit}
                          {" · "}
                          {dose.scheduledFor.toLocaleTimeString([], {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-end gap-0.5">
                          <Badge className={status.className}>
                            <StatusIcon className="size-3.5" />
                            {status.label}
                          </Badge>
                          {dose.status === "taken" && dose.takenAt && (
                            <span className="text-xs text-muted-foreground">
                              {formatDoseTiming(dose.scheduledFor, dose.takenAt)}
                            </span>
                          )}
                        </div>
                        {dose.status !== "taken" && (
                          <MarkAsTakenButton
                            medicationId={dose.medication.id}
                            scheduledFor={dose.scheduledFor.toISOString()}
                          />
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
