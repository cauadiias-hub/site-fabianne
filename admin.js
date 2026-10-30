const DAYS = [
  [1, "Segunda-feira"], [2, "Terça-feira"], [3, "Quarta-feira"],
  [4, "Quinta-feira"], [5, "Sexta-feira"], [6, "Sábado"], [7, "Domingo"],
];

const loginView = document.querySelector("[data-login]");
const dashboard = document.querySelector("[data-dashboard]");
const loginForm = document.querySelector("[data-login-form]");
const scheduleForm = document.querySelector("[data-schedule-form]");
const weekList = document.querySelector("[data-week-list]");
const loginMessage = document.querySelector("[data-login-message]");
const saveMessage = document.querySelector("[data-save-message]");
const contentMessage = document.querySelector("[data-content-message]");
const imagesGrid = document.querySelector("[data-images-grid]");
const reviewsList = document.querySelector("[data-reviews-list]");
const linksList = document.querySelector("[data-links-list]");
const mediaList = document.querySelector("[data-media-list]");
const linksMessage = document.querySelector("[data-links-message]");
const mediaMessage = document.querySelector("[data-media-message]");
let siteContent = { images: {}, reviews: [] };

async function api(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: { Accept: "application/json", ...(options.body && !isFormData ? { "Content-Type": "application/json" } : {}) },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) {
    const error = new Error(data.error || "Não foi possível concluir a operação.");
    error.status = response.status;
    throw error;
  }
  return data;
}

function showLogin(message = "") {
  loginView.hidden = false;
  dashboard.hidden = true;
  loginMessage.textContent = message;
}

async function showDashboard() {
  loginView.hidden = true;
  dashboard.hidden = false;
  saveMessage.textContent = "Carregando disponibilidade…";
  try {
    const [{ config }, contentData] = await Promise.all([
      api("/api/admin/availability"),
      api("/api/admin/content"),
    ]);
    scheduleForm.elements.slotDuration.value = config.slotDuration;
    scheduleForm.elements.minNoticeHours.value = config.minNoticeHours;
    scheduleForm.elements.bookingWindowDays.value = config.bookingWindowDays;
    renderWeek(config.schedule);
    siteContent = contentData.content;
    renderImages(contentData.imageSlots);
    renderLinks(contentData.linkSlots);
    renderMedia(siteContent.mediaItems);
    renderReviews(siteContent.reviews);
    saveMessage.textContent = "";
  } catch (error) {
    if (error.status === 401) return showLogin("Sua sessão expirou. Entre novamente.");
    saveMessage.textContent = error.message;
  }
}

function renderLinks(linkSlots) {
  linksList.innerHTML = "";
  for (const [key, details] of Object.entries(linkSlots)) {
    const content = siteContent.links[key];
    const item = document.createElement("article");
    item.className = "link-editor";
    item.dataset.link = key;
    item.innerHTML = `<strong>${details.label}</strong><label>Texto do botão<input data-link-text maxlength="80"></label><label>Link ou destino<input data-link-url maxlength="2000" placeholder="https://... ou #agendar"></label><label class="check-field"><input data-link-new-tab type="checkbox"><span>Abrir em nova aba</span></label>`;
    item.querySelector("[data-link-text]").value = content.text;
    item.querySelector("[data-link-url]").value = content.url;
    item.querySelector("[data-link-new-tab]").checked = content.newTab;
    linksList.appendChild(item);
  }
}

function readLinks() {
  return Object.fromEntries([...linksList.querySelectorAll(".link-editor")].map((item) => [
    item.dataset.link,
    {
      text: item.querySelector("[data-link-text]").value,
      url: item.querySelector("[data-link-url]").value,
      newTab: item.querySelector("[data-link-new-tab]").checked,
    },
  ]));
}

