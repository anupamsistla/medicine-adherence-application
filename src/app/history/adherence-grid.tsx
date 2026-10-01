import Link from "next/link";
import type { GridCell } from "./grid-cells";

function cellClassName(cell: NonNullable<GridCell>): string {
  const resolved = cell.taken + cell.missed;
  if (resolved === 0) return "bg-muted text-muted-foreground";
  const ratio = cell.taken / resolved;
  if (ratio === 1) return "bg-success/15 text-success";
  if (ratio === 0) return "bg-destructive/15 text-destructive";
  return "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400";
}

export function AdherenceGrid({
  cells,
  columns,
}: {
  cells: GridCell[];
  columns: number;
}) {
  return (
    <div
      className="grid gap-1"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {cells.map((cell, index) =>
        cell === null ? (
          <div key={`blank-${index}`} />
        ) : (
          <Link
            key={cell.key}
            href={cell.href}
            className={`block rounded-md px-1 py-2 text-center text-sm transition-opacity hover:opacity-80 ${cellClassName(cell)}`}
          >
            <div>{cell.label}</div>
            {cell.taken + cell.missed > 0 && (
              <div className="text-xs opacity-80">
                {cell.taken}/{cell.taken + cell.missed}
              </div>
            )}
          </Link>
        )
      )}
    </div>
  );
}
