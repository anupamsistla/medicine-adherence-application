import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppNav } from "@/components/app-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const session = await auth();

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session!.user.id },
    select: {
      reminderMinutesBefore: true,
      lowStockThresholdPercent: true,
      expiryAlertDaysBefore: true,
    },
  });

  return (
    <div className="min-h-full bg-muted/30">
      <AppNav userEmail={session?.user?.email} />

      <main className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">Settings</h1>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium text-muted-foreground">
              Alert preferences
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SettingsForm defaultValues={user} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
