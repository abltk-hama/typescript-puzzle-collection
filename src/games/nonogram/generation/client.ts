import type { NonogramPuzzle } from "../domain/nonogram";
import type { Response } from "./protocol";
export interface GenerationTask {
  promise: Promise<NonogramPuzzle>;
  cancel: () => void;
}
export function startGeneration(
  size: 5 | 10,
  profile: "easy" | "medium" | "hard",
  onProgress: (n: number) => void,
  timeoutMs = 30000,
): GenerationTask {
  const worker = new Worker(new URL("./nonogram.worker.ts", import.meta.url), {
      type: "module",
    }),
    requestId = crypto.randomUUID();
  let rejectTask: (error: Error) => void = () => {};
  const promise = new Promise<NonogramPuzzle>((resolve, reject) => {
    rejectTask = reject;
    const timer = setTimeout(() => {
      worker.terminate();
      reject(new Error("生成がタイムアウトしました。もう一度お試しください。"));
    }, timeoutMs);
    worker.onmessage = (event: MessageEvent<Response>) => {
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
      profile,
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
