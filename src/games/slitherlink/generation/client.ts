import type { SlitherlinkPuzzle } from "../domain/slitherlink";
import type { SlitherlinkWorkerResponse } from "./protocol";
export interface GenerationTask {
  promise: Promise<SlitherlinkPuzzle>;
  cancel: () => void;
}
export function startSlitherlinkGeneration(
  size: 5 | 7 | 10,
  onProgress: (progress: number) => void,
  timeoutMs = 90000,
): GenerationTask {
  const worker = new Worker(
      new URL("./slitherlink.worker.ts", import.meta.url),
      { type: "module" },
    ),
    requestId = crypto.randomUUID();
  let rejectTask: (reason: Error) => void = () => {};
  const promise = new Promise<SlitherlinkPuzzle>((resolve, reject) => {
    rejectTask = reject;
    const timer = setTimeout(() => {
      worker.terminate();
      reject(new Error("生成がタイムアウトしました。もう一度お試しください。"));
    }, timeoutMs);
    worker.onmessage = (event: MessageEvent<SlitherlinkWorkerResponse>) => {
      const message = event.data;
      if (message.requestId !== requestId) return;
      if (message.type === "progress") onProgress(message.progress);
      else {
        clearTimeout(timer);
        worker.terminate();
        if (message.type === "complete") resolve(message.puzzle);
        else reject(new Error(message.message));
      }
    };
    worker.onerror = () => {
      clearTimeout(timer);
      worker.terminate();
      reject(new Error("生成Workerでエラーが発生しました。"));
    };
    worker.postMessage({
      type: "generate",
      requestId,
      seed: Date.now() >>> 0,
      size,
    });
  });
  return {
    promise,
    cancel: () => {
      worker.terminate();
      rejectTask(new Error("生成をキャンセルしました。"));
    },
  };
}
