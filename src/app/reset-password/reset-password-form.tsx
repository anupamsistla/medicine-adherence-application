"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Pill } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { resetPassword } from "./actions";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(resetPassword, undefined);

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-muted/30 px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2 font-semibold">
          <Pill className="size-5 text-primary" />
          MedTrack
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Choose a new password</CardTitle>
          </CardHeader>
          <CardContent>
            {state?.done ? (
              <div className="flex flex-col gap-4">
                <p className="text-sm">Your password has been updated.</p>
                <Button render={<Link href="/login" />}>Log in</Button>
              </div>
            ) : (
              <form action={formAction} className="flex flex-col gap-4">
                <input type="hidden" name="token" value={token} />
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="password">New password</Label>
                  <Input id="password" name="password" type="password" required />
                  <p className="text-xs text-muted-foreground">
                    At least 8 characters, with a letter and a number.
                  </p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="confirm">Confirm new password</Label>
                  <Input id="confirm" name="confirm" type="password" required />
                </div>
                {state?.error && (
                  <p role="alert" className="text-sm text-destructive">
                    {state.error}
                  </p>
                )}
                <Button disabled={pending || !token} type="submit">
                  Update password
                </Button>
                {!token && (
                  <p className="text-sm text-destructive">
                    This link is missing its token.{" "}
                    <Link href="/forgot-password" className="underline">
                      Request a new one
                    </Link>
                    .
                  </p>
                )}
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
