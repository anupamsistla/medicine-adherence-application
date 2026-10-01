import Link from "next/link";
import {
  Pill,
  Bell,
  PackageSearch,
  CalendarClock,
  History,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const FEATURES = [
  {
    icon: Bell,
    title: "Never miss a dose",
    description:
      "Email reminders sent ahead of every scheduled dose, with a grace window so an early or late check-in never gets in your way.",
  },
  {
    icon: PackageSearch,
    title: "Low stock alerts",
    description:
      "Know before you run out. Get notified as soon as a medication drops to the threshold you set, until you restock.",
  },
  {
    icon: CalendarClock,
    title: "Expiry tracking",
    description:
      "Expiring prescriptions get flagged automatically, days before they become unusable.",
  },
  {
    icon: History,
    title: "Adherence history",
    description:
      "Look back by day, week, or month to see exactly what was taken, missed, or still due.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 font-semibold">
            <Pill className="size-5 text-primary" />
            MedTrack
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" render={<Link href="/login" />}>
              Log in
            </Button>
            <Button render={<Link href="/signup" />}>Sign up</Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-6 py-24 text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Stay on top of every medication, automatically.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground text-balance">
            MedTrack tracks your schedule, reminds you before each dose, and
            catches low stock and expiring prescriptions before they become a
            problem.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Button size="lg" render={<Link href="/signup" />}>
              Get started
              <ArrowRight className="size-4" />
            </Button>
            <Button size="lg" variant="outline" render={<Link href="/login" />}>
              Log in
            </Button>
          </div>
        </section>

        <section className="border-t bg-muted/30">
          <div className="mx-auto max-w-5xl px-6 py-16">
            <div className="grid gap-4 sm:grid-cols-2">
              {FEATURES.map((feature) => (
                <Card key={feature.title}>
                  <CardContent className="flex gap-4">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <feature.icon className="size-5" />
                    </div>
                    <div>
                      <h3 className="font-medium">{feature.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-6">
        <div className="mx-auto max-w-5xl px-6 text-sm text-muted-foreground">
          MedTrack
        </div>
      </footer>
    </div>
  );
}
