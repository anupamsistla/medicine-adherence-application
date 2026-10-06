import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppNav } from "@/components/app-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateMedication } from "../../actions";
import { MedicationForm } from "../../medication-form";
import { getUserTimeZone } from "@/lib/user-timezone";

export default async function EditMedicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const medication = await prisma.medication.findUnique({ where: { id } });

  if (!medication || medication.userId !== session?.user.id) {
    notFound();
  }
  const timeZone = await getUserTimeZone(medication.userId);

  return (
    <div className="min-h-full bg-muted/30">
      <AppNav userEmail={session?.user?.email} />

      <main className="mx-auto max-w-2xl px-6 py-10">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Edit medication</CardTitle>
          </CardHeader>
          <CardContent>
            <MedicationForm
              action={updateMedication.bind(null, id)}
              submitLabel="Save changes"
              defaultValues={medication}
              timeZone={timeZone}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
