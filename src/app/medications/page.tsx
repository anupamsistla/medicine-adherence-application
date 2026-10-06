import { formatDay } from "@/lib/timezone";
import { daysUntilExpiry } from "@/lib/expiry";
import Link from "next/link";
import { Plus, FileText } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DAYS_OF_WEEK } from "@/lib/days";
import { AppNav } from "@/components/app-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteMedication } from "./actions";
import { DeleteMedicationButton } from "./delete-button";

const IMPORTANCE_STYLE: Record<string, string> = {
  LOW: "bg-muted text-muted-foreground",
  MEDIUM: "bg-secondary text-secondary-foreground",
  HIGH: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400",
  CRITICAL: "bg-destructive/10 text-destructive",
};

function Field({
  label,
  warn = false,
  span = "",
  children,
}: {
  label: string;
  warn?: boolean;
  span?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={span}>
      <dt className="text-xs tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className={`mt-0.5 font-medium ${warn ? "text-amber-700 dark:text-amber-400" : ""} ${span ? "whitespace-nowrap" : ""}`}>{children}</dd>
    </div>
  );
}

function isLowStock(
  med: { quantityAvailable: number; originalQuantity: number },
  thresholdPercent: number
) {
  return med.originalQuantity > 0 && (med.quantityAvailable / med.originalQuantity) * 100 <= thresholdPercent;
}

function isExpiringSoon(expiryDate: Date, now: Date, timeZone: string, daysBefore: number) {
  return daysUntilExpiry(expiryDate, now, timeZone) <= daysBefore;
}

export default async function MedicationsPage() {
  const session = await auth();
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session!.user.id },
    select: { timeZone: true, lowStockThresholdPercent: true, expiryAlertDaysBefore: true },
  });
  const { timeZone, lowStockThresholdPercent, expiryAlertDaysBefore } = user;
  const now = new Date();
  const medications = await prisma.medication.findMany({
    where: { userId: session!.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-full bg-muted/30">
      <AppNav userEmail={session?.user?.email} />

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">
            Your medications
          </h1>
          <Button render={<Link href="/medications/new" />}>
            <Plus className="size-4" />
            Add medication
          </Button>
        </div>

        {medications.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No medications yet.
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {medications.map((med) => (
              <Card key={med.id}>
                <CardContent className="flex flex-col gap-4 sm:flex-row">
                  {med.imagePath && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={med.imagePath}
                      alt={med.name}
                      width={80}
                      height={80}
                      className="size-20 shrink-0 rounded-lg object-cover ring-1 ring-foreground/10"
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-medium">{med.name}</h2>
                      <Badge className={IMPORTANCE_STYLE[med.importance]}>
                        {med.importance}
                      </Badge>
                    </div>

                    <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
                      <Field label="Type">{med.type}</Field>
                      <Field label="Dose">
                        {med.amountPerDose} {med.unit}
                      </Field>
                      <Field label="Stock" warn={isLowStock(med, lowStockThresholdPercent)}>
                        {med.quantityAvailable} {med.unit}
                      </Field>
                      {med.expiryDate && (
                        <Field
                          label="Expires"
                          warn={isExpiringSoon(med.expiryDate, now, timeZone, expiryAlertDaysBefore)}
                        >
                          {formatDay(med.expiryDate, timeZone)}
                        </Field>
                      )}
                      <Field label="Time">{med.times.join(", ")}</Field>
                      <Field label="Days" span="col-span-2 sm:col-span-3">
                        {med.daysOfWeek.length === 0
                          ? "Every day"
                          : med.daysOfWeek.map((d) => DAYS_OF_WEEK[d].label).join(", ")}
                      </Field>
                    </dl>

                    {med.prescriptionPath && (
                      <a
                        href={med.prescriptionPath}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        <FileText className="size-3.5" />
                        View prescription
                      </a>
                    )}

                    <div className="mt-3 flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        render={<Link href={`/medications/${med.id}/edit`} />}
                      >
                        Edit
                      </Button>
                      <DeleteMedicationButton
                        action={deleteMedication.bind(null, med.id)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
