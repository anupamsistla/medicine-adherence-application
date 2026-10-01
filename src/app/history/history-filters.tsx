"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toDateParam, withYear, type Period } from "@/lib/history-period";

type MedicationOption = { id: string; name: string };

const ALL_MEDICATIONS = "ALL";

export function HistoryFilters({
  period,
  focusDate,
  medicationId,
  medications,
  yearOptions,
}: {
  period: Period;
  focusDate: Date;
  medicationId?: string;
  medications: MedicationOption[];
  yearOptions: number[];
}) {
  const router = useRouter();

  function navigate(next: { medicationId?: string; year?: number }) {
    const date = next.year !== undefined ? withYear(focusDate, next.year) : focusDate;
    // "medicationId" in next distinguishes "explicitly clearing the filter"
    // (medicationId: undefined, from picking "All medications") from "this
    // call didn't touch the filter at all" (e.g. the year selector), which
    // `next.medicationId !== undefined` can't tell apart — both look undefined.
    const nextMedicationId = "medicationId" in next ? next.medicationId : medicationId;

    const params = new URLSearchParams({ period, date: toDateParam(date) });
    if (nextMedicationId) params.set("medicationId", nextMedicationId);
    router.push(`/history?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      {medications.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Medication</span>
          <Select
            items={[
              { label: "All medications", value: ALL_MEDICATIONS },
              ...medications.map((m) => ({ label: m.name, value: m.id })),
            ]}
            value={medicationId ?? ALL_MEDICATIONS}
            onValueChange={(value) =>
              navigate({
                medicationId: value === ALL_MEDICATIONS ? undefined : (value ?? undefined),
              })
            }
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_MEDICATIONS}>All medications</SelectItem>
              {medications.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Year</span>
        <Select
          items={yearOptions.map((year) => ({ label: String(year), value: String(year) }))}
          value={String(focusDate.getFullYear())}
          onValueChange={(value) => value && navigate({ year: Number(value) })}
        >
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((year) => (
              <SelectItem key={year} value={String(year)}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
