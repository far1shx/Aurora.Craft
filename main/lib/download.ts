import { mkdir, rm } from "node:fs/promises";
import { dirname } from "node:path";
import type { KyInstance, Progress } from "ky";
import { mirrorUrl } from "~/lib/config.ts";
import { type Logger, createLogger } from "~/lib/logger.ts";
import { formatSpeed, http } from "~/lib/utils.ts";

export interface DownloadProgress {
  transferredBytes: number;
  totalBytes: number;
  percent: number;
  speedBytesPerSecond: number;
  speedPerSecond: string;
}

export interface DownloadOptions {
  onProgress?: (progress: DownloadProgress) => void;
  timeout?: number | false;
  ky?: KyInstance;
  logger?: Logger;
}

const SAMPLE_INTERVAL = 250;
const SPEED_SMOOTHING = 0.3;

const FILE_SINK_BUFFER_THRESHOLD = 1024 * 1024;

export async function download(
  url: string,
  outputPath: string,
  options: DownloadOptions = {},
): Promise<void> {
  const {
    onProgress,
    timeout = false,
    ky: kyInstance = http,
    logger: log = createLogger("download"),
  } = options;

  const downloadUrl = mirrorUrl(url);

  let previousBytes = 0;
  let previousTime = performance.now();
  let speedBytesPerSecond = 0;
  let lastProgressTime = 0;
  let latestProgress: DownloadProgress | undefined;

  const reportProgress = (
    transferredBytes: number,
    totalBytes: number,
    percent: number,
    force = false,
  ): void => {
    const currentTime = performance.now();

    if (!force && currentTime - lastProgressTime < SAMPLE_INTERVAL) {
      return;
    }

    const elapsedSeconds = (currentTime - previousTime) / 1000;

    if (elapsedSeconds > 0) {
      const currentSpeed = Math.max(0, transferredBytes - previousBytes) / elapsedSeconds;

      speedBytesPerSecond =
        speedBytesPerSecond === 0
          ? currentSpeed
          : speedBytesPerSecond * (1 - SPEED_SMOOTHING) + currentSpeed * SPEED_SMOOTHING;
    }

    previousBytes = transferredBytes;
    previousTime = currentTime;
    lastProgressTime = currentTime;

    latestProgress = {
      transferredBytes,
      totalBytes,
      percent,
      speedBytesPerSecond,
      speedPerSecond: formatSpeed(speedBytesPerSecond),
    };

    onProgress?.(latestProgress);
  };

  let response: Response | undefined;

  try {
    log.info(`start download: ${downloadUrl}`);

    response = await kyInstance.get(downloadUrl, {
      timeout,
      onDownloadProgress: ({ percent, transferredBytes, totalBytes }: Progress) => {
        reportProgress(transferredBytes, totalBytes, totalBytes > 0 ? percent * 100 : 0);
      },
    });

    if (!response.body) {
      throw new Error(`the download response has no content: ${downloadUrl}`);
    }

    await mkdir(dirname(outputPath), { recursive: true });

    const writer = Bun.file(outputPath).writer();

    const reader = response.body.getReader();

    let transferredBytes = 0;
    let totalBytes = Number(response.headers.get("content-length")) || 0;
    let pendingBytes = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        const result = writer.write(value);
        pendingBytes += value.byteLength;

        if (result instanceof Promise) {
          await result;
          pendingBytes = 0;
        } else if (pendingBytes >= FILE_SINK_BUFFER_THRESHOLD) {
          await writer.flush();
          pendingBytes = 0;
        }

        transferredBytes += value.byteLength;
      }

      await writer.end();

      totalBytes = totalBytes || transferredBytes;

      reportProgress(transferredBytes, totalBytes, 100, true);

      log.info(`download complete: ${outputPath}`);
    } catch (error) {
      await reader.cancel().catch(() => {});
      await writer.end();

      throw error;
    }
  } catch (error) {
    await rm(outputPath, { force: true }).catch(() => {});

    log.error(`download failed: ${downloadUrl}`);
    throw error;
  }
}

export interface ConcurrencyOptions<T = unknown> {
  /** 总尝试次数（含首次），默认 3 */
  retries?: number;
  /** 基础重试间隔，默认 1000ms */
  delayMs?: number;
  /** 重试间隔上限，默认 30s */
  maxDelayMs?: number;
  onRetry?: (error: unknown, item: T, attempt: number) => void;
  signal?: AbortSignal;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(finish, ms);

    function finish(): void {
      clearTimeout(timer);
      signal?.removeEventListener("abort", finish);
      resolve();
    }

    if (signal?.aborted) {
      finish();
      return;
    }

    signal?.addEventListener("abort", finish, { once: true });
  });
}

export async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, attempt: number) => Promise<void>,
  options: ConcurrencyOptions<NoInfer<T>> = {},
): Promise<void> {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new RangeError("concurrency must be a positive integer");
  }

  const { retries = 3, delayMs = 1000, maxDelayMs = 30_000, onRetry, signal } = options;
  const attempts = Math.max(1, Math.floor(retries));

  let nextIndex = 0;
  let failure: { error: unknown } | undefined;

  // 任一任务失败或外部取消后，其余 worker 在领新任务前停止
  const stopped = (): boolean => failure !== undefined || signal?.aborted === true;

  async function runWorker(): Promise<void> {
    while (!stopped()) {
      const index = nextIndex++;
      if (index >= items.length) return;

      const item = items[index] as T;

      for (let attempt = 1; attempt <= attempts; attempt++) {
        if (stopped()) return;

        try {
          await worker(item, attempt);
          break;
        } catch (error) {
          if (attempt >= attempts || stopped()) {
            failure ??= { error };
            return;
          }

          onRetry?.(error, item, attempt);

          if (delayMs > 0) {
            const backoff = Math.min(delayMs * 2 ** (attempt - 1), maxDelayMs);
            await sleep(backoff * (0.5 + Math.random() * 0.5), signal);
          }
        }
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker()));

  if (failure !== undefined) throw failure.error;
}
