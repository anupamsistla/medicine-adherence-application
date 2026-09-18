"use client";

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
      <button type="submit">Delete</button>
    </form>
  );
}
