const state = { slots: [], selectedDate: null, selectedSlot: null };

const overlay = document.createElement("div");
overlay.className = "booking-overlay";
overlay.hidden = true;
overlay.innerHTML = `
  <section class="booking-dialog" role="dialog" aria-modal="true" aria-labelledby="booking-title">
    <header class="booking-head">
      <div><small>Agendamento online</small><h2 id="booking-title">Escolha seu horário</h2></div>
      <button class="booking-close" type="button" aria-label="Fechar">×</button>
    </header>
    <div class="booking-body">
      <div class="booking-progress" aria-hidden="true"><span class="active"></span><span></span><span></span></div>
      <div class="booking-panel" data-panel="slots">
        <p class="booking-intro">Os horários abaixo são consultados diretamente na agenda da Fabiane e já desconsideram compromissos existentes.</p>
        <div class="booking-status booking-loading">Buscando horários disponíveis…</div>
        <div class="booking-days"></div>
        <div class="booking-times"></div>
      </div>
      <div class="booking-panel" data-panel="form" hidden>
        <div class="booking-selected"></div>
        <form class="booking-form">
          <div class="booking-field full"><label for="booking-name">Nome completo</label><input id="booking-name" name="name" autocomplete="name" required maxlength="80"></div>
          <div class="booking-field"><label for="booking-email">E-mail</label><input id="booking-email" name="email" type="email" autocomplete="email" required maxlength="120"></div>
          <div class="booking-field"><label for="booking-phone">WhatsApp / telefone</label><input id="booking-phone" name="phone" type="tel" autocomplete="tel" required maxlength="30"></div>
          <div class="booking-honeypot" aria-hidden="true"><label>Site<input name="website" tabindex="-1" autocomplete="off"></label></div>
          <label class="booking-consent"><input name="acceptedPrivacy" type="checkbox" required> <span>Autorizo o uso destes dados exclusivamente para criar e administrar este agendamento na agenda da Fabiane.</span></label>
          <div class="booking-actions"><button class="booking-btn secondary" type="button" data-back>Voltar</button><button class="booking-btn primary" type="submit">Confirmar agendamento</button></div>
        </form>
        <div class="booking-form-error" role="alert"></div>
      </div>
      <div class="booking-panel" data-panel="success" hidden></div>
    </div>
  </section>`;
document.body.appendChild(overlay);

const dialog = overlay.querySelector(".booking-dialog");
const panels = Object.fromEntries([...overlay.querySelectorAll("[data-panel]")].map((el) => [el.dataset.panel, el]));
const progress = [...overlay.querySelectorAll(".booking-progress span")];

function todayInSaoPaulo() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function formatDate(date) {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "short", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}

function showPanel(name) {
  Object.entries(panels).forEach(([key, panel]) => { panel.hidden = key !== name; });
  const active = name === "slots" ? 0 : name === "form" ? 1 : 2;
  progress.forEach((item, index) => item.classList.toggle("active", index <= active));
  dialog.scrollTop = 0;
}

function closeBooking() {
  overlay.hidden = true;
  document.body.style.overflow = "";
}

async function openBooking() {
  state.selectedDate = null;
  state.selectedSlot = null;
  overlay.hidden = false;
  document.body.style.overflow = "hidden";
  showPanel("slots");
  overlay.querySelector(".booking-days").innerHTML = "";
  overlay.querySelector(".booking-times").innerHTML = "";
  const status = overlay.querySelector(".booking-status");
  status.className = "booking-status booking-loading";
  status.textContent = "Buscando horários disponíveis…";
  status.hidden = false;
  try {
    const response = await fetch(`/api/availability?from=${encodeURIComponent(todayInSaoPaulo())}&days=21`, { headers: { Accept: "application/json" } });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || "Não foi possível carregar os horários.");
    state.slots = data.slots;
    renderDays();
  } catch (error) {
    status.className = "booking-status booking-error";
    status.textContent = error.message;
  }
}

