import type { SlitherlinkPuzzle } from "../domain/slitherlink";
export type SlitherlinkWorkerRequest = {
  type: "generate";
  requestId: string;
  seed: number;
  size: 5 | 7 | 10;
};
export type SlitherlinkWorkerResponse =
  | { type: "progress"; requestId: string; progress: number }
  | { type: "complete"; requestId: string; puzzle: SlitherlinkPuzzle }
  | { type: "error"; requestId: string; message: string };
