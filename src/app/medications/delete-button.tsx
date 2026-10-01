"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DeleteMedicationButton({
  action,
}: {
  action: () => Promise<void>;
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!confirm("Delete this medication?")) event.preventDefault();
      }}
    >
      <Button type="submit" variant="ghost" size="sm" className="text-destructive">
        <Trash2 className="size-3.5" />
        Delete
      </Button>
    </form>
  );
}