function renderDays() {
  const status = overlay.querySelector(".booking-status");
  const days = overlay.querySelector(".booking-days");
  const grouped = new Map();
  state.slots.forEach((slot) => {
    if (!grouped.has(slot.date)) grouped.set(slot.date, []);
    grouped.get(slot.date).push(slot);
  });
  if (!state.slots.length) {
    status.className = "booking-status booking-empty";
    status.textContent = "Não há horários disponíveis nas próximas semanas. Tente novamente mais tarde ou fale com a Fabiane pelo WhatsApp.";
    return;
  }
  status.hidden = true;
  days.innerHTML = "";
  for (const [date, slots] of grouped) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "booking-day";
    button.innerHTML = `<strong>${formatDate(date)}</strong><span>${slots.length} horário${slots.length > 1 ? "s" : ""}</span>`;
    button.addEventListener("click", () => selectDate(date, button));
    days.appendChild(button);
  }
  days.querySelector("button")?.click();
}

function selectDate(date, button) {
  state.selectedDate = date;
  overlay.querySelectorAll(".booking-day").forEach((item) => item.classList.toggle("active", item === button));
  const times = overlay.querySelector(".booking-times");
  times.innerHTML = "";
  state.slots.filter((slot) => slot.date === date).forEach((slot) => {
    const choice = document.createElement("button");
    choice.type = "button";
    choice.className = "booking-time";
    choice.textContent = slot.time;
    choice.addEventListener("click", () => selectSlot(slot));
    times.appendChild(choice);
  });
}

function selectSlot(slot) {
  state.selectedSlot = slot;
  panels.form.querySelector(".booking-selected").textContent = slot.label;
  panels.form.querySelector(".booking-form-error").textContent = "";
  showPanel("form");
  panels.form.querySelector("input")?.focus();
}

overlay.querySelector(".booking-close").addEventListener("click", closeBooking);
overlay.addEventListener("click", (event) => { if (event.target === overlay) closeBooking(); });
overlay.querySelector("[data-back]").addEventListener("click", () => showPanel("slots"));
document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !overlay.hidden) closeBooking(); });

panels.form.querySelector("form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!state.selectedSlot) return;
  const form = event.currentTarget;
  const submit = form.querySelector("[type=submit]");
  const errorBox = panels.form.querySelector(".booking-form-error");
  const values = new FormData(form);
  submit.disabled = true;
  submit.textContent = "Confirmando…";
  errorBox.textContent = "";
  try {
    const response = await fetch("/api/book", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        name: values.get("name"),
        email: values.get("email"),
        phone: values.get("phone"),
        website: values.get("website"),
        acceptedPrivacy: values.get("acceptedPrivacy") === "on",
        start: state.selectedSlot.start,
      }),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || "Não foi possível confirmar.");
    panels.success.innerHTML = `<div class="booking-success"><div class="booking-success-icon">✓</div><h3>Horário confirmado</h3><p>${state.selectedSlot.label}</p><p>O compromisso já foi incluído na agenda da Fabiane.</p><span class="booking-confirmation">Código ${data.confirmation}</span>${data.meetLink ? `<br><a class="booking-meet" href="${data.meetLink}" target="_blank" rel="noopener">Abrir Google Meet</a>` : ""}<div><button class="booking-btn secondary" type="button" data-finish>Fechar</button></div></div>`;
    panels.success.querySelector("[data-finish]").addEventListener("click", closeBooking);
    form.reset();
    showPanel("success");
  } catch (error) {
    errorBox.textContent = error.message;
    if (/não está mais disponível|acabou de ser reservado/i.test(error.message)) setTimeout(openBooking, 1500);
  } finally {
    submit.disabled = false;
    submit.textContent = "Confirmar agendamento";
  }
});

document.addEventListener("click", (event) => {
  const link = event.target.closest("a");
  if (!link || !/agendar/i.test(link.textContent || "")) return;
  event.preventDefault();
  openBooking();
}, true);
