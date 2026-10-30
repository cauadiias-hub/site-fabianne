import { clearSessionCookie } from "../_shared/auth.js";
import { json, methodNotAllowed } from "../_shared/http.js";

export async function POST(request) {
  return json({ ok: true }, 200, { "Set-Cookie": clearSessionCookie(request) });
}

export default {
  fetch(request) {
    return request.method === "POST" ? POST(request) : methodNotAllowed("POST");
  },
};