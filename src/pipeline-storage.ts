import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateRunManifest } from "./validation.ts";
import type { PipelineStage, ProductData, RunManifest, RunStageRecord } from "./types.ts";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PERFUMES_ROOT = path.join(PROJECT_ROOT, "data", "perfumes");
const STAGE_NAMES: PipelineStage[] = [
  "scrape",
  "art_direction",
  "prompts",
  "image_editorial",
  "image_surreal",
];

function now(): string {
  return new Date().toISOString();
}

export function normalizePerfumeId(name: string): string {
  const id = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!id) {
    throw new Error("El nombre no produce un ID válido; proporciona un ID explícito con --id.");
  }

  return id;
}

function validateExplicitId(id: string): string {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
    throw new Error("El ID explícito debe contener solo letras minúsculas, números y guiones.");
  }
  return id;
}

function readExistingProductNames(perfumeDirectory: string): string[] {
  const runsDirectory = path.join(perfumeDirectory, "runs");
  if (!fs.existsSync(runsDirectory)) return [];

  const names: string[] = [];
  for (const entry of fs.readdirSync(runsDirectory, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const productPath = path.join(runsDirectory, entry.name, "product.json");
    if (!fs.existsSync(productPath)) continue;

    let value: unknown;
    try {
      value = JSON.parse(fs.readFileSync(productPath, "utf8")) as unknown;
    } catch {
      throw new Error(`No se puede comprobar la identidad del perfume existente en ${productPath}.`);
    }
    if (typeof value !== "object" || value === null || !("name" in value) || typeof value.name !== "string") {
      throw new Error(`No se puede comprobar la identidad del perfume existente en ${productPath}.`);
    }
    names.push(value.name);
  }
  return names;
}

function assertIdDoesNotCollide(perfumeDirectory: string, id: string, name: string): void {
  if (!fs.existsSync(perfumeDirectory)) return;
  const existingNames = readExistingProductNames(perfumeDirectory);
  if (existingNames.length === 0) {
    throw new Error(`Ya existe data/perfumes/${id}, pero no se puede verificar su identidad. Elige otro ID explícito con --id.`);
  }

  const conflictingName = existingNames.find((existingName) => existingName !== name);
  if (conflictingName) {
    throw new Error(
      `El nombre "${name}" colisiona con "${conflictingName}" en el ID "${id}". Vuelve a ejecutar el scraper con un ID único mediante --id.`,
    );
  }
}

function emptyStages(): Record<PipelineStage, RunStageRecord> {
  return Object.fromEntries(STAGE_NAMES.map((stage) => [stage, { status: "pending" }])) as Record<PipelineStage, RunStageRecord>;
}

function writeJsonAtomically(filePath: string, data: unknown): void {
  const temporaryPath = `${filePath}.${randomUUID()}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(temporaryPath, filePath);
}

function manifestPath(runDirectory: string): string {
  return path.join(runDirectory, "manifest.json");
}

function writeManifest(manifest: RunManifest, runDirectory: string): void {
  manifest.updated_at = now();
  validateRunManifest(manifest);
  writeJsonAtomically(manifestPath(runDirectory), manifest);
}

export function createRunDirectory(product: ProductData, explicitId?: string): string {
  const id = explicitId ? validateExplicitId(explicitId) : normalizePerfumeId(product.name);
  const perfumeDirectory = path.join(PERFUMES_ROOT, id);
  assertIdDoesNotCollide(perfumeDirectory, id, product.name);

  const runsDirectory = path.join(perfumeDirectory, "runs");
  fs.mkdirSync(runsDirectory, { recursive: true });

  const timestamp = now().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  let runDirectory = "";
  let runId = "";
  for (let attempt = 0; attempt < 5; attempt += 1) {
    runId = `${timestamp}-${randomUUID().slice(0, 8)}`;
    runDirectory = path.join(runsDirectory, runId);
    try {
      fs.mkdirSync(runDirectory);
      break;
    } catch (error) {
      if (attempt === 4 || !(error instanceof Error) || !("code" in error) || error.code !== "EEXIST") {
        throw error;
      }
    }
  }

  const manifest: RunManifest = {
    schema_version: 1,
    perfume_id: id,
    perfume_name: product.name,
    run_id: runId,
    input_url: product.url,
    status: "running",
    created_at: now(),
    updated_at: now(),
    stages: emptyStages(),
  };
  writeManifest(manifest, runDirectory);
  return runDirectory;
}

export function resolveRunDirectory(runDirectoryArg: string): string {
  const resolved = path.resolve(PROJECT_ROOT, runDirectoryArg);
  const relative = path.relative(PERFUMES_ROOT, resolved);
  const segments = relative.split(path.sep);
  if (relative.startsWith("..") || path.isAbsolute(relative) || segments.length !== 3 || segments[1] !== "runs") {
    throw new Error("Indica la ruta completa de una ejecución dentro de data/perfumes/<id>/runs/<run-id>.");
  }

  const manifest = readRunManifest(resolved);
  if (manifest.perfume_id !== segments[0] || manifest.run_id !== segments[2]) {
    throw new Error("La ruta de ejecución no coincide con perfume_id y run_id de manifest.json.");
  }
  return resolved;
}

export function requireRunDirectory(args = process.argv.slice(2)): string {
  const value = args[0];
  if (!value) {
    throw new Error("Falta la ruta de ejecución. Usa data/perfumes/<id>/runs/<run-id>.");
  }
  return resolveRunDirectory(value);
}

export function hasPipelineFlag(flag: string, args = process.argv.slice(2)): boolean {
  return args.includes(flag);
}

export function readRunManifest(runDirectory: string): RunManifest {
  const filePath = manifestPath(runDirectory);
  if (!fs.existsSync(filePath)) {
    throw new Error(`No existe ${filePath}. Ejecuta primero el scraper para crear la ejecución.`);
  }
  return validateRunManifest(JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown);
}

export function relativePathFromRun(runDirectory: string, projectRelativePath: string): string {
  const absolutePath = path.resolve(PROJECT_ROOT, projectRelativePath);
  const relative = path.relative(runDirectory, absolutePath);
  return relative.split(path.sep).join("/");
}

export function resolveRunReference(runDirectory: string, referencePath: string): string {
  const resolved = path.resolve(runDirectory, referencePath);
  const relative = path.relative(PROJECT_ROOT, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`La ruta de referencia sale del proyecto: ${referencePath}`);
  }
  return resolved;
}

export async function runStage<T>(
  runDirectory: string,
  stageName: PipelineStage,
  output: string,
  operation: () => T | Promise<T>,
  options: { force?: boolean } = {},
): Promise<T | undefined> {
  const manifest = readRunManifest(runDirectory);
  const stage = manifest.stages[stageName];

  const outputPath = path.resolve(runDirectory, output);
  const relativeOutputPath = path.relative(runDirectory, outputPath);
  if (relativeOutputPath.startsWith("..") || path.isAbsolute(relativeOutputPath)) {
    throw new Error(`La salida de la etapa sale de la carpeta de ejecución: ${output}`);
  }

  const outputExists = fs.existsSync(outputPath)
    && fs.statSync(outputPath).isFile()
    && fs.statSync(outputPath).size > 0;
  if (stage.status === "completed" && outputExists && !options.force) {
    console.log(`⏭️ Etapa "${stageName}" ya completada; se conserva ${output}. Usa --force para regenerarla.`);
    return undefined;
  }
  if (stage.status === "failed") {
    console.log(`🔁 Reintentando etapa "${stageName}" que había fallado.`);
  } else if (stage.status === "running") {
    console.log(`🔁 Reanudando etapa "${stageName}" que quedó interrumpida.`);
  } else if (stage.status === "completed" && !outputExists) {
    console.log(`⚠️ La etapa "${stageName}" figura completada, pero falta su salida; se volverá a ejecutar.`);
  }

  stage.status = "running";
  stage.started_at = now();
  delete stage.completed_at;
  delete stage.error;
  stage.output = output;
  manifest.status = "running";
  writeManifest(manifest, runDirectory);

  try {
    const result = await operation();
    stage.status = "completed";
    stage.completed_at = now();
    stage.output = output;
    manifest.status = STAGE_NAMES.some((name) => manifest.stages[name].status === "failed")
      ? "failed"
      : STAGE_NAMES.every((name) => manifest.stages[name].status === "completed")
        ? "completed"
        : "running";
    writeManifest(manifest, runDirectory);
    return result;
  } catch (error) {
    stage.status = "failed";
    stage.completed_at = now();
    const message = error instanceof Error ? error.message : String(error);
    stage.error = message
      .replaceAll(PROJECT_ROOT, ".")
      .replace(/sk-[A-Za-z0-9_-]+/g, "[redacted]")
      .slice(0, 1200);
    manifest.status = "failed";
    writeManifest(manifest, runDirectory);
    throw error;
  }
}
