import { Resend } from "resend";

export async function sendEmail({
  to,
  subject,
  text,
}: {
  to: string;
  subject: string;
  text: string;
}) {
  const from = process.env.REMINDER_FROM_EMAIL;
  if (!from) throw new Error("REMINDER_FROM_EMAIL is not set.");
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not set.");
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({ from, to, subject, text });
}
