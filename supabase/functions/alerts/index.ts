// supabase/functions/alerts/index.js
// Deno runtime (Supabase Edge Functions) - JavaScript

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SmtpClient } from "https://deno.land/x/smtp/mod.ts";

/* ----------------------- CORS helpers ----------------------- */
const ALLOWED_ORIGINS = [
  Deno.env.get("FRONTEND_URL") || "",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

function corsHeadersFor(req) {
  const origin = req.headers.get("Origin") || "";
  const allowed = ALLOWED_ORIGINS.find((o) => o && origin.startsWith(o));
  const allowOrigin = allowed || "*";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Vary": "Origin",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
}

function json(req, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeadersFor(req) },
  });
}

/* ----------------------- Env ----------------------- */
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const FRONTEND_URL = Deno.env.get("FRONTEND_URL") || "http://localhost:5173";
const DEFAULT_CITY = Deno.env.get("PROJECT_CITY") || "Toronto";

// Gmail SMTP (App Password)
const SMTP_HOST = Deno.env.get("SMTP_HOST") || "smtp.gmail.com";
const SMTP_PORT = Number(Deno.env.get("SMTP_PORT") || "465"); // TLS
const SMTP_USER = Deno.env.get("SMTP_USER"); 
const SMTP_PASS = Deno.env.get("SMTP_PASS");
const FROM_NAME = Deno.env.get("FROM_NAME") || "CityWatch Toronto";
const FROM = `${FROM_NAME} <${SMTP_USER}>`;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

/* ----------------------- Helpers ----------------------- */
async function getAuthedUser(req) {
  const authHeader = req.headers.get("Authorization") || "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  if (!jwt) return null;
  const { data, error } = await supabase.auth.getUser(jwt);
  if (error || !data?.user) return null;
  return data.user;
}

function randomToken(bytes = 24) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  let b64 = btoa(String.fromCharCode(...arr));
  return b64.replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

async function sendEmail(to, subject, content) {
  const client = new SmtpClient();
  await client.connectTLS({
    hostname: SMTP_HOST,
    port: SMTP_PORT,
    username: SMTP_USER,
    password: SMTP_PASS,
  });
  await client.send({ from: FROM, to, subject, content });
  await client.close();
}

/* ----------------------- Handlers ----------------------- */
async function handleSendVerify(req) {
  const user = await getAuthedUser(req);
  if (!user) return json(req, { error: "Unauthorized" }, 401);

  const body = await req.json().catch(() => ({}));
  const email = (body.email || "").trim();
  if (!email) return json(req, { error: "Missing email" }, 400);

  const city = (body.city || DEFAULT_CITY).trim();
  const wantsNew = body.wantsNewIssues ?? true;
  const wantsRes = body.wantsResolved ?? false;

  const token = randomToken();

  const { error: upErr } = await supabase
    .from("email_subscriptions")
    .upsert(
      {
        user_id: user.id,
        email,
        city,
        wants_new_issues: wantsNew,
        wants_resolved: wantsRes,
        verify_token: token,
        verified_at: null,
      },
      { onConflict: "user_id,city" },
    );

  if (upErr) return json(req, { error: `DB error: ${upErr.message}` }, 500);

  const fnHost = new URL(req.url).host; // <project-ref>.functions.supabase.co
  const verifyUrl = `https://${fnHost}/alerts?action=verify&token=${encodeURIComponent(
    token,
  )}`;

  const text = [
    `Hi ${user.email || "there"},`,
    ``,
    `Please verify your email for City alerts (${city}).`,
    `Click to confirm: ${verifyUrl}`,
    ``,
    `If you didn't request this, you can ignore this email.`,
  ].join("\n");

  try {
    await sendEmail(email, "Confirm your email for CityWatch alerts", text);
  } catch (e) {
    return json(req, { error: "SMTP send failed: " + (e?.message || e) }, 500);
  }
  return json(req, { ok: true });


}

