const IMAGE_DEFAULTS = {
  logo: "/images/fabiane-andre-costa-logo_31ab3a8e.jpeg",
  hero: "/images/fabiane-retrato-azul_a8971b37.jpeg",
  about: "/images/fabiane-retrato-preto_7c7cb604.jpeg",
  psychology: "/images/fabiane-retrato-bege_31855530.jpeg",
  companies: "/images/fabiane-reuniao-empresas_31340631.png",
};

const LINK_TARGETS = {
  navBooking: { text: "Agendar com Fabiane", href: "#agendar", occurrence: 0 },
  heroPrimary: { text: "Conheça minha atuação", href: "#atuacao", occurrence: 0 },
  heroBooking: { text: "Ver horários disponíveis", href: "#agendar", occurrence: 0 },
  aboutContact: { text: "Conversar sobre o seu momento", href: "#contato", occurrence: 0 },
  companiesContact: { text: "Conversar sobre sua organização", href: "#contato", occurrence: 0 },
  finalBooking: { text: "Agendar com Fabiane", href: "#agendar", occurrence: 1 },
};

const MEDIA_LABELS = {
  image: "Imagem",
  video: "Vídeo",
  podcast: "Podcast",
  interview: "Entrevista",
};

function normalizedPath(value) {
  try { return new URL(value, location.origin).pathname; } catch { return value; }
}

function applyImages(images = {}) {
  for (const [slot, defaultUrl] of Object.entries(IMAGE_DEFAULTS)) {
    const nextUrl = images[slot];
    if (!nextUrl || nextUrl === defaultUrl) continue;
    document.querySelectorAll("img").forEach((image) => {
      if (normalizedPath(image.getAttribute("src")) === defaultUrl) image.src = nextUrl;
    });
    document.querySelectorAll("a[href]").forEach((link) => {
      if (normalizedPath(link.getAttribute("href")) === defaultUrl) link.href = nextUrl;
    });
  }
}

function setLinkText(link, value) {
  const textNode = [...link.childNodes].find((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
  if (textNode) textNode.textContent = `${value} `;
  else link.prepend(document.createTextNode(`${value} `));
}

function applyLinks(links = {}) {
  const resolved = Object.fromEntries(Object.entries(LINK_TARGETS).map(([key, target]) => {
    const matches = [...document.querySelectorAll("a")].filter((link) =>
      link.textContent.includes(target.text) && link.getAttribute("href") === target.href,
    );
    return [key, matches[target.occurrence]];
  }));
  for (const [key] of Object.entries(LINK_TARGETS)) {
    const link = resolved[key];
    const content = links[key];
    if (!link || !content) continue;
    setLinkText(link, content.text);
    link.href = content.url;
    if (content.url === "#agendar") link.setAttribute("data-booking-trigger", "");
    else link.removeAttribute("data-booking-trigger");
    if (content.newTab) {
      link.target = "_blank";
      link.rel = "noreferrer";
    } else {
      link.removeAttribute("target");
    }
  }
}

function mediaCard(item) {
  const article = document.createElement("article");
  article.className = `cms-media-card cms-media-${item.type}`;
  if (item.imageUrl) {
    const image = document.createElement("img");
    image.src = item.imageUrl;
    image.alt = item.title;
    image.loading = "lazy";
    article.appendChild(image);
  }
  const body = document.createElement("div");
  const kicker = document.createElement("p");
  kicker.className = "media-kicker";
  kicker.textContent = MEDIA_LABELS[item.type] || "Mídia";
  const title = document.createElement("h3");
  title.textContent = item.title;
  body.append(kicker, title);
  if (item.description) {
    const description = document.createElement("p");
    description.className = "media-link-copy";
    description.textContent = item.description;
    body.appendChild(description);
  }
  if (item.url) {
    const link = document.createElement("a");
    link.className = "media-link-action";
    link.href = item.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = item.type === "image" ? "Ver imagem ↗" : "Acessar conteúdo ↗";
    body.appendChild(link);
  }
  article.appendChild(body);
  return article;
}

function sectionElement(id) {
  if (id === "inicio") return document.querySelector("main#inicio > section:first-of-type");
  return document.getElementById(id);
}

function applyMedia(mediaItems = []) {
  const originalLinks = document.querySelector(".media-links");
  if (originalLinks) originalLinks.replaceChildren();
  document.querySelectorAll(".section-media-grid").forEach((grid) => grid.remove());

  const bySection = mediaItems.reduce((groups, item) => {
    (groups[item.section] ||= []).push(item);
    return groups;
  }, {});
  for (const [section, items] of Object.entries(bySection)) {
    if (section === "midia" && originalLinks) {
      items.forEach((item) => originalLinks.appendChild(mediaCard(item)));
      continue;
    }
    const parent = sectionElement(section);
    if (!parent) continue;
    const grid = document.createElement("div");
    grid.className = "section-media-grid";
    grid.setAttribute("aria-label", "Mídias desta seção");
    items.forEach((item) => grid.appendChild(mediaCard(item)));
    parent.appendChild(grid);
  }
}

function reviewCard(review) {
  const article = document.createElement("article");
  article.className = "review-card";
  const stars = document.createElement("div");
  stars.className = "review-stars";
  stars.setAttribute("aria-label", `${review.rating} de 5 estrelas`);
  stars.textContent = "★".repeat(review.rating);
  const quote = document.createElement("blockquote");
  quote.textContent = `“${review.text}”`;
  const footer = document.createElement("footer");
  const name = document.createElement("strong");
  name.textContent = review.name;
  footer.appendChild(name);
  if (review.context) {
    const context = document.createElement("span");
    context.textContent = review.context;
    footer.appendChild(context);
  }
  article.append(stars, quote, footer);
  return article;
}

function applyReviews(reviews = []) {
  const root = document.querySelector("#reviews-widget .reviews-public");
  if (!root || !reviews.length) return;
  root.querySelector(".reviews-empty")?.remove();
  const grid = document.createElement("div");
  grid.className = "reviews-grid";
  reviews.forEach((review) => grid.appendChild(reviewCard(review)));
  root.appendChild(grid);
}

fetch("/api/content", { headers: { Accept: "application/json" } })
  .then((response) => response.ok ? response.json() : Promise.reject())
  .then(({ content }) => {
    applyImages(content.images);
    applyLinks(content.links);
    applyMedia(content.mediaItems);
    applyReviews(content.reviews);
  })
  .catch(() => {});
