import { randomUUID } from "node:crypto";
import { loadContent, saveContent } from "./_shared/content.js";
import { fail, json, methodNotAllowed, readJson, safeError } from "./_shared/http.js";

function clean(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

export async function POST(request) {
  try {
    const data = await readJson(request, 8_192);
    if (data.website) return json({ ok: true, submitted: true }, 202);
    const name = clean(data.name, 80);
    const context = clean(data.context, 100);
    const text = clean(data.text, 600);
    const rating = Math.min(5, Math.max(1, Number(data.rating) || 5));
    if (!name) return fail("Informe seu nome.");
    if (text.length < 20) return fail("Escreva uma avaliação com pelo menos 20 caracteres.");
    if (data.acceptedPrivacy !== true) return fail("Confirme a autorização para enviar a avaliação.");

    const content = await loadContent();
    if (content.reviewSubmissions.length >= 100) return fail("O limite de avaliações em análise foi atingido.", 429);
    content.reviewSubmissions.push({
      id: randomUUID(),
      name,
      context,
      text,
      rating,
      createdAt: new Date().toISOString(),
    });
    await saveContent(content);
    return json({ ok: true, submitted: true }, 201);
  } catch (error) {
    return safeError(error, "review_submission_error");
  }
}

export default {
  fetch(request) {
    if (request.method === "POST") return POST(request);
    return methodNotAllowed("POST");
  },
};
