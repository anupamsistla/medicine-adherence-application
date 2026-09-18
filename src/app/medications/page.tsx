import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DAYS_OF_WEEK } from "@/lib/days";
import { deleteMedication } from "./actions";
import { DeleteMedicationButton } from "./delete-button";

export default async function MedicationsPage() {
  const session = await auth();
  const medications = await prisma.medication.findMany({
    where: { userId: session!.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div style={{ maxWidth: 720, margin: "2rem auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1>Your medications</h1>
        <Link href="/medications/new">Add medication</Link>
      </div>

      {medications.length === 0 && <p>No medications yet.</p>}

      <ul style={{ listStyle: "none", padding: 0 }}>
        {medications.map((med) => (
          <li
            key={med.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: 8,
              padding: "1rem",
              marginBottom: "1rem",
            }}
          >
            <div style={{ display: "flex", gap: "1rem" }}>
              {med.imagePath && (
                <img
                  src={med.imagePath}
                  alt={med.name}
                  width={64}
                  height={64}
                  style={{ objectFit: "cover", borderRadius: 4 }}
                />
              )}
              <div style={{ flex: 1 }}>
                <h2>{med.name}</h2>
                <p>
                  {med.type} &middot; {med.amountPerDose} {med.unit} per dose
                </p>
                <p>Times: {med.times.join(", ")}</p>
                <p>
                  Days:{" "}
                  {med.daysOfWeek.length === 0
                    ? "Every day"
                    : med.daysOfWeek
                        .map((d) => DAYS_OF_WEEK[d].label)
                        .join(", ")}
                </p>
                <p>
                  Stock: {med.quantityAvailable} {med.unit}
                </p>
                <p>Importance: {med.importance}</p>
                {med.expiryDate && (
                  <p>Expires: {med.expiryDate.toLocaleDateString()}</p>
                )}
                {med.prescriptionPath && (
                  <p>
                    <a href={med.prescriptionPath} target="_blank" rel="noreferrer">
                      View prescription
                    </a>
                  </p>
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
              <Link href={`/medications/${med.id}/edit`}>Edit</Link>
              <DeleteMedicationButton
                action={deleteMedication.bind(null, med.id)}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
