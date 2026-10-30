import { createHash } from "node:crypto";
import { DateTime } from "luxon";
import { fail, json, methodNotAllowed, readJson, safeError } from "./_shared/http.js";
import { calendarId, googleCalendar } from "./_shared/google-calendar.js";
import { availableSlots, TIME_ZONE } from "./_shared/schedule.js";

function text(value, max) {
  return String(value || "").trim().slice(0, max);
}

function eventId(start) {
  return `sf${createHash("sha256").update(`${calendarId()}:${start}`).digest("hex").slice(0, 60)}`;
}

export async function POST(request) {
  try {
    const data = await readJson(request);
    if (data.website) return fail("Não foi possível concluir a reserva.", 400);

    const name = text(data.name, 80);
    const email = text(data.email, 120).toLowerCase();
    const phone = text(data.phone, 30);
    const startRaw = text(data.start, 80);
    if (name.length < 2) return fail("Informe seu nome.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("Informe um e-mail válido.");
    if (phone.length < 8) return fail("Informe um telefone válido.");
    if (data.acceptedPrivacy !== true) return fail("Confirme o uso dos dados para o agendamento.");

    const requested = DateTime.fromISO(startRaw, { setZone: true }).setZone(TIME_ZONE);
    if (!requested.isValid) return fail("Horário inválido.");
    const { config, slots } = await availableSlots({ from: requested.toISODate(), days: 1 });
    const chosen = slots.find((slot) => slot.start === requested.toISO({ suppressMilliseconds: true }));
    if (!chosen) return fail("Este horário não está mais disponível. Escolha outro.", 409);

    const id = eventId(chosen.start);
    const end = requested.plus({ minutes: config.slotDuration });
    const body = {
      id,
      summary: `Agendamento online — ${name}`,
      description: [
        "Reserva realizada pelo site da Fabiane Costa.",
        "",
        `Nome: ${name}`,
        `E-mail: ${email}`,
        `Telefone: ${phone}`,
      ].join("\n"),
      location: "Atendimento online",
      start: { dateTime: requested.toISO({ suppressMilliseconds: true }), timeZone: TIME_ZONE },
      end: { dateTime: end.toISO({ suppressMilliseconds: true }), timeZone: TIME_ZONE },
      extendedProperties: {
        private: { siteFabianeBooking: "v1", clientEmail: email, clientPhone: phone },
      },
      conferenceData: {
        createRequest: { requestId: id, conferenceSolutionKey: { type: "hangoutsMeet" } },
      },
    };

    let event;
    try {
      event = await googleCalendar(`/calendars/${encodeURIComponent(calendarId())}/events`, {
        method: "POST",
        query: { conferenceDataVersion: 1, sendUpdates: "none" },
        body,
      });
    } catch (error) {
      if (error.googleStatus === 409) return fail("Este horário acabou de ser reservado.", 409);
      if (![400, 403].includes(error.googleStatus)) throw error;
      const { conferenceData, ...withoutConference } = body;
      event = await googleCalendar(`/calendars/${encodeURIComponent(calendarId())}/events`, {
        method: "POST",
        query: { sendUpdates: "none" },
        body: withoutConference,
      });
    }

    return json({
      ok: true,
      confirmation: id.slice(-10).toUpperCase(),
      start: chosen.start,
      end: chosen.end,
      meetLink: event.hangoutLink || null,
      message: "Agendamento confirmado na agenda da Fabiane.",
    }, 201);
  } catch (error) {
    return safeError(error, "booking_error");
  }
}

export default {
  fetch(request) {
    return request.method === "POST" ? POST(request) : methodNotAllowed("POST");
  },
};