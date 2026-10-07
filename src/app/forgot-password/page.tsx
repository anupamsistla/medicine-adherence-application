"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Pill } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requestPasswordReset } from "./actions";

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, undefined);

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-muted/30 px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2 font-semibold">
          <Pill className="size-5 text-primary" />
          MedTrack
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Forgot your password?</CardTitle>
          </CardHeader>
          <CardContent>
            {state?.message ? (
              <p className="text-sm">{state.message}</p>
            ) : (
              <form action={formAction} className="flex flex-col gap-4">
                <p className="text-sm text-muted-foreground">
                  Enter the email you signed up with and we&apos;ll send you a link to choose a new password.
                </p>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" required />
                </div>
                {state?.error && (
                  <p role="alert" className="text-sm text-destructive">
                    {state.error}
                  </p>
                )}
                <Button disabled={pending} type="submit">
                  Send reset link
                </Button>
              </form>
            )}
            <p className="mt-6 text-center text-sm text-muted-foreground">
              <Link href="/login" className="font-medium text-primary hover:underline">
                Back to log in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
