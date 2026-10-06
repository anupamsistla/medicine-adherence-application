import Link from "next/link";
import { Pill } from "lucide-react";
import { signOut } from "@/auth";
import { Button } from "@/components/ui/button";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/medications", label: "Medications" },
  { href: "/history", label: "History" },
  { href: "/documents", label: "Appointment Prep" },
  { href: "/settings", label: "Settings" },
];

export function AppNav({ userEmail }: { userEmail?: string | null }) {
  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div className="flex flex-wrap items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <Pill className="size-5 text-primary" />
            MedTrack
          </Link>
          <nav className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {userEmail && (
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {userEmail}
            </span>
          )}
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
