import { createSign } from "node:crypto";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_API = "https://www.googleapis.com/calendar/v3";
const SCOPE = "https://www.googleapis.com/auth/calendar";

let tokenCache = null;

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

function serviceAccount() {
  const encoded = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64;
  if (!encoded) throw Object.assign(new Error("Credencial do Google não configurada."), { status: 500 });
  try {
    const data = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
    if (!data.client_email || !data.private_key) throw new Error("Campos ausentes");
    return data;
  } catch {
    throw Object.assign(new Error("Credencial do Google inválida."), { status: 500 });
  }
}

export function calendarId() {
  const id = process.env.GOOGLE_CALENDAR_ID;
  if (!id) throw Object.assign(new Error("Agenda do Google não configurada."), { status: 500 });
  return id;
}

async function accessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (tokenCache?.expiresAt > now + 60) return tokenCache.value;

  const account = serviceAccount();
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(JSON.stringify({
    iss: account.client_email,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${claims}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const assertion = `${unsigned}.${signer.sign(account.private_key).toString("base64url")}`;

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) {
    console.error("google_token_error", { status: response.status, error: data.error });
    throw Object.assign(new Error("Falha ao autenticar no Google Agenda."), { status: 502 });
  }
  tokenCache = { value: data.access_token, expiresAt: now + Number(data.expires_in || 3600) };
  return tokenCache.value;
}

export async function googleCalendar(path, { method = "GET", query, body } = {}) {
  const url = new URL(`${CALENDAR_API}${path}`);
  for (const [key, value] of Object.entries(query || {})) {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const error = new Error(data?.error?.message || "Erro no Google Agenda.");
    error.status = response.status === 404 ? 404 : 502;
    error.googleStatus = response.status;
    error.googleReason = data?.error?.errors?.[0]?.reason;
    throw error;
  }
  return data;
}

export async function getBusy(timeMin, timeMax) {
  const id = calendarId();
  const data = await googleCalendar("/freeBusy", {
    method: "POST",
    body: { timeMin, timeMax, timeZone: "America/Sao_Paulo", items: [{ id }] },
  });
  return data.calendars?.[id]?.busy || [];
}
