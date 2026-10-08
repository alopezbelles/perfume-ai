export type BatchScript =
  | "scraper.ts"
  | "generate-art-direction.ts"
  | "generate-prompts.ts"
  | "generate-images.ts";

export type BatchStage =
  | "input_validation"
  | "scrape"
  | "art_direction"
  | "prompts"
  | "image_generation";

export interface BatchExecutionResult {
  exitCode: number;
  stdout: string;
}

export interface BatchFailure {
  index: number;
  total: number;
  urlHint: string;
  stage: BatchStage;
  runDirectory?: string;
  exitCode?: number;
  reason?: string;
}

export interface BatchSuccess {
  index: number;
  total: number;
  urlHint: string;
  runDirectory: string;
}

export interface BatchSummary {
  total: number;
  successes: BatchSuccess[];
  failures: BatchFailure[];
}

export type BatchEvent =
  | { type: "start"; index: number; total: number; urlHint: string }
  | { type: "success"; success: BatchSuccess }
  | { type: "failure"; failure: BatchFailure };

export type BatchScriptRunner = (
  script: BatchScript,
  args: string[],
) => Promise<BatchExecutionResult>;

export function parseUrlList(contents: string): string[] {
  return contents
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
}

export function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return (parsed.protocol === "http:" || parsed.protocol === "https:")
      && parsed.hostname.length > 0;
  } catch {
    return false;
  }
}

export function findRunDirectory(stdout: string): string | undefined {
  const markerLine = stdout
    .split(/\r?\n/)
    .find((line) => line.startsWith("RUN_DIRECTORY="));
  return markerLine?.slice("RUN_DIRECTORY=".length).trim() || undefined;
}

const GENERATION_STAGES: Array<{ stage: BatchStage; script: BatchScript }> = [
  { stage: "art_direction", script: "generate-art-direction.ts" },
  { stage: "prompts", script: "generate-prompts.ts" },
  { stage: "image_generation", script: "generate-images.ts" },
];

export async function runBatch(
  urls: string[],
  runScript: BatchScriptRunner,
  getUrlHint: (url: string) => string,
  onEvent: (event: BatchEvent) => void = () => undefined,
): Promise<BatchSummary> {
  const summary: BatchSummary = { total: urls.length, successes: [], failures: [] };

  const fail = (failure: BatchFailure): void => {
    summary.failures.push(failure);
    onEvent({ type: "failure", failure });
  };

  for (let index = 0; index < urls.length; index += 1) {
    const url = urls[index];
    const urlHint = getUrlHint(url);
    const itemNumber = index + 1;
    onEvent({ type: "start", index: itemNumber, total: urls.length, urlHint });

    if (!isHttpUrl(url)) {
      fail({
        index: itemNumber,
        total: urls.length,
        urlHint,
        stage: "input_validation",
        reason: "Solo se admiten URL HTTP o HTTPS.",
      });
      continue;
    }

    let stage: BatchStage = "scrape";
    let runDirectory: string | undefined;
    try {
      const scrape = await runScript("scraper.ts", [url]);
      if (scrape.exitCode !== 0) {
        fail({ index: itemNumber, total: urls.length, urlHint, stage, exitCode: scrape.exitCode });
        continue;
      }

      runDirectory = findRunDirectory(scrape.stdout);
      if (!runDirectory) {
        fail({
          index: itemNumber,
          total: urls.length,
          urlHint,
          stage,
          reason: "El scraper no indicó la carpeta de ejecución.",
        });
        continue;
      }

      let stageFailed = false;
      for (const nextStage of GENERATION_STAGES) {
        stage = nextStage.stage;
        const result = await runScript(nextStage.script, [runDirectory]);
        if (result.exitCode !== 0) {
          fail({ index: itemNumber, total: urls.length, urlHint, stage, runDirectory, exitCode: result.exitCode });
          stageFailed = true;
          break;
        }
      }
      if (stageFailed) continue;

      const success = { index: itemNumber, total: urls.length, urlHint, runDirectory };
      summary.successes.push(success);
      onEvent({ type: "success", success });
    } catch (error) {
      fail({
        index: itemNumber,
        total: urls.length,
        urlHint,
        stage,
        runDirectory,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return summary;
}
