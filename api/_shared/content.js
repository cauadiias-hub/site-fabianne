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

export const LINK_SLOTS = Object.freeze({
  navBooking: { label: "Botão do menu", defaultText: "Agendar com Fabiane", defaultUrl: "#agendar" },
  heroPrimary: { label: "Botão principal da capa", defaultText: "Conheça minha atuação", defaultUrl: "#atuacao" },
  heroBooking: { label: "Link de horários da capa", defaultText: "Ver horários disponíveis", defaultUrl: "#agendar" },
  aboutContact: { label: "Link da seção Sobre", defaultText: "Conversar sobre o seu momento", defaultUrl: "#contato" },
  companiesContact: { label: "Link da seção Empresas", defaultText: "Conversar sobre sua organização", defaultUrl: "#contato" },
  finalBooking: { label: "Botão final", defaultText: "Agendar com Fabiane", defaultUrl: "#agendar" },
});

export const DEFAULT_MEDIA = Object.freeze([
  {
    id: "media-video-default",
    type: "video",
    section: "midia",
    title: "Conversas sobre pessoas, trabalho e desenvolvimento.",
    description: "Acompanhe vídeos e entrevistas disponíveis no YouTube.",
    url: "https://www.youtube.com/results?search_query=Fabiane+Andr%C3%A9+Costa",
    imageUrl: "",
  },
  {
    id: "media-podcast-default",
    type: "podcast",
    section: "midia",
    title: "Ideias para escutar com calma e levar para a vida.",
    description: "Encontre participações e conversas em plataformas de áudio.",
    url: "https://open.spotify.com/search/Fabiane%20Andr%C3%A9%20Costa",
    imageUrl: "",
  },
]);

export const DEFAULT_CONTENT = Object.freeze({
  images: Object.fromEntries(
    Object.entries(IMAGE_SLOTS).map(([key, slot]) => [key, slot.defaultUrl]),
  ),
  links: Object.fromEntries(
    Object.entries(LINK_SLOTS).map(([key, slot]) => [key, {
      text: slot.defaultText,
      url: slot.defaultUrl,
      newTab: false,
    }]),
  ),
  mediaItems: DEFAULT_MEDIA,
  reviews: [],
  reviewSubmissions: [],
});

function text(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function safeUrl(value, fallback = "") {
  const url = text(value, 2_000);
  if (!url) return fallback;
  if (url.startsWith("#") || url.startsWith("/") || url.startsWith("https://") || url.startsWith("http://") || url.startsWith("mailto:") || url.startsWith("tel:")) return url;
  return fallback;
}

export function normalizeContent(input = {}) {
  const images = {};
  for (const [key, slot] of Object.entries(IMAGE_SLOTS)) {
    const value = text(input.images?.[key], 2_000);
    images[key] = value.startsWith("https://") || value.startsWith("/")
      ? value
      : slot.defaultUrl;
  }

  const links = {};
  for (const [key, slot] of Object.entries(LINK_SLOTS)) {
    const item = input.links?.[key] || {};
    links[key] = {
      text: text(item.text, 80) || slot.defaultText,
      url: safeUrl(item.url, slot.defaultUrl),
      newTab: Boolean(item.newTab),
    };
  }

  const mediaItems = (Array.isArray(input.mediaItems) ? input.mediaItems : DEFAULT_MEDIA)
    .slice(0, 24)
    .map((item, index) => ({
      id: text(item.id, 80) || `media-${Date.now()}-${index}`,
      type: ["image", "video", "podcast", "interview", "material"].includes(item.type) ? item.type : "image",
      section: ["inicio", "sobre", "atuacao", "empresas", "psicologia", "conteudos", "midia", "avaliacoes", "contato"].includes(item.section) ? item.section : "midia",
      title: text(item.title, 120),
      description: text(item.description, 320),
      url: safeUrl(item.url),
      imageUrl: safeUrl(item.imageUrl),
    }))
    .filter((item) => item.title && (item.url || item.imageUrl));

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

  const reviewSubmissions = (Array.isArray(input.reviewSubmissions) ? input.reviewSubmissions : [])
    .slice(0, 100)
    .map((review, index) => ({
      id: text(review.id, 80) || `submission-${Date.now()}-${index}`,
      name: text(review.name, 80),
      context: text(review.context, 100),
      text: text(review.text, 600),
      rating: Math.min(5, Math.max(1, Number(review.rating) || 5)),
      createdAt: text(review.createdAt, 40) || new Date().toISOString(),
    }))
    .filter((review) => review.name && review.text);

  return { images, links, mediaItems, reviews, reviewSubmissions };
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
    addRandomSuffix: true,
    contentType: "application/json; charset=utf-8",
    cacheControlMaxAge: 60,
  });
  return content;
}
