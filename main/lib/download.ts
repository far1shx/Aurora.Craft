import { mkdir, rm } from "node:fs/promises";
import { dirname } from "node:path";
import type { KyInstance, Progress } from "ky";
import { logger } from "mirinjs";
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
  logger?: typeof logger;
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
    logger: log = logger.child("download"),
  } = options;

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
    log.info(`start download: ${url}`);

    response = await kyInstance.get(url, {
      timeout,
      onDownloadProgress: ({ percent, transferredBytes, totalBytes }: Progress) => {
        reportProgress(transferredBytes, totalBytes, totalBytes > 0 ? percent * 100 : 0);
      },
    });

    if (!response.body) {
      throw new Error(`the download response has no content: ${url}`);
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

    log.error(`download failed: ${url}`);
    throw error;
  }
}

export interface ConcurrencyOptions<T = unknown> {
  retries?: number;
  delayMs?: number;
  onRetry?: (error: unknown, item: T, attempt: number) => void;
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

  const { retries = 3, delayMs = 1000, onRetry } = options;
  let nextIndex = 0;

  async function runWorker(): Promise<void> {
    while (true) {
      const index = nextIndex++;

      if (index >= items.length) return;

      const item = items[index]!;
      let lastError: unknown;

      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          await worker(item, attempt);
          lastError = undefined;
          break;
        } catch (error) {
          lastError = error;
          if (attempt >= retries) {
            break;
          }
          onRetry?.(error, item, attempt);
          if (delayMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
          }
        }
      }

      if (lastError !== undefined) {
        throw lastError;
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker()));
}
