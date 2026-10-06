"use client";

import { useState, useTransition } from "react";
import { MessageCircleQuestion, Pill, Sparkles, TrendingUp, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { prepareForAppointment, type PrepSummary } from "./actions";

function SummaryCard({
  icon: Icon,
  title,
  items,
  emptyText,
}: {
  icon: LucideIcon;
  title: string;
  items: string[];
  emptyText: string;
}) {
  return (
    <section className="rounded-lg border bg-background p-4">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <Icon className="size-4 text-primary" />
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="flex flex-col gap-2 text-sm leading-relaxed">
          {items.map((item, index) => (
            <li key={index} className="flex gap-2">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/60" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function AppointmentPrep() {
  const [result, setResult] = useState<PrepSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const response = await prepareForAppointment();
      if ("summary" in response) {
        setResult(response.summary);
      } else {
        setResult(null);
        setError(response.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-4">
      <div>
        <Button onClick={handleClick} disabled={isPending} className="w-full">
          <Sparkles className="size-4" />
          {isPending ? "Preparing..." : "Prepare for your next appointment"}
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">
          Summarizes what&apos;s changed since your last lab report or visit note,
          cross-referenced with your adherence, and suggests questions to ask.
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {result && (
        <div className="flex flex-col gap-3">
          <SummaryCard
            icon={TrendingUp}
            title="What's changed"
            items={result.changes}
            emptyText="Nothing notable since your last document."
          />
          <SummaryCard
            icon={Pill}
            title="Adherence notes"
            items={result.adherenceNotes}
            emptyText="No adherence concerns in this period."
          />
          <SummaryCard
            icon={MessageCircleQuestion}
            title="Questions to ask your doctor"
            items={result.questionsForDoctor}
            emptyText="No questions suggested."
          />
        </div>
      )}
    </div>
  );
}
