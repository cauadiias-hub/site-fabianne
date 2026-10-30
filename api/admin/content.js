import { isAdmin } from "../_shared/auth.js";
import { IMAGE_SLOTS, LINK_SLOTS, loadContent, saveContent } from "../_shared/content.js";
import { fail, json, methodNotAllowed, readJson, safeError } from "../_shared/http.js";

export async function GET(request) {
  if (!isAdmin(request)) return fail("Sessão expirada.", 401);
  try {
    return json({ ok: true, content: await loadContent(), imageSlots: IMAGE_SLOTS, linkSlots: LINK_SLOTS });
  } catch (error) {
    return safeError(error, "admin_content_get_error");
  }
}

export async function PUT(request) {
  if (!isAdmin(request)) return fail("Sessão expirada.", 401);
  try {
    const data = await readJson(request, 32_768);
    const current = await loadContent();
    const content = await saveContent({
      ...current,
      ...(data.reviews !== undefined ? { reviews: data.reviews } : {}),
      ...(data.links !== undefined ? { links: data.links } : {}),
      ...(data.mediaItems !== undefined ? { mediaItems: data.mediaItems } : {}),
      ...(data.reviewSubmissions !== undefined ? { reviewSubmissions: data.reviewSubmissions } : {}),
    });
    return json({ ok: true, content });
  } catch (error) {
    return safeError(error, "admin_content_save_error");
  }
}

export default {
  fetch(request) {
    if (request.method === "GET") return GET(request);
    if (request.method === "PUT") return PUT(request);
    return methodNotAllowed("GET", "PUT");
  },
};
