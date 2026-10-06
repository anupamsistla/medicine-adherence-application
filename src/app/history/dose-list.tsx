import { CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { formatDoseTiming, type TodaysDose } from "@/lib/schedule";
import { dayKey, formatDay, formatTime } from "@/lib/timezone";
import { Badge } from "@/components/ui/badge";

const STATUS_BADGE = {
  taken: { label: "Taken", icon: CheckCircle2, className: "bg-success/10 text-success" },
  missed: {
    label: "Missed",
    icon: AlertTriangle,
    className: "bg-destructive/10 text-destructive",
  },
  upcoming: {
    label: "Upcoming",
    icon: Clock,
    className: "bg-muted text-muted-foreground",
  },
} as const;

type DoseWithName = TodaysDose<{
  id: string;
  name: string;
  amountPerDose: number;
  unit: string;
}>;

function DoseRow({ dose, timeZone }: { dose: DoseWithName; timeZone: string }) {
  const status = STATUS_BADGE[dose.status];
  const StatusIcon = status.icon;

  return (
    <li className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div>
        <p className="text-sm font-medium">{dose.medication.name}</p>
        <p className="text-xs text-muted-foreground">
          {dose.medication.amountPerDose} {dose.medication.unit}
        </p>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-base font-semibold tabular-nums">
          {formatTime(dose.scheduledFor, timeZone)}
        </span>
        <div className="flex flex-col items-end gap-0.5">
          <Badge className={status.className}>
            <StatusIcon className="size-3.5" />
            {status.label}
          </Badge>
          {dose.status === "taken" && dose.takenAt && (
            <span className="text-xs text-muted-foreground">
              {formatDoseTiming(dose.scheduledFor, dose.takenAt)}
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

export function DoseList({
  doses,
  groupByDay,
  timeZone,
}: {
  doses: DoseWithName[];
  groupByDay: boolean;
  timeZone: string;
}) {
  if (doses.length === 0) {
    return (
      <p className="py-6 text-center text-muted-foreground">
        No doses scheduled in this period.
      </p>
    );
  }

  if (!groupByDay) {
    return (
      <ul className="divide-y">
        {doses.map((dose) => (
          <DoseRow
            key={`${dose.medication.id}-${dose.scheduledFor.toISOString()}`}
            dose={dose}
            timeZone={timeZone}
          />
        ))}
      </ul>
    );
  }

  const byDay = new Map<string, DoseWithName[]>();
  for (const dose of doses) {
    const key = dayKey(dose.scheduledFor, timeZone);
    const list = byDay.get(key) ?? [];
    list.push(dose);
    byDay.set(key, list);
  }

  return (
    <div className="flex flex-col gap-10">
      {Array.from(byDay.entries()).map(([dayId, dayDoses]) => (
        <div key={dayId}>
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">
            {formatDay(dayDoses[0].scheduledFor, timeZone, {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </h3>
          <ul className="divide-y">
            {dayDoses.map((dose) => (
              <DoseRow
                key={`${dose.medication.id}-${dose.scheduledFor.toISOString()}`}
                dose={dose}
                timeZone={timeZone}
              />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
