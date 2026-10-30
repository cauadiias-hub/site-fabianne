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

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: { Accept: "application/json", ...(options.body ? { "Content-Type": "application/json" } : {}) },
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
    const { config } = await api("/api/admin/availability");
    scheduleForm.elements.slotDuration.value = config.slotDuration;
    scheduleForm.elements.minNoticeHours.value = config.minNoticeHours;
    scheduleForm.elements.bookingWindowDays.value = config.bookingWindowDays;
    renderWeek(config.schedule);
    saveMessage.textContent = "";
  } catch (error) {
    if (error.status === 401) return showLogin("Sua sessão expirou. Entre novamente.");
    saveMessage.textContent = error.message;
  }
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

api("/api/admin/session")
  .then(({ authenticated }) => authenticated ? showDashboard() : showLogin())
  .catch(() => showLogin("Não foi possível verificar a sessão."));
