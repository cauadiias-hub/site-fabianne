const IMAGE_DEFAULTS = {
  logo: "/images/fabiane-andre-costa-logo_31ab3a8e.jpeg",
  hero: "/images/fabiane-retrato-azul_a8971b37.jpeg",
  about: "/images/fabiane-retrato-preto_7c7cb604.jpeg",
  psychology: "/images/fabiane-retrato-bege_31855530.jpeg",
  companies: "/images/fabiane-reuniao-empresas_31340631.png",
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
  .then(({ content }) => { applyImages(content.images); applyReviews(content.reviews); })
  .catch(() => {});
