"use client";

import { useTransition } from "react";
import { FileText, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteDocument } from "./actions";
import { formatDay } from "@/lib/timezone";

const TYPE_LABELS: Record<string, string> = {
  lab_report: "Lab report",
  visit_note: "Visit note",
  discharge_summary: "Discharge summary",
  referral: "Referral letter",
  prescription_leaflet: "Prescription leaflet",
  other: "Other",
};

export type DocumentListItem = {
  id: string;
  title: string;
  type: string;
  sourceFileUrl: string;
  createdAt: string;
};

function DocumentRow({ doc, timeZone }: { doc: DocumentListItem; timeZone: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <li className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div className="flex items-center gap-3">
        <FileText className="size-4 text-muted-foreground" />
        <div>
          <a
            href={doc.sourceFileUrl}
            target="_blank"
            rel="noreferrer"
            className="font-medium hover:underline"
          >
            {doc.title}
          </a>
          <p className="text-xs text-muted-foreground">
            {formatDay(new Date(doc.createdAt), timeZone, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline">{TYPE_LABELS[doc.type] ?? doc.type}</Badge>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={isPending}
          onClick={() => startTransition(() => deleteDocument(doc.id))}
          aria-label="Delete document"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </li>
  );
}

export function DocumentList({
  documents,
  timeZone,
}: {
  documents: DocumentListItem[];
  timeZone: string;
}) {
  if (documents.length === 0) {
    return (
      <p className="py-6 text-center text-muted-foreground">
        No documents uploaded yet.
      </p>
    );
  }

  return (
    <ul className="divide-y">
      {documents.map((doc) => (
        <DocumentRow key={doc.id} doc={doc} timeZone={timeZone} />
      ))}
    </ul>
  );
}
