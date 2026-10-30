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

test("links perigosos voltam para o destino padrão", () => {
  const content = normalizeContent({
    links: { heroPrimary: { text: "Clique", url: "javascript:alert(1)" } },
  });
  assert.equal(content.links.heroPrimary.url, "#atuacao");
  assert.equal(content.links.heroPrimary.text, "Clique");
});

test("mídias aceitam plataformas externas e descartam itens incompletos", () => {
  const content = normalizeContent({
    mediaItems: [
      { type: "video", section: "psicologia", title: "Entrevista", url: "https://youtube.com/watch?v=123" },
      { type: "podcast", section: "midia", title: "", url: "https://open.spotify.com/show/123" },
    ],
  });
  assert.equal(content.mediaItems.length, 1);
  assert.equal(content.mediaItems[0].section, "psicologia");
});

test("avaliações recebidas ficam separadas das publicadas", () => {
  const content = normalizeContent({
    reviewSubmissions: [{ name: "Visitante", text: "Uma experiência muito positiva e acolhedora.", rating: 5 }],
  });
  assert.equal(content.reviewSubmissions.length, 1);
  assert.equal(content.reviews.length, 0);
});

test("materiais enviados são aceitos na biblioteca", () => {
  const content = normalizeContent({
    mediaItems: [{ type: "material", section: "conteudos", title: "Guia", url: "https://example.com/guia.pdf" }],
  });
  assert.equal(content.mediaItems[0].type, "material");
});
