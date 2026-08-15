/// <reference lib="webworker" />
import { generateSlitherlink } from "./generate";
import type {
  SlitherlinkWorkerRequest,
  SlitherlinkWorkerResponse,
} from "./protocol";
const scope = self as DedicatedWorkerGlobalScope;
scope.onmessage = (event: MessageEvent<SlitherlinkWorkerRequest>) => {
  const request = event.data;
  try {
    const puzzle = generateSlitherlink(request.seed, request.size, (progress) =>
      scope.postMessage({
        type: "progress",
        requestId: request.requestId,
        progress,
      } satisfies SlitherlinkWorkerResponse),
    );
    scope.postMessage({
      type: "complete",
      requestId: request.requestId,
      puzzle,
    } satisfies SlitherlinkWorkerResponse);
  } catch (error) {
    scope.postMessage({
      type: "error",
      requestId: request.requestId,
      message: error instanceof Error ? error.message : "生成に失敗しました。",
    } satisfies SlitherlinkWorkerResponse);
  }
};
