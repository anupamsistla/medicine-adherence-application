import Link from "next/link";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getNextDose, formatScheduledFor } from "@/lib/schedule";
import { MarkAsTakenButton } from "./mark-as-taken-button";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;

  const medications = await prisma.medication.findMany({ where: { userId } });

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const doseLogs = await prisma.doseLog.findMany({
    where: { userId, scheduledFor: { gte: startOfToday } },
    select: { medicationId: true, scheduledFor: true },
  });

  const next = getNextDose(medications, doseLogs, new Date(), 1);

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
        <h2>Next medicine to take</h2>
        {medications.length === 0 ? (
          <p>
            No medications yet. <Link href="/medications/new">Add one</Link>.
          </p>
        ) : next ? (
          <>
            <p>
              <strong>{next.medication.name}</strong> &middot;{" "}
              {next.medication.amountPerDose} {next.medication.unit}
            </p>
            <p>Scheduled: {formatScheduledFor(next.scheduledFor)}</p>
            <MarkAsTakenButton
              medicationId={next.medication.id}
              scheduledFor={next.scheduledFor.toISOString()}
            />
          </>
        ) : (
          <p>Nothing left to take today.</p>
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
