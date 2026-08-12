/// <reference lib="webworker" />
import { generateNonogram } from "./generate";
import type { Request, Response } from "./protocol";
const scope = self as DedicatedWorkerGlobalScope;
scope.onmessage = (event: MessageEvent<Request>) => {
  const request = event.data;
  try {
    const puzzle = generateNonogram(
      request.seed,
      request.size,
      request.profile,
      (progress) =>
        scope.postMessage({
          type: "progress",
          requestId: request.requestId,
          progress,
        } satisfies Response),
    );
    scope.postMessage({
      type: "complete",
      requestId: request.requestId,
      puzzle,
    } satisfies Response);
  } catch (error) {
    scope.postMessage({
      type: "error",
      requestId: request.requestId,
      message: error instanceof Error ? error.message : "生成に失敗しました。",
    } satisfies Response);
  }
};
