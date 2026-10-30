import { DateTime, Interval } from "luxon";
import { calendarId, getBusy, googleCalendar } from "./google-calendar.js";

export const TIME_ZONE = "America/Sao_Paulo";
export const CONFIG_EVENT_ID = "sitefabianeconfigv1";

export const DEFAULT_CONFIG = Object.freeze({
  slotDuration: 60,
  minNoticeHours: 4,
  bookingWindowDays: 60,
  schedule: {
    1: [{ start: "09:00", end: "17:00" }],
    2: [{ start: "09:00", end: "17:00" }],
    3: [{ start: "09:00", end: "17:00" }],
    4: [{ start: "09:00", end: "17:00" }],
    5: [{ start: "09:00", end: "17:00" }],
    6: [],
    7: [],
  },
});

const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export function normalizeConfig(input = {}) {
  const slotDuration = Number(input.slotDuration);
  const minNoticeHours = Number(input.minNoticeHours);
  const bookingWindowDays = Number(input.bookingWindowDays);
  if (![30, 45, 60, 90, 120].includes(slotDuration)) {
    throw Object.assign(new Error("Duração de atendimento inválida."), { status: 400 });
  }
  if (!Number.isFinite(minNoticeHours) || minNoticeHours < 0 || minNoticeHours > 168) {
    throw Object.assign(new Error("Antecedência mínima inválida."), { status: 400 });
  }
  if (!Number.isInteger(bookingWindowDays) || bookingWindowDays < 7 || bookingWindowDays > 180) {
    throw Object.assign(new Error("Janela de agendamento inválida."), { status: 400 });
  }

  const schedule = {};
  for (let weekday = 1; weekday <= 7; weekday += 1) {
    const periods = Array.isArray(input.schedule?.[weekday]) ? input.schedule[weekday] : [];
    schedule[weekday] = periods.map((period) => {
      const start = String(period.start || "");
      const end = String(period.end || "");
      if (!TIME_PATTERN.test(start) || !TIME_PATTERN.test(end) || start >= end) {
        throw Object.assign(new Error(`Horário inválido no dia ${weekday}.`), { status: 400 });
      }
      return { start, end };
    });
  }
  return { slotDuration, minNoticeHours, bookingWindowDays, schedule };
}

function encodeConfig(config) {
  return Buffer.from(JSON.stringify(config)).toString("base64url");
}

function decodeConfig(value) {
  return normalizeConfig(JSON.parse(Buffer.from(value, "base64url").toString("utf8")));
}

export async function loadConfig() {
  const id = calendarId();
  try {
    const event = await googleCalendar(`/calendars/${encodeURIComponent(id)}/events/${CONFIG_EVENT_ID}`);
    const encoded = event.extendedProperties?.private?.siteFabianeConfig;
    return encoded ? decodeConfig(encoded) : structuredClone(DEFAULT_CONFIG);
  } catch (error) {
    if (error.googleStatus === 404) return structuredClone(DEFAULT_CONFIG);
    throw error;
  }
}

export async function saveConfig(input) {
  const config = normalizeConfig(input);
  const id = calendarId();
  const event = {
    id: CONFIG_EVENT_ID,
    summary: "Configuração do agendamento do site (não excluir)",
    description: "Este evento privado guarda os horários configurados no painel administrativo do site.",
    start: { date: "2000-01-01" },
    end: { date: "2000-01-02" },
    transparency: "transparent",
    extendedProperties: { private: { siteFabianeConfig: encodeConfig(config) } },
  };
  const collectionPath = `/calendars/${encodeURIComponent(id)}/events`;
  try {
    await googleCalendar(collectionPath, {
      method: "POST",
      query: { sendUpdates: "none" },
      body: event,
    });
  } catch (error) {
    if (error.googleStatus !== 409) throw error;
    await googleCalendar(`${collectionPath}/${CONFIG_EVENT_ID}`, {
      method: "PUT",
      query: { sendUpdates: "none" },
      body: event,
    });
  }
  return config;
}

function overlapsBusy(start, end, busy) {
  const slot = Interval.fromDateTimes(start, end);
  return busy.some((period) => {
    const busyStart = DateTime.fromISO(period.start, { setZone: true });
    const busyEnd = DateTime.fromISO(period.end, { setZone: true });
    return slot.overlaps(Interval.fromDateTimes(busyStart, busyEnd));
  });
}

export function buildSlots({ config, from, days, busy = [], now = DateTime.now().setZone(TIME_ZONE) }) {
  const startDay = DateTime.fromISO(from, { zone: TIME_ZONE }).startOf("day");
  if (!startDay.isValid) throw Object.assign(new Error("Data inicial inválida."), { status: 400 });
  const requestedDays = Math.min(Math.max(Number(days) || 14, 1), 31);
  const lastBookable = now.plus({ days: config.bookingWindowDays }).endOf("day");
  const earliest = now.plus({ hours: config.minNoticeHours });
  const slots = [];

  for (let offset = 0; offset < requestedDays; offset += 1) {
    const day = startDay.plus({ days: offset });
    for (const period of config.schedule[day.weekday] || []) {
      let cursor = DateTime.fromISO(`${day.toISODate()}T${period.start}`, { zone: TIME_ZONE });
      const periodEnd = DateTime.fromISO(`${day.toISODate()}T${period.end}`, { zone: TIME_ZONE });
      while (cursor.plus({ minutes: config.slotDuration }) <= periodEnd) {
        const end = cursor.plus({ minutes: config.slotDuration });
        if (cursor >= earliest && cursor <= lastBookable && !overlapsBusy(cursor, end, busy)) {
          slots.push({
            start: cursor.toISO({ suppressMilliseconds: true }),
            end: end.toISO({ suppressMilliseconds: true }),
            date: cursor.toISODate(),
            time: cursor.toFormat("HH:mm"),
            label: cursor.setLocale("pt-BR").toFormat("cccc, dd 'de' LLLL 'às' HH:mm"),
          });
        }
        cursor = end;
      }
    }
  }
  return slots;
}

export async function availableSlots({ from, days = 14, now }) {
  const config = await loadConfig();
  const start = DateTime.fromISO(from, { zone: TIME_ZONE }).startOf("day");
  if (!start.isValid) throw Object.assign(new Error("Data inicial inválida."), { status: 400 });
  const requestedDays = Math.min(Math.max(Number(days) || 14, 1), 31);
  const end = start.plus({ days: requestedDays });
  const busy = await getBusy(start.toUTC().toISO(), end.toUTC().toISO());
  return { config, slots: buildSlots({ config, from, days: requestedDays, busy, ...(now ? { now } : {}) }) };
}
