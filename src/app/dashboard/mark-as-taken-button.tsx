"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { DOSE_TIMING_WINDOW_MINUTES } from "@/lib/schedule";
import { logDoseTaken } from "./actions";

export function MarkAsTakenButton({
  medicationId,
  scheduledFor,
}: {
  medicationId: string;
  scheduledFor: string;
}) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    const diffMinutes = (Date.now() - new Date(scheduledFor).getTime()) / 60_000;

    // Only the early case still interrupts with a confirmation — taking a
    // dose "early" risks double-dosing, which is worth a pause. A late
    // dose carries no such risk, so it's just logged and the timing shows
    // up in adherence history instead of blocking the click.
    if (diffMinutes < -DOSE_TIMING_WINDOW_MINUTES) {
      const minutesEarly = Math.round(-diffMinutes);
      const confirmed = confirm(
        `It's ${minutesEarly} minutes before this dose is scheduled. Are you sure you've taken it already?`
      );
      if (!confirmed) return;
    }

    startTransition(() => {
      logDoseTaken(medicationId, scheduledFor);
    });
  }

  return (
    <Button onClick={handleClick} disabled={pending} size="sm">
      Mark as taken
    </Button>
  );
}
