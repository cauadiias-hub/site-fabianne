export function json(data, status = 200, extraHeaders = {}) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });
}

export function fail(message, status = 400, details) {
  return json({ ok: false, error: message, ...(details ? { details } : {}) }, status);
}

export async function readJson(request, maxBytes = 16_384) {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > maxBytes) throw Object.assign(new Error("Payload muito grande."), { status: 413 });
  const text = await request.text();
  if (text.length > maxBytes) throw Object.assign(new Error("Payload muito grande."), { status: 413 });
  try {
    return JSON.parse(text || "{}");
  } catch {
    throw Object.assign(new Error("JSON inválido."), { status: 400 });
  }
}

export function safeError(error, context) {
  console.error(context, {
    message: error?.message,
    status: error?.status,
    googleStatus: error?.googleStatus,
  });
  return fail(
    error?.status && error.status < 500 ? error.message : "Não foi possível concluir a operação.",
    error?.status && error.status < 500 ? error.status : 500,
  );
}

export function methodNotAllowed(...allowed) {
  return json({ ok: false, error: "Método não permitido." }, 405, { Allow: allowed.join(", ") });
}