function mediaElement(media = {}) {
  const item = document.createElement("article");
  item.className = "media-editor";
  item.dataset.id = media.id || crypto.randomUUID();
  item.dataset.imageUrl = media.imageUrl || "";
  item.innerHTML = `<div class="review-editor-head"><strong>Conteúdo de mídia</strong><button class="remove-review" type="button">Remover</button></div><div class="media-editor-grid"><div class="media-cover"><div class="media-cover-preview"></div><label class="file-field"><span>Selecionar imagem ou capa</span><input data-media-file type="file" accept="image/jpeg,image/png,image/webp,image/gif"></label><button class="upload-cover" type="button">Enviar capa</button></div><div class="media-fields"><label>Tipo<select data-media-type><option value="image">Imagem</option><option value="video">Vídeo</option><option value="podcast">Podcast</option><option value="interview">Entrevista</option></select></label><label>Seção do site<select data-media-section><option value="midia">Mídia</option><option value="inicio">Capa</option><option value="sobre">Sobre</option><option value="atuacao">Atuação</option><option value="empresas">Empresas</option><option value="psicologia">Psicologia</option><option value="conteudos">Conteúdos</option><option value="avaliacoes">Avaliações</option><option value="contato">Contato</option></select></label><label class="wide-field">Título<input data-media-title maxlength="120"></label><label class="wide-field">Descrição<textarea data-media-description maxlength="320" rows="3"></textarea></label><label class="wide-field">Link do conteúdo<input data-media-url maxlength="2000" placeholder="https://youtube.com/... ou https://open.spotify.com/..."></label></div></div>`;
  item.querySelector("[data-media-type]").value = media.type || "image";
  item.querySelector("[data-media-section]").value = media.section || "midia";
  item.querySelector("[data-media-title]").value = media.title || "";
  item.querySelector("[data-media-description]").value = media.description || "";
  item.querySelector("[data-media-url]").value = media.url || "";
  const preview = item.querySelector(".media-cover-preview");
  if (media.imageUrl) preview.innerHTML = `<img src="${media.imageUrl}" alt="Prévia da capa">`;
  else preview.textContent = "Sem imagem de capa";
  item.querySelector(".remove-review").addEventListener("click", () => item.remove());
  item.querySelector(".upload-cover").addEventListener("click", () => uploadMediaCover(item));
  return item;
}

function renderMedia(mediaItems) {
  mediaList.innerHTML = "";
  mediaItems.forEach((media) => mediaList.appendChild(mediaElement(media)));
}

async function uploadMediaCover(item) {
  const file = item.querySelector("[data-media-file]").files[0];
  const button = item.querySelector(".upload-cover");
  if (!file) {
    mediaMessage.textContent = "Escolha uma imagem antes de enviar.";
    return;
  }
  button.disabled = true;
  button.textContent = "Enviando…";
  mediaMessage.textContent = "Enviando imagem…";
  try {
    const body = new FormData();
    body.append("image", file);
    const { url } = await api("/api/admin/media-upload", { method: "POST", body });
    item.dataset.imageUrl = url;
    item.querySelector(".media-cover-preview").innerHTML = `<img src="${url}" alt="Prévia da capa">`;
    item.querySelector("[data-media-file]").value = "";
    mediaMessage.className = "message success";
    mediaMessage.textContent = "Imagem enviada. Salve as mídias para publicar.";
  } catch (error) {
    if (error.status === 401) return showLogin("Sua sessão expirou. Entre novamente.");
    mediaMessage.className = "message";
    mediaMessage.textContent = error.message;
  } finally {
    button.disabled = false;
    button.textContent = "Enviar capa";
  }
}

function readMedia() {
  return [...mediaList.querySelectorAll(".media-editor")].map((item) => ({
    id: item.dataset.id,
    type: item.querySelector("[data-media-type]").value,
    section: item.querySelector("[data-media-section]").value,
    title: item.querySelector("[data-media-title]").value,
    description: item.querySelector("[data-media-description]").value,
    url: item.querySelector("[data-media-url]").value,
    imageUrl: item.dataset.imageUrl,
  })).filter((item) => item.title.trim() || item.url.trim() || item.imageUrl);
}

function renderImages(imageSlots) {
  imagesGrid.innerHTML = "";
  for (const [slot, details] of Object.entries(imageSlots)) {
    const form = document.createElement("form");
    form.className = "image-card";
    form.innerHTML = `<img src="${siteContent.images[slot] || details.defaultUrl}" alt="Prévia de ${details.label}"><div><h3>${details.label}</h3><p>Escolha uma nova imagem para substituir a atual.</p></div><label class="file-field"><span>Selecionar imagem</span><input type="file" name="image" accept="image/jpeg,image/png,image/webp" required></label><button type="submit">Enviar imagem</button>`;
    form.addEventListener("submit", (event) => uploadImage(event, slot, form));
    imagesGrid.appendChild(form);
  }
}

