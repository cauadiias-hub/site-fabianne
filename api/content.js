import { loadContent } from "./_shared/content.js";
import { json, methodNotAllowed, safeError } from "./_shared/http.js";

export async function GET() {
  try {
    const { reviewSubmissions, ...content } = await loadContent();
    return json({ ok: true, content }, 200, {
      "Cache-Control": "public, max-age=0, s-maxage=30, stale-while-revalidate=120",
    });
  } catch (error) {
    return safeError(error, "content_get_error");
  }
}

export default {
  fetch(request) {
    if (request.method === "GET") return GET(request);
    return methodNotAllowed("GET");
  },
};
