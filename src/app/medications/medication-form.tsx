"use client";

import { useActionState, useState } from "react";
import { Plus, X, FileText } from "lucide-react";
import type { Medication } from "@/generated/prisma/client";
import { DAYS_OF_WEEK } from "@/lib/days";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MedicationFormState } from "./actions";
import { dayKey } from "@/lib/timezone";

type MedicationFormProps = {
  action: (
    prevState: MedicationFormState,
    formData: FormData
  ) => Promise<MedicationFormState>;
  submitLabel: string;
  defaultValues?: Medication;
  timeZone: string;
};

const MEDICINE_TYPES = [
  "Tablet",
  "Capsule",
  "Syrup",
  "Injection",
  "Cream",
  "Drops",
  "Inhaler",
];

const UNIT_OPTIONS = [
  "tablet",
  "capsule",
  "ml",
  "mg",
  "mcg",
  "drop",
  "puff",
  "patch",
  "spray",
];

const IMPORTANCE_OPTIONS = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
];

function todayDateString(timeZone: string) {
  return dayKey(new Date(), timeZone);
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

export function MedicationForm({
  action,
  submitLabel,
  defaultValues,
  timeZone,
}: MedicationFormProps) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [times, setTimes] = useState<string[]>(
    defaultValues?.times.length ? defaultValues.times : [""]
  );
  const [unitChoice, setUnitChoice] = useState<string>(() =>
    defaultValues && !UNIT_OPTIONS.includes(defaultValues.unit)
      ? "OTHER"
      : defaultValues?.unit ?? UNIT_OPTIONS[0]
  );

  const expiryDateValue = defaultValues?.expiryDate
    ? dayKey(defaultValues.expiryDate, timeZone)
    : "";

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <Field label="Medicine name" htmlFor="name">
        <Input id="name" name="name" defaultValue={defaultValues?.name} required />
      </Field>

      <Field label="Type" htmlFor="type">
        <Input
          id="type"
          name="type"
          list="medicine-types"
          defaultValue={defaultValues?.type}
          placeholder="Tablet, syrup, injection..."
          required
        />
        <datalist id="medicine-types">
          {MEDICINE_TYPES.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
      </Field>

      <div className="flex flex-col gap-2">
        <Label>Time(s) to take</Label>
        <div className="flex flex-col gap-2">
          {times.map((time, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                type="time"
                name="times"
                value={time}
                onChange={(event) => {
                  const next = [...times];
                  next[index] = event.target.value;
                  setTimes(next);
                }}
                required
                className="w-40"
              />
              {times.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setTimes(times.filter((_, i) => i !== index))}
                >
                  <X className="size-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={() => setTimes([...times, ""])}
        >
          <Plus className="size-3.5" />
          Add another time
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Day(s) to take</Label>
        <p className="text-sm text-muted-foreground">
          Leave all unchecked for every day.
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {DAYS_OF_WEEK.map((day) => (
            <label
              key={day.value}
              className="flex items-center gap-2 text-sm font-normal"
            >
              <Checkbox
                name="daysOfWeek"
                value={String(day.value)}
                defaultChecked={defaultValues?.daysOfWeek.includes(day.value)}
              />
              {day.label}
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Amount to consume per dose" htmlFor="amountPerDose">
          <Input
            id="amountPerDose"
            name="amountPerDose"
            type="number"
            step="any"
            min="0.01"
            defaultValue={defaultValues?.amountPerDose}
            required
          />
        </Field>

        <Field label="Unit">
          <Select
            value={unitChoice}
            onValueChange={(value) => value && setUnitChoice(value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UNIT_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
              <SelectItem value="OTHER">Other...</SelectItem>
            </SelectContent>
          </Select>
          {unitChoice === "OTHER" ? (
            <Input
              key="unit-custom"
              name="unit"
              placeholder="Enter a custom unit"
              defaultValue={
                defaultValues && !UNIT_OPTIONS.includes(defaultValues.unit)
                  ? defaultValues.unit
                  : ""
              }
              required
              className="mt-2"
            />
          ) : (
            <input key="unit-preset" type="hidden" name="unit" value={unitChoice} />
          )}
        </Field>
      </div>

      <Field label="Quantity available (current stock)" htmlFor="quantityAvailable">
        <Input
          id="quantityAvailable"
          name="quantityAvailable"
          type="number"
          step="any"
          min="0"
          defaultValue={defaultValues?.quantityAvailable}
          required
        />
      </Field>

      <Field label="Medical condition" htmlFor="medicalCondition">
        <Input
          id="medicalCondition"
          name="medicalCondition"
          defaultValue={defaultValues?.medicalCondition ?? ""}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Importance">
          <Select name="importance" defaultValue={defaultValues?.importance ?? "MEDIUM"}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {IMPORTANCE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Expiry date" htmlFor="expiryDate">
          <Input
            id="expiryDate"
            name="expiryDate"
            type="date"
            defaultValue={expiryDateValue}
            min={todayDateString(timeZone)}
          />
        </Field>
      </div>

      <Field label="Medicine image" htmlFor="image">
        {defaultValues?.imagePath && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={defaultValues.imagePath}
            alt={defaultValues.name}
            width={80}
            height={80}
            className="size-20 rounded-lg object-cover ring-1 ring-foreground/10"
          />
        )}
        <Input id="image" name="image" type="file" accept="image/*" />
      </Field>

      <Field label="Prescription" htmlFor="prescription">
        {defaultValues?.prescriptionPath && (
          <a
            href={defaultValues.prescriptionPath}
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-fit items-center gap-1 text-sm text-primary hover:underline"
          >
            <FileText className="size-3.5" />
            View current prescription
          </a>
        )}
        <Input
          id="prescription"
          name="prescription"
          type="file"
          accept="image/*,application/pdf"
        />
      </Field>

      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      <Button disabled={pending} type="submit">
        {submitLabel}
      </Button>
    </form>
  );
}
