"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { uploadDocument, type UploadState } from "./actions";

const DOCUMENT_TYPES = [
  { value: "lab_report", label: "Lab report" },
  { value: "visit_note", label: "Visit note" },
  { value: "discharge_summary", label: "Discharge summary" },
  { value: "referral", label: "Referral letter" },
  { value: "prescription_leaflet", label: "Prescription leaflet" },
  { value: "other", label: "Other" },
];

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

export function UploadForm() {
  const [state, formAction, pending] = useActionState<UploadState, FormData>(
    uploadDocument,
    undefined
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label="Document type" htmlFor="type">
        <Select name="type" items={DOCUMENT_TYPES} defaultValue="other">
          <SelectTrigger id="type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DOCUMENT_TYPES.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Title (optional)" htmlFor="title">
        <Input id="title" name="title" placeholder="e.g. Bloodwork, Sept 2026" />
      </Field>

      <Field label="Document date (optional)" htmlFor="documentDate">
        <Input id="documentDate" name="documentDate" type="date" />
        <p className="text-xs text-muted-foreground">
          The date on the document itself (visit or report date), not today. Leave
          blank to use the upload date.
        </p>
      </Field>

      <Field label="File" htmlFor="file">
        <Input id="file" name="file" type="file" accept=".pdf,image/*" required />
        <p className="text-xs text-muted-foreground">
          PDF, PNG, JPEG, WebP, or GIF, up to 10MB.
        </p>
      </Field>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Processing..." : "Upload document"}
      </Button>
    </form>
  );
}
