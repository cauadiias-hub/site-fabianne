import { isAdmin } from "../_shared/auth.js";
import { json, methodNotAllowed } from "../_shared/http.js";

export async function GET(request) {
  return json({ ok: true, authenticated: isAdmin(request) });
}

export default {
  fetch(request) {
    return request.method === "GET" ? GET(request) : methodNotAllowed("GET");
  },
};