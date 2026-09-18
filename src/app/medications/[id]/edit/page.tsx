import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { updateMedication } from "../../actions";
import { MedicationForm } from "../../medication-form";

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

  return (
    <div style={{ maxWidth: 480, margin: "2rem auto" }}>
      <h1>Edit medication</h1>
      <MedicationForm
        action={updateMedication.bind(null, id)}
        submitLabel="Save changes"
        defaultValues={medication}
      />
    </div>
  );
}
