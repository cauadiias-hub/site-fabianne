import { createSessionCookie, verifyPassword } from "../_shared/auth.js";
import { fail, json, methodNotAllowed, readJson, safeError } from "../_shared/http.js";

export async function POST(request) {
  try {
    const { password } = await readJson(request, 2_048);
    if (!verifyPassword(password)) return fail("Senha incorreta.", 401);
    return json({ ok: true }, 200, { "Set-Cookie": createSessionCookie(request) });
  } catch (error) {
    return safeError(error, "admin_login_error");
  }
}

export default {
  fetch(request) {
    return request.method === "POST" ? POST(request) : methodNotAllowed("POST");
  },
};