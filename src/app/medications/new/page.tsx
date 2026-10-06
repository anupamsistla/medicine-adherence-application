import { auth } from "@/auth";
import { AppNav } from "@/components/app-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createMedication } from "../actions";
import { MedicationForm } from "../medication-form";
import { getUserTimeZone } from "@/lib/user-timezone";

export default async function NewMedicationPage() {
  const session = await auth();
  const timeZone = await getUserTimeZone(session!.user.id);

  return (
    <div className="min-h-full bg-muted/30">
      <AppNav userEmail={session?.user?.email} />

      <main className="mx-auto max-w-2xl px-6 py-10">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Add medication</CardTitle>
          </CardHeader>
          <CardContent>
            <MedicationForm action={createMedication} submitLabel="Add medication" timeZone={timeZone} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
