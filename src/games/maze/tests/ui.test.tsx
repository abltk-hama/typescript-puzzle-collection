import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { generateMaze } from "../generation/generate";
import { MazeGame } from "../ui/MazeGame";
import { deleteMazeSession } from "../data/sessions";
it("shows a hint and moves to its cell", async () => {
  const puzzle = generateMaze(9, "easy"),
    user = userEvent.setup();
  render(<MazeGame puzzle={puzzle} onBack={vi.fn()} onLauncher={vi.fn()} />);
  await waitFor(() =>
    expect(screen.getByRole("grid", { name: "迷路盤面" })).toBeInTheDocument(),
  );
  await user.click(screen.getByRole("button", { name: "次に進むマスを表示" }));
  const target = puzzle.answerPath[1];
  await user.click(
    screen.getByRole("gridcell", {
      name: new RegExp(`${target.row + 1}行${target.column + 1}列`),
    }),
  );
  expect(screen.getByText("手数: 1")).toBeInTheDocument();
});
it("can be played with the touch-friendly direction pad", async () => {
  const puzzle = generateMaze(11, "easy"),
    user = userEvent.setup();
  await deleteMazeSession(puzzle.id);
  render(<MazeGame puzzle={puzzle} onBack={vi.fn()} onLauncher={vi.fn()} />);
  await waitFor(() =>
    expect(screen.getByRole("grid", { name: "迷路盤面" })).toBeInTheDocument(),
  );
  const initialMoves = Number(
    screen.getByText(/手数:/).textContent?.match(/\d+/)?.[0] ?? 0,
  );
  const start = puzzle.answerPath[0],
    target = puzzle.answerPath[1],
    label =
      target.row < start.row
        ? "上へ進む"
        : target.row > start.row
          ? "下へ進む"
          : target.column < start.column
            ? "左へ進む"
            : "右へ進む";
  await user.click(screen.getByRole("button", { name: label }));
  expect(screen.getByText(`手数: ${initialMoves + 1}`)).toBeInTheDocument();
});
