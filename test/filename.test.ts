import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeFilename } from "../src/filename.ts";

test("sanitizeFilename normalizes accents and punctuation", () => {
  assert.equal(sanitizeFilename("Agua de Vetiver (YLY)"), "agua-de-vetiver-yly");
  assert.equal(sanitizeFilename("Pétalos & Madera"), "petalos-madera");
});

test("sanitizeFilename removes leading and trailing separators", () => {
  assert.equal(sanitizeFilename(" -- Perfume -- "), "perfume");
});
