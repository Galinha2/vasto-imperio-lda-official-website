export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(503).json({ error: "Supabase keep-alive is not configured." });
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/admin_sales?select=id&limit=1`, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });
    await response.arrayBuffer();

    if (!response.ok) {
      console.error("[supabase-keepalive] Supabase request failed", { httpStatus: response.status });
      return res.status(502).json({ error: "Supabase health check failed." });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("[supabase-keepalive] Request failed", {
      error: error instanceof Error ? error.name : "UnknownError",
    });
    return res.status(502).json({ error: "Supabase health check failed." });
  }
}
