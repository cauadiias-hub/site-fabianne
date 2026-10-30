import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "fabiane_admin";
const SESSION_TTL_SECONDS = 8 * 60 * 60;

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) throw Object.assign(new Error(`Variável ${name} ausente.`), { status: 500 });
  return value;
}

function constantTimeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function signature(expiresAt) {
  return createHmac("sha256", getRequiredEnv("SESSION_SECRET"))
    .update(`fabiane-admin:${expiresAt}`)
    .digest("base64url");
}

export function verifyPassword(password) {
  return constantTimeEqual(password, getRequiredEnv("ADMIN_PASSWORD"));
}

export function createSessionCookie(request) {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const token = `${expiresAt}.${signature(expiresAt)}`;
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_TTL_SECONDS}${secure}`;
}

export function clearSessionCookie(request) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}

export function isAdmin(request) {
  const cookie = request.headers.get("cookie") || "";
  const raw = cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`))
    ?.slice(COOKIE_NAME.length + 1);
  if (!raw) return false;
  const [expiresAtRaw, providedSignature] = raw.split(".");
  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return false;
  try {
    return constantTimeEqual(providedSignature, signature(expiresAt));
  } catch {
    return false;
  }
}
