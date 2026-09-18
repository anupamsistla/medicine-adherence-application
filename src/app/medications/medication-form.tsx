"use client";

import { useActionState, useState } from "react";
import type { Medication } from "@/generated/prisma/client";
import { DAYS_OF_WEEK } from "@/lib/days";
import type { MedicationFormState } from "./actions";

type MedicationFormProps = {
  action: (
    prevState: MedicationFormState,
    formData: FormData
  ) => Promise<MedicationFormState>;
  submitLabel: string;
  defaultValues?: Medication;
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

function todayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function MedicationForm({
  action,
  submitLabel,
  defaultValues,
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
    ? new Date(defaultValues.expiryDate).toISOString().slice(0, 10)
    : "";

  return (
    <form action={formAction}>
      <div>
        <label htmlFor="name">Medicine name</label>
        <input id="name" name="name" defaultValue={defaultValues?.name} required />
      </div>

      <div>
        <label htmlFor="type">Type</label>
        <input
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
      </div>

      <fieldset>
        <legend>Time(s) to take</legend>
        {times.map((time, index) => (
          <div key={index}>
            <input
              type="time"
              name="times"
              value={time}
              onChange={(event) => {
                const next = [...times];
                next[index] = event.target.value;
                setTimes(next);
              }}
              required
            />
            {times.length > 1 && (
              <button
                type="button"
                onClick={() => setTimes(times.filter((_, i) => i !== index))}
              >
                Remove
              </button>
            )}
          </div>
        ))}
        <button type="button" onClick={() => setTimes([...times, ""])}>
          Add another time
        </button>
      </fieldset>

      <fieldset>
        <legend>Day(s) to take (leave all unchecked for every day)</legend>
        {DAYS_OF_WEEK.map((day) => (
          <label key={day.value} style={{ display: "block" }}>
            <input
              type="checkbox"
              name="daysOfWeek"
              value={day.value}
              defaultChecked={defaultValues?.daysOfWeek.includes(day.value)}
            />
            {day.label}
          </label>
        ))}
      </fieldset>

      <div>
        <label htmlFor="amountPerDose">Amount to consume per dose</label>
        <input
          id="amountPerDose"
          name="amountPerDose"
          type="number"
          step="any"
          min="0.01"
          defaultValue={defaultValues?.amountPerDose}
          required
        />
      </div>

      <div>
        <label htmlFor="unit">Unit</label>
        <select
          id="unit"
          value={unitChoice}
          onChange={(event) => setUnitChoice(event.target.value)}
        >
          {UNIT_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
          <option value="OTHER">Other...</option>
        </select>
        {unitChoice === "OTHER" ? (
          <input
            key="unit-custom"
            name="unit"
            placeholder="Enter a custom unit"
            defaultValue={
              defaultValues && !UNIT_OPTIONS.includes(defaultValues.unit)
                ? defaultValues.unit
                : ""
            }
            required
          />
        ) : (
          <input key="unit-preset" type="hidden" name="unit" value={unitChoice} />
        )}
      </div>

      <div>
        <label htmlFor="quantityAvailable">Quantity available (current stock)</label>
        <input
          id="quantityAvailable"
          name="quantityAvailable"
          type="number"
          step="any"
          min="0"
          defaultValue={defaultValues?.quantityAvailable}
          required
        />
      </div>

      <div>
        <label htmlFor="medicalCondition">Medical condition</label>
        <input
          id="medicalCondition"
          name="medicalCondition"
          defaultValue={defaultValues?.medicalCondition ?? ""}
        />
      </div>

      <div>
        <label htmlFor="importance">Importance</label>
        <select
          id="importance"
          name="importance"
          defaultValue={defaultValues?.importance ?? "MEDIUM"}
        >
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
        </select>
      </div>

      <div>
        <label htmlFor="expiryDate">Expiry date</label>
        <input
          id="expiryDate"
          name="expiryDate"
          type="date"
          defaultValue={expiryDateValue}
          min={todayDateString()}
        />
      </div>

      <div>
        <label htmlFor="image">Medicine image</label>
        {defaultValues?.imagePath && (
          <div>
            <img
              src={defaultValues.imagePath}
              alt={defaultValues.name}
              width={80}
              height={80}
              style={{ objectFit: "cover" }}
            />
          </div>
        )}
        <input id="image" name="image" type="file" accept="image/*" />
      </div>

      <div>
        <label htmlFor="prescription">Prescription</label>
        {defaultValues?.prescriptionPath && (
          <p>
            <a href={defaultValues.prescriptionPath} target="_blank" rel="noreferrer">
              View current prescription
            </a>
          </p>
        )}
        <input
          id="prescription"
          name="prescription"
          type="file"
          accept="image/*,application/pdf"
        />
      </div>

      {state?.error && <p role="alert">{state.error}</p>}

      <button disabled={pending} type="submit">
        {submitLabel}
      </button>
    </form>
  );
}
