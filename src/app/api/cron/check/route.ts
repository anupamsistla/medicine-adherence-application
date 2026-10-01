import { runChecks } from "@/lib/checks";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  await runChecks();

  return Response.json({ ok: true, ranAt: new Date().toISOString() });
}
