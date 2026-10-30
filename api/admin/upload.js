import { put } from "@vercel/blob";
import { isAdmin } from "../_shared/auth.js";
import { IMAGE_SLOTS, loadContent, saveContent } from "../_shared/content.js";
import { fail, json, methodNotAllowed, safeError } from "../_shared/http.js";

const ALLOWED_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export async function POST(request) {
  if (!isAdmin(request)) return fail("Sessão expirada.", 401);
  try {
    const form = await request.formData();
    const slot = String(form.get("slot") || "");
    const file = form.get("image");
    if (!IMAGE_SLOTS[slot]) return fail("Local da imagem inválido.");
    if (!(file instanceof File) || file.size === 0) return fail("Escolha uma imagem.");
    if (!ALLOWED_TYPES.has(file.type)) return fail("Envie uma imagem JPG, PNG ou WebP.");
    if (file.size > MAX_IMAGE_BYTES) return fail("A imagem deve ter no máximo 4 MB.", 413);

    const blob = await put(
      `site-content/images/${slot}-${Date.now()}.${ALLOWED_TYPES.get(file.type)}`,
      file,
      { access: "public", addRandomSuffix: true, contentType: file.type },
    );
    const current = await loadContent();
    current.images[slot] = blob.url;
    const content = await saveContent(current);
    return json({ ok: true, content, image: { slot, url: blob.url } });
  } catch (error) {
    return safeError(error, "admin_image_upload_error");
  }
}

export default {
  fetch(request) {
    if (request.method === "POST") return POST(request);
    return methodNotAllowed("POST");
  },
};
