import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { safePipelineUrlHint, sanitizePipelineError } from "./src/pipeline-storage.ts";
import {
  parseUrlList,
  runBatch,
  type BatchEvent,
  type BatchExecutionResult,
  type BatchScript,
} from "./src/batch-pipeline.ts";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

function loadUrls(args: string[]): string[] {
  if (args.length === 0) {
    throw new Error('Indica una o varias URL o usa --file "data/perfume-urls.txt".');
  }

  const fileIndex = args.indexOf("--file");
  if (fileIndex >= 0) {
    if (args.length !== 2 || fileIndex !== 0 || !args[1]) {
      throw new Error('Usa --file seguido de la ruta de un archivo de texto, por ejemplo: --file "data/perfume-urls.txt".');
    }

    const filePath = path.resolve(projectRoot, args[1]);
    let contents: string;
    try {
      contents = fs.readFileSync(filePath, "utf8");
    } catch {
      throw new Error("No se pudo leer el archivo indicado para la lista de URL.");
    }

    const urls = parseUrlList(contents);
    if (urls.length === 0) {
      throw new Error("El archivo no contiene ninguna URL.");
    }
    return urls;
  }

  if (args.some((arg) => arg.startsWith("--"))) {
    throw new Error("La única opción disponible es --file <ruta>.");
  }
  return args;
}

function runTypeScript(scriptName: BatchScript, args: string[] = []): Promise<BatchExecutionResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ["--import", "tsx", path.join(projectRoot, scriptName), ...args],
      { cwd: projectRoot, stdio: ["inherit", "pipe", "pipe"] },
    );

    let stdout = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
      process.stdout.write(chunk);
    });
    child.stderr.on("data", (chunk: string) => process.stderr.write(chunk));
    child.once("error", reject);
    child.once("close", (code) => resolve({ exitCode: code ?? 1, stdout }));
  });
}

async function main(): Promise<void> {
  let urls: string[];
  try {
    urls = loadUrls(process.argv.slice(2));
  } catch (error) {
    console.error(`[batch] ERROR stage="input": ${sanitizePipelineError(error)}`);
    process.exitCode = 1;
    return;
  }

  const summary = await runBatch(urls, runTypeScript, safePipelineUrlHint, (event: BatchEvent) => {
    if (event.type === "start") {
      console.log(`[batch] START ${event.index}/${event.total} url="${event.urlHint}"`);
      return;
    }

    if (event.type === "success") {
      console.log(`[batch] OK url="${event.success.urlHint}" run="${event.success.runDirectory}"`);
      return;
    }

    const { failure } = event;
    const run = failure.runDirectory ? ` run="${failure.runDirectory}"` : "";
    const exit = failure.exitCode === undefined ? "" : ` exit=${failure.exitCode}`;
    const reason = failure.reason ? ` reason="${sanitizePipelineError(failure.reason)}"` : "";
    console.error(`[batch] ERROR item=${failure.index}/${failure.total} url="${failure.urlHint}" stage="${failure.stage}"${run}${exit}${reason}`);
  });

  console.log(`\n[batch] SUMMARY total=${summary.total} succeeded=${summary.successes.length} failed=${summary.failures.length}`);
  if (summary.failures.length > 0) process.exitCode = 1;
}

const entryPath = process.argv[1];
if (entryPath && import.meta.url === pathToFileURL(path.resolve(entryPath)).href) {
  void main().catch((error) => {
    console.error(`[batch] ERROR stage="batch_runner": ${sanitizePipelineError(error)}`);
    process.exitCode = 1;
  });
}
