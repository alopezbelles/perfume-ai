import assert from "node:assert/strict";
import test from "node:test";
import {
  detectGender,
  extractNotes,
  getBottleReference,
  splitNotes,
} from "../src/product-data.ts";

test("splitNotes trims entries and removes empty values", () => {
  assert.deepEqual(splitNotes(" bergamota, , cedro "), ["bergamota", "cedro"]);
});

test("extractNotes reads Spanish note groups and handles CRLF", () => {
  assert.deepEqual(
    extractNotes("Notas de salida: Jengibre, Bergamota\r\nNotas de corazón: Geranio\r\nNotas de fondo: Cedro, Vetiver"),
    { top: ["Jengibre", "Bergamota"], heart: ["Geranio"], base: ["Cedro", "Vetiver"] },
  );
});

test("extractNotes returns empty groups when no notes are present", () => {
  assert.deepEqual(extractNotes("Descripción sin notas"), { top: [], heart: [], base: [] });
});

test("detectGender recognizes Spanish masculine and feminine descriptions", () => {
  assert.equal(detectGender("Perfume masculino para hombre"), "male");
  assert.equal(detectGender("Fragancia femenina para mujer"), "female");
  assert.equal(detectGender("Fragancia unisex"), "unknown");
});

test("gender selects the corresponding bottle reference", () => {
  assert.equal(getBottleReference("male"), "references/bottles/male/bottle-black-cap.png");
  assert.equal(getBottleReference("female"), "references/bottles/female/bottle-gold-cap.png");
  assert.equal(getBottleReference("unknown"), null);
});
