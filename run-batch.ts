import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { safePipelineUrlHint, sanitizePipelineError } from "./src/pipeline-storage.ts";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const RUN_DIRECTORY_MARKER = "RUN_DIRECTORY=";

interface ChildResult {
  exitCode: number;
  stdout: string;
}

interface BatchFailure {
  urlHint: string;
  stage: string;
  runDirectory?: string;
}

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

    const urls = contents
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"));
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

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return (parsed.protocol === "http:" || parsed.protocol === "https:")
      && parsed.hostname.length > 0;
  } catch {
    return false;
  }
}

function runTypeScript(scriptName: string, args: string[] = []): Promise<ChildResult> {
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

function findRunDirectory(stdout: string): string | undefined {
  const markerLine = stdout
    .split(/\r?\n/)
    .find((line) => line.startsWith(RUN_DIRECTORY_MARKER));
  return markerLine?.slice(RUN_DIRECTORY_MARKER.length).trim();
}

async function processPerfumeUrl(url: string, index: number, total: number): Promise<BatchFailure | undefined> {
  const urlHint = safePipelineUrlHint(url);
  console.log(`\n[batch] START ${index}/${total} url="${urlHint}"`);

  if (!isHttpUrl(url)) {
    const failure = { urlHint, stage: "input_validation" };
    console.error(`[batch] ERROR url="${urlHint}" stage="${failure.stage}": solo se admiten URL HTTP o HTTPS.`);
    return failure;
  }

  let stage = "scrape";
  let runDirectory: string | undefined;
  try {
    const scrape = await runTypeScript("scraper.ts", [url]);
    if (scrape.exitCode !== 0) {
      console.error(`[batch] ERROR url="${urlHint}" stage="${stage}" exit=${scrape.exitCode}`);
      return { urlHint, stage };
    }

    runDirectory = findRunDirectory(scrape.stdout);
    if (!runDirectory) {
      console.error(`[batch] ERROR url="${urlHint}" stage="${stage}": el scraper no indicó la carpeta de ejecución.`);
      return { urlHint, stage };
    }

    const stages = [
      { name: "art_direction", script: "generate-art-direction.ts" },
      { name: "prompts", script: "generate-prompts.ts" },
      { name: "image_generation", script: "generate-images.ts" },
    ];

    for (const nextStage of stages) {
      stage = nextStage.name;
      const result = await runTypeScript(nextStage.script, [runDirectory]);
      if (result.exitCode !== 0) {
        console.error(`[batch] ERROR url="${urlHint}" run="${runDirectory}" stage="${stage}" exit=${result.exitCode}`);
        return { urlHint, stage, runDirectory };
      }
    }

    console.log(`[batch] OK url="${urlHint}" run="${runDirectory}"`);
    return undefined;
  } catch (error) {
    console.error(`[batch] ERROR url="${urlHint}" run="${runDirectory ?? "sin-ejecución"}" stage="${stage}": ${sanitizePipelineError(error)}`);
    return { urlHint, stage, runDirectory };
  }
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

  const failures: BatchFailure[] = [];
  for (let index = 0; index < urls.length; index += 1) {
    const failure = await processPerfumeUrl(urls[index], index + 1, urls.length);
    if (failure) failures.push(failure);
  }

  const succeeded = urls.length - failures.length;
  console.log(`\n[batch] SUMMARY total=${urls.length} succeeded=${succeeded} failed=${failures.length}`);
  for (const failure of failures) {
    console.error(`[batch] FAILED url="${failure.urlHint}" stage="${failure.stage}"${failure.runDirectory ? ` run="${failure.runDirectory}"` : ""}`);
  }
  if (failures.length > 0) process.exitCode = 1;
}

const entryPath = process.argv[1];
if (entryPath && import.meta.url === pathToFileURL(path.resolve(entryPath)).href) {
  void main().catch((error) => {
    console.error(`[batch] ERROR stage="batch_runner": ${sanitizePipelineError(error)}`);
    process.exitCode = 1;
  });
}
