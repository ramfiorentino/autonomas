import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/kv";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe-token";

const SUPPORT_EMAIL = "soporte@autonomas.app";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return renderError("es");
  }

  const payload = verifyUnsubscribeToken(token);

  if (!payload) {
    return renderError("es");
  }

  try {
    await redis.hset(`email_prefs:${payload.userId}`, { unsubscribed: "true" });
  } catch (err) {
    console.error("[unsubscribe] Redis error:", err);
    return renderError("es");
  }

  // Detect locale from the email domain or default to ES
  // (simple heuristic — locale not embedded in token by design)
  return renderConfirmation("es");
}

function renderConfirmation(locale: "es" | "en"): NextResponse {
  const copy =
    locale === "es"
      ? {
          title: "Baja confirmada",
          heading: "Te has dado de baja correctamente.",
          body: "Ya no recibirás más recordatorios mensuales de Autonomas.",
          link: "Volver a Autonomas",
        }
      : {
          title: "Unsubscribed",
          heading: "You have been unsubscribed.",
          body: "You will no longer receive monthly reminders from Autonomas.",
          link: "Back to Autonomas",
        };

  return new NextResponse(
    `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${copy.title} — Autonomas</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           display: flex; align-items: center; justify-content: center;
           min-height: 100vh; margin: 0; background: #f9fafb; color: #111827; }
    .card { max-width: 400px; background: #fff; border-radius: 12px;
            border: 1px solid #e5e7eb; padding: 40px; text-align: center; }
    h1 { font-size: 20px; font-weight: 700; margin: 0 0 12px; }
    p  { font-size: 14px; color: #6b7280; margin: 0 0 24px; line-height: 1.6; }
    a  { display: inline-block; background: #7c3aed; color: #fff;
         text-decoration: none; padding: 10px 20px; border-radius: 8px;
         font-size: 14px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${copy.heading}</h1>
    <p>${copy.body}</p>
    <a href="https://autonomas.app">${copy.link}</a>
  </div>
</body>
</html>`,
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

function renderError(locale: "es" | "en"): NextResponse {
  const copy =
    locale === "es"
      ? {
          title: "Enlace no válido",
          heading: "Este enlace ha expirado o no es válido.",
          body: `Si quieres darte de baja, escríbenos a <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a> y lo gestionamos manualmente.`,
          link: "Volver a Autonomas",
        }
      : {
          title: "Invalid link",
          heading: "This link has expired or is invalid.",
          body: `If you'd like to unsubscribe, email us at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a> and we'll handle it manually.`,
          link: "Back to Autonomas",
        };

  return new NextResponse(
    `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${copy.title} — Autonomas</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           display: flex; align-items: center; justify-content: center;
           min-height: 100vh; margin: 0; background: #f9fafb; color: #111827; }
    .card { max-width: 400px; background: #fff; border-radius: 12px;
            border: 1px solid #e5e7eb; padding: 40px; text-align: center; }
    h1 { font-size: 20px; font-weight: 700; margin: 0 0 12px; }
    p  { font-size: 14px; color: #6b7280; margin: 0 0 24px; line-height: 1.6; }
    a.btn { display: inline-block; background: #7c3aed; color: #fff;
            text-decoration: none; padding: 10px 20px; border-radius: 8px;
            font-size: 14px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${copy.heading}</h1>
    <p>${copy.body}</p>
    <a class="btn" href="https://autonomas.app">${copy.link}</a>
  </div>
</body>
</html>`,
    { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}
