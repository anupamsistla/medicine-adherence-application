"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { setUserTimeZone } from "@/app/timezone-actions";

export function TimeZoneSync({ storedTimeZone }: { storedTimeZone: string }) {
  const router = useRouter();

  useEffect(() => {
    const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (browserTimeZone && browserTimeZone !== storedTimeZone) {
      setUserTimeZone(browserTimeZone).then(() => router.refresh());
    }
  }, [storedTimeZone, router]);

  return null;
}