async function uploadImage(event, slot, form) {
  event.preventDefault();
  const button = form.querySelector("button[type=submit]");
  const file = form.elements.image.files[0];
  if (!file) return;
  button.disabled = true;
  button.textContent = "Enviando…";
  contentMessage.className = "message";
  contentMessage.textContent = "Enviando a imagem…";
  try {
    const body = new FormData();
    body.append("slot", slot);
    body.append("image", file);
    const { content } = await api("/api/admin/upload", { method: "POST", body });
    siteContent = content;
    form.querySelector("img").src = content.images[slot];
    form.reset();
    contentMessage.className = "message success";
    contentMessage.textContent = "Imagem atualizada com sucesso.";
  } catch (error) {
    if (error.status === 401) return showLogin("Sua sessão expirou. Entre novamente.");
    contentMessage.textContent = error.message;
  } finally {
    button.disabled = false;
    button.textContent = "Enviar imagem";
  }
}

function reviewElement(review = {}) {
  const item = document.createElement("article");
  item.className = "review-editor";
  item.dataset.id = review.id || crypto.randomUUID();
  item.innerHTML = `<div class="review-editor-head"><strong>Avaliação</strong><button class="remove-review" type="button" aria-label="Remover avaliação">Remover</button></div><div class="review-fields"><label>Nome<input data-review-name maxlength="80" required></label><label>Contexto <span>(opcional)</span><input data-review-context maxlength="100" placeholder="Ex.: Atendimento online"></label><label>Nota<select data-review-rating><option value="5">5 estrelas</option><option value="4">4 estrelas</option><option value="3">3 estrelas</option><option value="2">2 estrelas</option><option value="1">1 estrela</option></select></label><label class="review-text-field">Depoimento<textarea data-review-text maxlength="600" rows="5" required></textarea></label></div>`;
  item.querySelector("[data-review-name]").value = review.name || "";
  item.querySelector("[data-review-context]").value = review.context || "";
  item.querySelector("[data-review-rating]").value = String(review.rating || 5);
  item.querySelector("[data-review-text]").value = review.text || "";
  item.querySelector(".remove-review").addEventListener("click", () => item.remove());
  return item;
}

function renderReviews(reviews) {
  reviewsList.innerHTML = "";
  reviews.forEach((review) => reviewsList.appendChild(reviewElement(review)));
  if (!reviews.length) reviewsList.appendChild(reviewElement());
}

function readReviews() {
  return [...reviewsList.querySelectorAll(".review-editor")].map((item) => ({
    id: item.dataset.id,
    name: item.querySelector("[data-review-name]").value,
    context: item.querySelector("[data-review-context]").value,
    rating: Number(item.querySelector("[data-review-rating]").value),
    text: item.querySelector("[data-review-text]").value,
  })).filter((review) => review.name.trim() || review.text.trim());
}

function periodElement(period = { start: "09:00", end: "17:00" }) {
  const row = document.createElement("div");
  row.className = "period";
  row.innerHTML = `<input type="time" data-start required value="${period.start}"><span>até</span><input type="time" data-end required value="${period.end}"><button class="remove-period" type="button" aria-label="Remover período">×</button>`;
  row.querySelector(".remove-period").addEventListener("click", () => row.remove());
  return row;
}

function renderWeek(schedule) {
  weekList.innerHTML = "";
  for (const [number, name] of DAYS) {
    const row = document.createElement("div");
    row.className = "day-row";
    row.dataset.day = number;
    row.innerHTML = `<div class="day-name">${name}</div><div class="periods"><button class="add-period" type="button">+ Adicionar período</button></div>`;
    const periods = row.querySelector(".periods");
    for (const period of schedule[number] || []) periods.insertBefore(periodElement(period), periods.lastElementChild);
    periods.querySelector(".add-period").addEventListener("click", () => periods.insertBefore(periodElement(), periods.lastElementChild));
    weekList.appendChild(row);
  }
}

