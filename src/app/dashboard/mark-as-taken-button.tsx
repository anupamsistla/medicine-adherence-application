"use client";

import { useTransition } from "react";
import { logDoseTaken } from "./actions";

const WARNING_WINDOW_MINUTES = 30;

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

    if (diffMinutes < -WARNING_WINDOW_MINUTES) {
      const minutesEarly = Math.round(-diffMinutes);
      const confirmed = confirm(
        `It's ${minutesEarly} minutes before this dose is scheduled. Are you sure you've taken it already?`
      );
      if (!confirmed) return;
    } else if (diffMinutes > WARNING_WINDOW_MINUTES) {
      const minutesLate = Math.round(diffMinutes);
      const confirmed = confirm(
        `It's ${minutesLate} minutes after this dose was scheduled. Mark it as taken anyway?`
      );
      if (!confirmed) return;
    }

    startTransition(() => {
      logDoseTaken(medicationId, scheduledFor);
    });
  }

  return (
    <button onClick={handleClick} disabled={pending}>
      Mark as taken
    </button>
  );
}
