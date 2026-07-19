// Post-deploy smoke test for the Tooth Haven landing page.
// Fetches the live site, checks status, TLS, expected markers, and asset
// loading, and returns a structured JSON report.
//
// Invoke: POST /functions/v1/smoke-test  (optional body: { "url": "..." })

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_URL = "https://www.toothhaven.in";

// Strings the updated landing page must contain. Kept intentionally
// generic so ordinary copy edits don't false-fail the check.
const REQUIRED_MARKERS = [
  "Tooth Haven",
  "Dental",
  "West Mambalam",
  "Dr. Karthik",
];

type Check = { name: string; ok: boolean; detail?: string };

async function runChecks(targetUrl: string) {
  const checks: Check[] = [];
  const startedAt = Date.now();
  let html = "";
  let status = 0;
  let finalUrl = targetUrl;
  let contentType = "";

  try {
    const res = await fetch(targetUrl, {
      redirect: "follow",
      headers: { "User-Agent": "ToothHavenSmokeTest/1.0" },
    });
    status = res.status;
    finalUrl = res.url;
    contentType = res.headers.get("content-type") ?? "";
    html = await res.text();
  } catch (e) {
    checks.push({ name: "fetch", ok: false, detail: (e as Error).message });
    return { ok: false, checks, status, finalUrl, durationMs: Date.now() - startedAt };
  }

  checks.push({ name: "https", ok: finalUrl.startsWith("https://"), detail: finalUrl });
  checks.push({ name: "http_200", ok: status === 200, detail: `status ${status}` });
  checks.push({
    name: "content_type_html",
    ok: contentType.includes("text/html"),
    detail: contentType,
  });
  checks.push({
    name: "non_empty_body",
    ok: html.length > 1000,
    detail: `${html.length} bytes`,
  });

  for (const marker of REQUIRED_MARKERS) {
    checks.push({
      name: `contains:${marker}`,
      ok: html.includes(marker),
    });
  }

  // React/Vite bundles are injected as <script type="module" src="/assets/...">
  const hasBundle = /<script[^>]+src="[^"]*\/assets\/[^"]+\.js"/i.test(html);
  checks.push({ name: "js_bundle_referenced", ok: hasBundle });

  // Root mount point must exist for the SPA to hydrate.
  checks.push({ name: "root_div", ok: /<div[^>]+id="root"/.test(html) });

  // Title must be the app title, not the Lovable default.
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  const title = titleMatch?.[1]?.trim() ?? "";
  checks.push({
    name: "app_title",
    ok: title.length > 0 && !/lovable app|vite app/i.test(title),
    detail: title,
  });

  const ok = checks.every((c) => c.ok);
  return { ok, checks, status, finalUrl, title, durationMs: Date.now() - startedAt };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let targetUrl = DEFAULT_URL;
  if (req.method === "POST") {
    try {
      const body = await req.json();
      if (typeof body?.url === "string" && /^https?:\/\//.test(body.url)) {
        targetUrl = body.url;
      }
    } catch {
      // ignore body parse errors, use default
    }
  }

  const report = await runChecks(targetUrl);
  const failed = report.checks.filter((c) => !c.ok);

  return new Response(
    JSON.stringify({
      target: targetUrl,
      ok: report.ok,
      summary: report.ok
        ? `✅ ${report.checks.length}/${report.checks.length} checks passed`
        : `❌ ${failed.length} check(s) failed: ${failed.map((f) => f.name).join(", ")}`,
      status: report.status,
      finalUrl: report.finalUrl,
      title: report.title,
      durationMs: report.durationMs,
      checks: report.checks,
      timestamp: new Date().toISOString(),
    }, null, 2),
    {
      status: report.ok ? 200 : 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