function readSchedule() {
  const schedule = {};
  for (const [number] of DAYS) {
    const day = weekList.querySelector(`[data-day="${number}"]`);
    schedule[number] = [...day.querySelectorAll(".period")].map((period) => ({
      start: period.querySelector("[data-start]").value,
      end: period.querySelector("[data-end]").value,
    }));
  }
  return schedule;
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = loginForm.querySelector("button");
  button.disabled = true;
  loginMessage.textContent = "Entrando…";
  try {
    await api("/api/admin/login", { method: "POST", body: JSON.stringify({ password: loginForm.elements.password.value }) });
    loginForm.reset();
    await showDashboard();
  } catch (error) {
    loginMessage.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

scheduleForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = document.querySelector("[data-save]");
  button.disabled = true;
  saveMessage.className = "message";
  saveMessage.textContent = "Salvando na Google Agenda…";
  try {
    await api("/api/admin/availability", {
      method: "PUT",
      body: JSON.stringify({
        slotDuration: Number(scheduleForm.elements.slotDuration.value),
        minNoticeHours: Number(scheduleForm.elements.minNoticeHours.value),
        bookingWindowDays: Number(scheduleForm.elements.bookingWindowDays.value),
        schedule: readSchedule(),
      }),
    });
    saveMessage.className = "message success";
    saveMessage.textContent = "Disponibilidade atualizada com sucesso.";
  } catch (error) {
    if (error.status === 401) return showLogin("Sua sessão expirou. Entre novamente.");
    saveMessage.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

document.querySelector("[data-logout]").addEventListener("click", async () => {
  await api("/api/admin/logout", { method: "POST" }).catch(() => {});
  showLogin();
});

document.querySelector("[data-add-review]").addEventListener("click", () => {
  if (reviewsList.children.length >= 12) {
    contentMessage.textContent = "É possível publicar até 12 avaliações.";
    return;
  }
  reviewsList.appendChild(reviewElement());
  reviewsList.lastElementChild.scrollIntoView({ behavior: "smooth", block: "center" });
});

document.querySelector("[data-save-links]").addEventListener("click", async () => {
  const button = document.querySelector("[data-save-links]");
  button.disabled = true;
  linksMessage.className = "message";
  linksMessage.textContent = "Salvando botões e links…";
  try {
    const { content } = await api("/api/admin/content", { method: "PUT", body: JSON.stringify({ links: readLinks() }) });
    siteContent = content;
    linksMessage.className = "message success";
    linksMessage.textContent = "Botões e links atualizados com sucesso.";
  } catch (error) {
    if (error.status === 401) return showLogin("Sua sessão expirou. Entre novamente.");
    linksMessage.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

document.querySelector("[data-add-media]").addEventListener("click", () => {
  if (mediaList.children.length >= 24) {
    mediaMessage.textContent = "É possível publicar até 24 mídias.";
    return;
  }
  mediaList.appendChild(mediaElement());
  mediaList.lastElementChild.scrollIntoView({ behavior: "smooth", block: "center" });
});

document.querySelector("[data-save-media]").addEventListener("click", async () => {
  const button = document.querySelector("[data-save-media]");
  const mediaItems = readMedia();
  if (mediaItems.some((item) => !item.title.trim() || (!item.url.trim() && !item.imageUrl))) {
    mediaMessage.textContent = "Cada mídia precisa de título e de um link ou imagem.";
    return;
  }
  button.disabled = true;
  mediaMessage.className = "message";
  mediaMessage.textContent = "Salvando mídias…";
  try {
    const { content } = await api("/api/admin/content", { method: "PUT", body: JSON.stringify({ mediaItems }) });
    siteContent = content;
    renderMedia(content.mediaItems);
    mediaMessage.className = "message success";
    mediaMessage.textContent = "Mídias publicadas com sucesso.";
  } catch (error) {
    if (error.status === 401) return showLogin("Sua sessão expirou. Entre novamente.");
    mediaMessage.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

document.querySelector("[data-save-reviews]").addEventListener("click", async () => {
  const button = document.querySelector("[data-save-reviews]");
  const reviews = readReviews();
  if (reviews.some((review) => !review.name.trim() || !review.text.trim())) {
    contentMessage.textContent = "Preencha o nome e o depoimento em todas as avaliações.";
    return;
  }
  button.disabled = true;
  contentMessage.className = "message";
  contentMessage.textContent = "Salvando avaliações…";
  try {
    const { content } = await api("/api/admin/content", { method: "PUT", body: JSON.stringify({ reviews }) });
    siteContent = content;
    renderReviews(content.reviews);
    contentMessage.className = "message success";
    contentMessage.textContent = "Avaliações publicadas com sucesso.";
  } catch (error) {
    if (error.status === 401) return showLogin("Sua sessão expirou. Entre novamente.");
    contentMessage.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

api("/api/admin/session")
  .then(({ authenticated }) => authenticated ? showDashboard() : showLogin())
  .catch(() => showLogin("Não foi possível verificar a sessão."));
