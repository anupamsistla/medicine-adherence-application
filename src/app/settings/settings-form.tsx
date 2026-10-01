"use client";

import { useActionState, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateSettings } from "./actions";

type SettingsFormProps = {
  defaultValues: {
    reminderMinutesBefore: number;
    lowStockThresholdPercent: number;
    expiryAlertDaysBefore: number;
  };
};

export function SettingsForm({ defaultValues }: SettingsFormProps) {
  const [state, formAction, pending] = useActionState(updateSettings, undefined);
  // Captured once at mount: revalidation after a save passes a new
  // `defaultValues` object, and re-deriving `defaultValue` from it would
  // change an uncontrolled field's default after initialization.
  const [initialValues] = useState(defaultValues);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reminderMinutesBefore">
          Remind me before a dose is due (minutes)
        </Label>
        <Input
          id="reminderMinutesBefore"
          name="reminderMinutesBefore"
          type="number"
          min="1"
          max="1440"
          defaultValue={initialValues.reminderMinutesBefore}
          required
          className="max-w-40"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="lowStockThresholdPercent">
          Alert me when stock drops to this % of what I last recorded
        </Label>
        <Input
          id="lowStockThresholdPercent"
          name="lowStockThresholdPercent"
          type="number"
          min="1"
          max="100"
          defaultValue={initialValues.lowStockThresholdPercent}
          required
          className="max-w-40"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="expiryAlertDaysBefore">
          Alert me this many days before a medicine expires
        </Label>
        <Input
          id="expiryAlertDaysBefore"
          name="expiryAlertDaysBefore"
          type="number"
          min="1"
          max="365"
          defaultValue={initialValues.expiryAlertDaysBefore}
          required
          className="max-w-40"
        />
      </div>

      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="flex items-center gap-1.5 text-sm text-success">
          <CheckCircle2 className="size-4" />
          Settings saved.
        </p>
      )}

      <Button disabled={pending} type="submit" className="w-fit">
        Save settings
      </Button>
    </form>
  );
}
