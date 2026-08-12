import type { NonogramPuzzle } from "../domain/nonogram";
export type Request = {
  type: "generate";
  requestId: string;
  seed: number;
  size: 5 | 10;
  profile: "easy" | "medium" | "hard";
};
export type Response =
  | { type: "progress"; requestId: string; progress: number }
  | { type: "complete"; requestId: string; puzzle: NonogramPuzzle }
  | { type: "error"; requestId: string; message: string };
