import { json, methodNotAllowed, safeError } from "./_shared/http.js";
import { availableSlots, TIME_ZONE } from "./_shared/schedule.js";

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const from = url.searchParams.get("from") || new Intl.DateTimeFormat("en-CA", {
      timeZone: TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const days = Number(url.searchParams.get("days") || 14);
    const { config, slots } = await availableSlots({ from, days });
    return json({
      ok: true,
      timezone: TIME_ZONE,
      slotDuration: config.slotDuration,
      minNoticeHours: config.minNoticeHours,
      bookingWindowDays: config.bookingWindowDays,
      slots,
    }, 200, { "Cache-Control": "private, max-age=30" });
  } catch (error) {
    return safeError(error, "availability_error");
  }
}

export default {
  fetch(request) {
    return request.method === "GET" ? GET(request) : methodNotAllowed("GET");
  },
};