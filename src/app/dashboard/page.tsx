import Link from "next/link";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getTodaysDoses } from "@/lib/schedule";
import { MarkAsTakenButton } from "./mark-as-taken-button";

const STATUS_LABEL: Record<string, string> = {
  taken: "✅ Taken",
  missed: "⚠️ Missed",
  upcoming: "⏳ Upcoming",
};

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;
  const now = new Date();

  const medications = await prisma.medication.findMany({ where: { userId } });

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const doseLogs = await prisma.doseLog.findMany({
    where: { userId, scheduledFor: { gte: startOfToday } },
    select: { medicationId: true, scheduledFor: true },
  });

  const todaysDoses = getTodaysDoses(medications, doseLogs, now);

  return (
    <div style={{ maxWidth: 480, margin: "4rem auto" }}>
      <h1>Dashboard</h1>
      <p>Signed in as {session?.user?.email}</p>
      <p>
        <Link href="/medications">Manage medications</Link>
      </p>

      <section
        style={{
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: "1rem",
          margin: "1.5rem 0",
        }}
      >
        <h2>Today&apos;s schedule</h2>
        <p>
          Now:{" "}
          {now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
        </p>

        {medications.length === 0 ? (
          <p>
            No medications yet. <Link href="/medications/new">Add one</Link>.
          </p>
        ) : todaysDoses.length === 0 ? (
          <p>Nothing scheduled today.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {todaysDoses.map((dose, index) => (
              <li
                key={`${dose.medication.id}-${dose.scheduledFor.toISOString()}-${index}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.5rem 0",
                  borderTop: index === 0 ? undefined : "1px solid #eee",
                }}
              >
                <span>
                  {dose.medication.name} &middot;{" "}
                  {dose.medication.amountPerDose} {dose.medication.unit}{" "}
                  &middot;{" "}
                  {dose.scheduledFor.toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
                {dose.status === "taken" ? (
                  <span>{STATUS_LABEL[dose.status]}</span>
                ) : (
                  <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    {STATUS_LABEL[dose.status]}
                    <MarkAsTakenButton
                      medicationId={dose.medication.id}
                      scheduledFor={dose.scheduledFor.toISOString()}
                    />
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <button type="submit">Sign out</button>
      </form>
    </div>
  );
}
