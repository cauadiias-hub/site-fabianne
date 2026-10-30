import { isAdmin } from "../_shared/auth.js";
import { fail, json, methodNotAllowed, readJson, safeError } from "../_shared/http.js";
import { loadConfig, saveConfig, TIME_ZONE } from "../_shared/schedule.js";

export async function GET(request) {
  if (!isAdmin(request)) return fail("Sessão expirada.", 401);
  try {
    return json({ ok: true, timezone: TIME_ZONE, config: await loadConfig() });
  } catch (error) {
    return safeError(error, "admin_availability_get_error");
  }
}

export async function PUT(request) {
  if (!isAdmin(request)) return fail("Sessão expirada.", 401);
  try {
    const data = await readJson(request);
    const config = await saveConfig(data);
    return json({ ok: true, timezone: TIME_ZONE, config });
  } catch (error) {
    return safeError(error, "admin_availability_save_error");
  }
}

export default {
  fetch(request) {
    if (request.method === "GET") return GET(request);
    if (request.method === "PUT") return PUT(request);
    return methodNotAllowed("GET", "PUT");
  },
};