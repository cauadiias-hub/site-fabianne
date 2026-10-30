import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CONTENT, normalizeContent } from "../api/_shared/content.js";

test("conteúdo usa imagens padrão quando não há personalização", () => {
  assert.deepEqual(normalizeContent({}), DEFAULT_CONTENT);
});

test("avaliações são validadas e limitadas", () => {
  const reviews = Array.from({ length: 14 }, (_, index) => ({
    id: `item-${index}`,
    name: `Pessoa ${index}`,
    context: "Atendimento online",
    text: "Um relato autorizado.",
    rating: 8,
  }));
  const content = normalizeContent({ reviews });
  assert.equal(content.reviews.length, 12);
  assert.equal(content.reviews[0].rating, 5);
});

test("avaliações vazias não são publicadas", () => {
  const content = normalizeContent({ reviews: [{ name: "", text: "" }] });
  assert.deepEqual(content.reviews, []);
});
