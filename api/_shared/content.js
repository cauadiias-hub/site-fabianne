import { list, put } from "@vercel/blob";

const CONTENT_PREFIX = "site-content/content-";

export const IMAGE_SLOTS = Object.freeze({
  logo: {
    label: "Logo",
    defaultUrl: "/images/fabiane-andre-costa-logo_31ab3a8e.jpeg",
  },
  hero: {
    label: "Foto principal",
    defaultUrl: "/images/fabiane-retrato-azul_a8971b37.jpeg",
  },
  about: {
    label: "Foto da seção Sobre",
    defaultUrl: "/images/fabiane-retrato-preto_7c7cb604.jpeg",
  },
  psychology: {
    label: "Foto da seção Psicologia",
    defaultUrl: "/images/fabiane-retrato-bege_31855530.jpeg",
  },
  companies: {
    label: "Foto da seção Empresas",
    defaultUrl: "/images/fabiane-reuniao-empresas_31340631.png",
  },
});

export const DEFAULT_CONTENT = Object.freeze({
  images: Object.fromEntries(
    Object.entries(IMAGE_SLOTS).map(([key, slot]) => [key, slot.defaultUrl]),
  ),
  reviews: [],
});

function text(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

export function normalizeContent(input = {}) {
  const images = {};
  for (const [key, slot] of Object.entries(IMAGE_SLOTS)) {
    const value = text(input.images?.[key], 2_000);
    images[key] = value.startsWith("https://") || value.startsWith("/")
      ? value
      : slot.defaultUrl;
  }

  const reviews = (Array.isArray(input.reviews) ? input.reviews : [])
    .slice(0, 12)
    .map((review, index) => ({
      id: text(review.id, 80) || `review-${Date.now()}-${index}`,
      name: text(review.name, 80),
      context: text(review.context, 100),
      text: text(review.text, 600),
      rating: Math.min(5, Math.max(1, Number(review.rating) || 5)),
    }))
    .filter((review) => review.name && review.text);

  return { images, reviews };
}

export async function loadContent() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return structuredClone(DEFAULT_CONTENT);
  const { blobs } = await list({ prefix: CONTENT_PREFIX, limit: 1_000 });
  const blob = blobs
    .filter((item) => item.pathname.endsWith(".json"))
    .sort((left, right) => new Date(right.uploadedAt) - new Date(left.uploadedAt))[0];
  if (!blob) return structuredClone(DEFAULT_CONTENT);
  const response = await fetch(blob.url, { cache: "no-store" });
  if (!response.ok) throw new Error("Não foi possível carregar o conteúdo do site.");
  return normalizeContent(await response.json());
}

export async function saveContent(input) {
  const content = normalizeContent(input);
  await put(`${CONTENT_PREFIX}${Date.now()}.json`, JSON.stringify(content), {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json; charset=utf-8",
    cacheControlMaxAge: 60,
  });
  return content;
}
