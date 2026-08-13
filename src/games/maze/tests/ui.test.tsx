import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { generateMaze } from "../generation/generate";
import { MazeGame } from "../ui/MazeGame";
import { deleteMazeSession } from "../data/sessions";
beforeEach(() => localStorage.clear());
it("shows a hint and moves to its cell", async () => {
  const puzzle = generateMaze(9, "small"),
    user = userEvent.setup();
  render(<MazeGame puzzle={puzzle} onBack={vi.fn()} onLauncher={vi.fn()} />);
  await waitFor(() =>
    expect(
      screen.getByRole("grid", { name: "迷路拡大図" }),
    ).toBeInTheDocument(),
  );
  await user.click(screen.getByRole("button", { name: "次に進むマスを表示" }));
  const target = puzzle.answerPath[1];
  await user.click(
    screen
      .getByRole("grid", { name: "迷路拡大図" })
      .querySelector(
        `[aria-label^="${target.row + 1}行${target.column + 1}列"]`,
      )!,
  );
  expect(screen.getByText("実手数: 1")).toBeInTheDocument();
});
it("can be played with the touch-friendly direction pad", async () => {
  const puzzle = generateMaze(11, "small"),
    user = userEvent.setup();
  await deleteMazeSession(puzzle.id);
  render(<MazeGame puzzle={puzzle} onBack={vi.fn()} onLauncher={vi.fn()} />);
  await waitFor(() =>
    expect(
      screen.getByRole("grid", { name: "迷路拡大図" }),
    ).toBeInTheDocument(),
  );
  await user.click(screen.getByRole("button", { name: /補助設定を開く/ }));
  await user.click(screen.getByRole("checkbox", { name: /分岐間の自動進行/ }));
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
  expect(screen.getByText(`実手数: ${initialMoves + 1}`)).toBeInTheDocument();
});
it("previews a branch without adding real moves", async () => {
  const puzzle = generateMaze(12, "small"),
    user = userEvent.setup();
  await deleteMazeSession(puzzle.id);
  render(<MazeGame puzzle={puzzle} onBack={vi.fn()} onLauncher={vi.fn()} />);
  await waitFor(() => screen.getByRole("grid", { name: "迷路拡大図" }));
  const before = screen.getByText(/実手数:/).textContent;
  const choice = screen.getAllByRole("button", { name: /へ（\d+マス）/ })[0];
  await user.click(choice);
  expect(screen.getByText(/試行: 1回/)).toBeInTheDocument();
  expect(screen.getByText(/実手数:/).textContent).toBe(before);
  expect(
    screen.getByRole("button", { name: "この経路を確定" }),
  ).toBeInTheDocument();
});
