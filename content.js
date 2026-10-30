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
  material: "Material",
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
  const visualType = item.type === "podcast" ? "podcast" : "video";
  article.className = `media-link-card media-${visualType}-card cms-media-card cms-media-${item.type}`;
  const icon = document.createElement("div");
  icon.className = "media-link-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.innerHTML = item.type === "podcast"
    ? `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 2a5 5 0 0 0-5 5v5a5 5 0 0 0 10 0V7a5 5 0 0 0-5-5Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3M8 22h8"/></svg>`
    : `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="m9 7 7 5-7 5V7Z"/><circle cx="12" cy="12" r="9"/></svg>`;
  article.appendChild(icon);
  const body = document.createElement("div");
  if (item.imageUrl) {
    const image = document.createElement("img");
    image.className = "cms-media-cover";
    image.src = item.imageUrl;
    image.alt = item.title;
    image.loading = "lazy";
    body.appendChild(image);
  }
  if (!item.imageUrl && item.url && item.type === "video" && /\.(mp4|webm)(?:\?|$)/i.test(item.url)) {
    const video = document.createElement("video");
    video.className = "cms-media-cover";
    video.src = item.url;
    video.controls = true;
    video.preload = "metadata";
    body.appendChild(video);
  }
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
  if (item.url && item.type === "podcast" && /\.(mp3|m4a|ogg)(?:\?|$)/i.test(item.url)) {
    const audio = document.createElement("audio");
    audio.src = item.url;
    audio.controls = true;
    audio.preload = "metadata";
    body.appendChild(audio);
  }
  if (item.url) {
    const link = document.createElement("a");
    link.className = "media-link-action";
    link.href = item.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.innerHTML = `${item.type === "image" ? "Ver imagem" : item.type === "material" ? "Abrir material" : "Acessar conteúdo"} <span>↗</span>`;
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

function renderReviewForm() {
  const root = document.querySelector("#reviews-widget .reviews-public");
  if (!root || root.querySelector("[data-public-review-form]")) return;
  const wrapper = document.createElement("div");
  wrapper.className = "public-review-box";
  wrapper.innerHTML = `<div><p class="eyebrow"><span class="eyebrow-line"></span>Sua experiência</p><h3>Deixe sua avaliação</h3><p>Seu relato será enviado para análise e somente aparecerá no site depois da aprovação da Fabiane.</p></div><form data-public-review-form><div class="public-review-fields"><label>Seu nome<input name="name" maxlength="80" required></label><label>Contexto <span>(opcional)</span><input name="context" maxlength="100" placeholder="Ex.: Atendimento online"></label><label>Sua nota<select name="rating"><option value="5">5 estrelas</option><option value="4">4 estrelas</option><option value="3">3 estrelas</option><option value="2">2 estrelas</option><option value="1">1 estrela</option></select></label><label class="public-review-text">Sua avaliação<textarea name="text" minlength="20" maxlength="600" rows="5" required></textarea></label></div><label class="public-review-consent"><input type="checkbox" name="acceptedPrivacy" required><span>Autorizo o envio deste relato para análise e possível publicação no site.</span></label><input class="review-honeypot" name="website" tabindex="-1" autocomplete="off"><div class="public-review-submit"><p role="status"></p><button type="submit">Enviar avaliação</button></div></form>`;
  const form = wrapper.querySelector("form");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = form.querySelector("button");
    const status = form.querySelector("[role=status]");
    const values = new FormData(form);
    button.disabled = true;
    status.textContent = "Enviando sua avaliação…";
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          name: values.get("name"),
          context: values.get("context"),
          rating: Number(values.get("rating")),
          text: values.get("text"),
          website: values.get("website"),
          acceptedPrivacy: values.get("acceptedPrivacy") === "on",
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Não foi possível enviar a avaliação.");
      form.reset();
      status.textContent = "Avaliação enviada! Ela será analisada antes da publicação.";
    } catch (error) {
      status.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });
  root.appendChild(wrapper);
}

fetch("/api/content", { headers: { Accept: "application/json" } })
  .then((response) => response.ok ? response.json() : Promise.reject())
  .then(({ content }) => {
    applyImages(content.images);
    applyLinks(content.links);
    applyMedia(content.mediaItems);
    applyReviews(content.reviews);
  })
  .catch(() => {})
  .finally(renderReviewForm);
