import { createMedication } from "../actions";
import { MedicationForm } from "../medication-form";

export default function NewMedicationPage() {
  return (
    <div style={{ maxWidth: 480, margin: "2rem auto" }}>
      <h1>Add medication</h1>
      <MedicationForm action={createMedication} submitLabel="Add medication" />
    </div>
  );
}
