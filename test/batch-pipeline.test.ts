import assert from "node:assert/strict";
import test from "node:test";
import {
  findRunDirectory,
  isHttpUrl,
  parseUrlList,
  runBatch,
  type BatchScript,
} from "../src/batch-pipeline.ts";

const runDirectory = (name: string): string => `data/perfumes/${name}/runs/run-${name}`;
const urlHint = (url: string): string => new URL(url).pathname;

test("parseUrlList trims entries and skips blank lines and comments", () => {
  assert.deepEqual(
    parseUrlList("  # lista de prueba\r\n\r\n https://example.com/a \n\thttps://example.com/b\t\n"),
    ["https://example.com/a", "https://example.com/b"],
  );
});

test("findRunDirectory extracts the scraper marker", () => {
  assert.equal(
    findRunDirectory("Scrape complete\nRUN_DIRECTORY=data/perfumes/test/runs/run-1\n"),
    "data/perfumes/test/runs/run-1",
  );
  assert.equal(findRunDirectory("Scrape complete\n"), undefined);
});

test("isHttpUrl only accepts HTTP and HTTPS URLs with a hostname", () => {
  assert.equal(isHttpUrl("https://example.com/perfume"), true);
  assert.equal(isHttpUrl("http://example.com/perfume"), true);
  assert.equal(isHttpUrl("ftp://example.com/perfume"), false);
  assert.equal(isHttpUrl("not a URL"), false);
});

test("runBatch executes every stage in order for each valid URL", async () => {
  const urls = ["https://example.com/one", "https://example.com/two"];
  const calls: Array<{ script: BatchScript; args: string[] }> = [];
  const runner = async (script: BatchScript, args: string[]) => {
    calls.push({ script, args });
    return {
      exitCode: 0,
      stdout: script === "scraper.ts" ? `RUN_DIRECTORY=${runDirectory(new URL(args[0]).pathname.slice(1))}\n` : "",
    };
  };

  const summary = await runBatch(urls, runner, urlHint);

  assert.deepEqual(calls.map(({ script }) => script), [
    "scraper.ts", "generate-art-direction.ts", "generate-prompts.ts", "generate-images.ts",
    "scraper.ts", "generate-art-direction.ts", "generate-prompts.ts", "generate-images.ts",
  ]);
  assert.deepEqual(summary.successes.map(({ index }) => index), [1, 2]);
  assert.equal(summary.failures.length, 0);
  assert.equal(summary.total, 2);
});

test("runBatch stops a failed perfume at its failing stage and continues the batch", async () => {
  const urls = ["https://example.com/first", "https://example.com/second"];
  const calls: Array<{ script: BatchScript; args: string[] }> = [];
  const runner = async (script: BatchScript, args: string[]) => {
    calls.push({ script, args });
    if (script === "scraper.ts") {
      const name = new URL(args[0]).pathname.slice(1);
      return { exitCode: 0, stdout: `RUN_DIRECTORY=${runDirectory(name)}\n` };
    }
    if (script === "generate-prompts.ts" && args[0] === runDirectory("first")) {
      return { exitCode: 1, stdout: "" };
    }
    return { exitCode: 0, stdout: "" };
  };

  const summary = await runBatch(urls, runner, urlHint);

  assert.deepEqual(summary.failures.map(({ stage, exitCode }) => ({ stage, exitCode })), [
    { stage: "prompts", exitCode: 1 },
  ]);
  assert.deepEqual(summary.successes.map(({ urlHint: hint }) => hint), ["/second"]);
  assert.deepEqual(calls.map(({ script }) => script), [
    "scraper.ts", "generate-art-direction.ts", "generate-prompts.ts",
    "scraper.ts", "generate-art-direction.ts", "generate-prompts.ts", "generate-images.ts",
  ]);
});

test("runBatch records invalid input and continues without running it", async () => {
  const calls: BatchScript[] = [];
  const runner = async (script: BatchScript, args: string[]) => {
    calls.push(script);
    return {
      exitCode: 0,
      stdout: script === "scraper.ts" ? `RUN_DIRECTORY=${runDirectory("valid")}\n` : "",
    };
  };

  const summary = await runBatch(["file:///tmp/invalid", "https://example.com/valid"], runner, (url) => url);

  assert.equal(summary.failures[0]?.stage, "input_validation");
  assert.deepEqual(summary.successes.map(({ index }) => index), [2]);
  assert.deepEqual(calls, [
    "scraper.ts", "generate-art-direction.ts", "generate-prompts.ts", "generate-images.ts",
  ]);
});

test("runBatch records a rejected stage and continues with the next URL", async () => {
  const urls = ["https://example.com/first", "https://example.com/second"];
  const runner = async (script: BatchScript, args: string[]) => {
    if (script === "scraper.ts") {
      const name = new URL(args[0]).pathname.slice(1);
      return { exitCode: 0, stdout: `RUN_DIRECTORY=${runDirectory(name)}\n` };
    }
    if (script === "generate-art-direction.ts" && args[0] === runDirectory("first")) {
      throw new Error("simulated process launch failure");
    }
    return { exitCode: 0, stdout: "" };
  };

  const summary = await runBatch(urls, runner, urlHint);

  assert.deepEqual(summary.failures.map(({ stage, reason }) => ({ stage, reason })), [
    { stage: "art_direction", reason: "simulated process launch failure" },
  ]);
  assert.deepEqual(summary.successes.map(({ urlHint: hint }) => hint), ["/second"]);
});
