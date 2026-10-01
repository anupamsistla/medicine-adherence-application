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

export default async function MedicationsPage() {
  const session = await auth();
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
                      width={64}
                      height={64}
                      className="size-16 shrink-0 rounded-lg object-cover ring-1 ring-foreground/10"
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-medium">{med.name}</h2>
                      <Badge className={IMPORTANCE_STYLE[med.importance]}>
                        {med.importance}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {med.type} &middot; {med.amountPerDose} {med.unit} per
                      dose &middot; {med.times.join(", ")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Days:{" "}
                      {med.daysOfWeek.length === 0
                        ? "Every day"
                        : med.daysOfWeek
                            .map((d) => DAYS_OF_WEEK[d].label)
                            .join(", ")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Stock: {med.quantityAvailable} {med.unit}
                      {med.expiryDate &&
                        ` · Expires ${med.expiryDate.toLocaleDateString()}`}
                    </p>
                    {med.prescriptionPath && (
                      <a
                        href={med.prescriptionPath}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-sm text-primary hover:underline"
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
