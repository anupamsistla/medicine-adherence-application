"use client";

import { useActionState } from "react";
import Link from "next/link";
import { authenticate } from "./actions";

export default function LoginPage() {
  const [errorMessage, formAction, pending] = useActionState(
    authenticate,
    undefined
  );

  return (
    <div style={{ maxWidth: 360, margin: "4rem auto" }}>
      <h1>Log in</h1>
      <form action={formAction}>
        <div>
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" required />
        </div>
        {errorMessage && <p role="alert">{errorMessage}</p>}
        <button disabled={pending} type="submit">
          Log in
        </button>
      </form>
      <p>
        No account? <Link href="/signup">Sign up</Link>
      </p>
    </div>
  );
}
