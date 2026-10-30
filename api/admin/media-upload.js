import { put } from "@vercel/blob";
import { isAdmin } from "../_shared/auth.js";
import { fail, json, methodNotAllowed, safeError } from "../_shared/http.js";

const ALLOWED_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
  ["video/mp4", "mp4"],
  ["video/webm", "webm"],
  ["audio/mpeg", "mp3"],
  ["audio/mp4", "m4a"],
  ["audio/ogg", "ogg"],
  ["application/pdf", "pdf"],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"],
]);

export async function POST(request) {
  if (!isAdmin(request)) return fail("Sessão expirada.", 401);
  try {
    const form = await request.formData();
    const file = form.get("image");
    if (!(file instanceof File) || file.size === 0) return fail("Escolha uma imagem.");
    if (!ALLOWED_TYPES.has(file.type)) return fail("Formato de arquivo não permitido.");
    if (file.size > 4 * 1024 * 1024) return fail("O arquivo deve ter no máximo 4 MB. Para arquivos maiores, use um link externo.", 413);
    const blob = await put(
      `site-content/media/${Date.now()}.${ALLOWED_TYPES.get(file.type)}`,
      file,
      { access: "public", addRandomSuffix: true, contentType: file.type },
    );
    return json({ ok: true, url: blob.url, isImage: file.type.startsWith("image/"), fileName: file.name });
  } catch (error) {
    return safeError(error, "admin_media_upload_error");
  }
}

export default {
  fetch(request) {
    if (request.method === "POST") return POST(request);
    return methodNotAllowed("POST");
  },
};