async function handleVerify(req) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!token)
    return new Response("Missing token", {
      status: 400,
      headers: corsHeadersFor(req),
    });

  const { data } = await supabase
    .from("email_subscriptions")
    .update({ verified_at: new Date().toISOString(), verify_token: null })
    .eq("verify_token", token)
    .select("email,city")
    .limit(1)
    .maybeSingle();

  const target = `${FRONTEND_URL.replace(/\/+$/, "")}/email-verified${
    data ? "?ok=1" : "?ok=0"
  }`;
  return new Response(null, {
    status: 302,
    headers: { Location: target, ...corsHeadersFor(req) },
  });
}

async function notify(city, subject, contentBuilder, prefFlag /* "wants_new_issues" | "wants_resolved" */) {
  const { data: subs, error } = await supabase
    .from("email_subscriptions")
    .select("email")
    .eq("city", city)
    .not("verified_at", "is", null)
    .eq(prefFlag, true);

  if (error) throw error;

  for (const row of subs || []) {
    try {
      await sendEmail(row.email, subject, contentBuilder(row.email));
    } catch {
      // continue
    }
  }
}

async function handleNotify(req, type) {
  const user = await getAuthedUser(req);
  if (!user) return json(req, { error: "Unauthorized" }, 401);

  const body = await req.json().catch(() => ({}));
  const city = (body.city || DEFAULT_CITY).trim();

  if (!body.issueId || !body.title || !body.type) {
    return json(req, { error: "Missing issue payload" }, 400);
  }

  // Optional guard
  const { data: issue } = await supabase
    .from("issues")
    .select("id, creator_id, status")
    .eq("id", body.issueId)
    .maybeSingle();

  if (!issue) return json(req, { error: "Issue not found" }, 404);
  if (issue.creator_id !== user.id) return json(req, { error: "Forbidden" }, 403);

  if (type === "new") {
    const subject = `New issue in ${city}: ${body.title}`;
    await notify(
      city,
      subject,
      () =>
        [`A new "${body.type}" was reported: ${body.title}`, `Open the app for details.`].join(
          "\n",
        ),
      "wants_new_issues",
    );
  } else {
    const subject = `Issue resolved in ${city}: ${body.title}`;
    await notify(
      city,
      subject,
      () =>
        [`"${body.title}" was marked resolved.`, `Open the app for details.`].join("\n"),
      "wants_resolved",
    );
  }

  return json(req, { ok: true });
}

async function handleDiag(req) {
  const problems = [];

  if (!SUPABASE_URL) problems.push("SUPABASE_URL missing");
  if (!SUPABASE_SERVICE_ROLE_KEY) problems.push("SUPABASE_SERVICE_ROLE_KEY missing");
  if (!SMTP_USER) problems.push("SMTP_USER missing");
  if (!SMTP_PASS) problems.push("SMTP_PASS missing");
  if (!FRONTEND_URL) problems.push("FRONTEND_URL missing (dev fallback used)");

  try {
    const { error } = await supabase.from("email_subscriptions").select("id").limit(1);
    if (error) problems.push("email_subscriptions query failed: " + error.message);
  } catch (e) {
    problems.push("email_subscriptions threw: " + (e?.message || e));
  }

  return json(req, { ok: problems.length === 0, problems });
}


/* ----------------------- Entry ----------------------- */
Deno.serve(async (req) => {
  // Preflight must always succeed
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeadersFor(req) });
  }

  try {
    const url = new URL(req.url);

    if (req.method === "GET" && url.searchParams.get("action") === "diag") {
      return await handleDiag(req);
    }

    if (req.method === "GET" && url.searchParams.get("action") === "verify") {
      return await handleVerify(req);
    }

    if (req.method === "POST") {
      const body = await req.clone().json().catch(() => ({}));
      const action = body.action;

      if (action === "send-verify") return await handleSendVerify(req);
      if (action === "notify-new") return await handleNotify(req, "new");
      if (action === "notify-resolved") return await handleNotify(req, "resolved");
    }

    return new Response("Not found", {
      status: 404,
      headers: corsHeadersFor(req),
    });
  } catch (e) {
    return new Response(`Error: ${e?.message || e}`, {
      status: 500,
      headers: corsHeadersFor(req),
    });
  }
});

