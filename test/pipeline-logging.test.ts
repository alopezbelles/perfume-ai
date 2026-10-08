import assert from "node:assert/strict";
import test from "node:test";
import { safePipelineUrlHint, sanitizePipelineError } from "../src/pipeline-storage.ts";

test("sanitizePipelineError redacts API keys, bearer tokens and URL query strings", () => {
  const message = sanitizePipelineError(
    new Error(
      "API_KEY=sk-proj-ABCDEFGHIJKLMNOPQRSTUVWXYZ Authorization: Bearer very-secret-token " +
        "request failed at https://api.example.test/v1/images?access_token=query-secret",
    ),
  );

  assert.match(message, /\[REDACTED/);
  assert.match(message, /https:\/\/api\.example\.test\/v1\/images/);
  assert.doesNotMatch(message, /sk-proj-ABCDEFGHIJKLMNOPQRSTUVWXYZ/);
  assert.doesNotMatch(message, /very-secret-token/);
  assert.doesNotMatch(message, /query-secret/);
  assert.doesNotMatch(message, /access_token=/);
});

test("safePipelineUrlHint omits credentials, query strings and fragments", () => {
  const hint = safePipelineUrlHint(
    "https://user:password@example.test/products/perfume?api_key=private#section",
  );

  assert.equal(hint, "example.test/products/perfume");
  assert.doesNotMatch(hint, /password|private|api_key|section/);
});
