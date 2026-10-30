import test from "node:test";
import assert from "node:assert/strict";
import { DateTime } from "luxon";
import { buildSlots, normalizeConfig, TIME_ZONE } from "../api/_shared/schedule.js";

test("normaliza uma configuração semanal válida", () => {
  const config = normalizeConfig({
    slotDuration: 60,
    minNoticeHours: 4,
    bookingWindowDays: 60,
    schedule: { 1: [{ start: "09:00", end: "17:00" }] },
  });
  assert.equal(config.schedule[1].length, 1);
  assert.deepEqual(config.schedule[7], []);
});

test("rejeita períodos com término anterior ao início", () => {
  assert.throws(() => normalizeConfig({
    slotDuration: 60,
    minNoticeHours: 4,
    bookingWindowDays: 60,
    schedule: { 1: [{ start: "17:00", end: "09:00" }] },
  }), /Horário inválido/);
});

test("gera slots e remove conflitos da Google Agenda", () => {
  const config = normalizeConfig({
    slotDuration: 60,
    minNoticeHours: 4,
    bookingWindowDays: 60,
    schedule: { 1: [{ start: "09:00", end: "17:00" }] },
  });
  const slots = buildSlots({
    config,
    from: "2026-11-02",
    days: 1,
    now: DateTime.fromISO("2026-11-01T00:00:00", { zone: TIME_ZONE }),
    busy: [{ start: "2026-11-02T10:00:00-03:00", end: "2026-11-02T11:00:00-03:00" }],
  });
  assert.equal(slots.length, 7);
  assert.equal(slots.some((slot) => slot.time === "10:00"), false);
  assert.equal(slots[0].time, "09:00");
});

test("respeita a antecedência mínima", () => {
  const config = normalizeConfig({
    slotDuration: 60,
    minNoticeHours: 4,
    bookingWindowDays: 60,
    schedule: { 1: [{ start: "09:00", end: "17:00" }] },
  });
  const slots = buildSlots({
    config,
    from: "2026-11-02",
    days: 1,
    now: DateTime.fromISO("2026-11-02T08:00:00", { zone: TIME_ZONE }),
  });
  assert.equal(slots[0].time, "12:00");
});
