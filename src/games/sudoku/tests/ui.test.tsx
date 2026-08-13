import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { deleteSudokuSession } from "../data/sessions";
import type { SudokuPuzzle } from "../domain/sudoku";
import { SudokuGame } from "../ui/SudokuGame";

const solution = [
  ..."534678912672195348198342567859761423426853791713924856961537284287419635345286179",
].map(Number);
const givens = [
  ..."530070000600195000098000060800060003400803001700020006060000280000419005000080079",
].map(Number);
const puzzle: SudokuPuzzle = {
  id: "sudoku-ui-assists",
  title: "補助機能テスト",
  difficulty: "easy",
  givens,
  solution,
};

async function renderGame(targetPuzzle = puzzle) {
  await deleteSudokuSession(targetPuzzle.id);
  const user = userEvent.setup(),
    view = render(
      <SudokuGame puzzle={targetPuzzle} onBack={vi.fn()} onLauncher={vi.fn()} />,
    );
  await waitFor(() =>
    expect(screen.getByRole("grid", { name: "数独盤面" })).toBeInTheDocument(),
  );
  return { user, view };
}

it("shows digit counts and focuses every occurrence of a selected digit", async () => {
  const { user, view } = await renderGame();
  expect(screen.getByRole("button", { name: "数字 5" })).toHaveTextContent(
    "3/9",
  );
  await user.click(screen.getByRole("button", { name: /数字フォーカス OFF/ }));
  await user.click(screen.getByRole("gridcell", { name: "1行1列 5" }));
  expect(
    screen.getByRole("button", { name: "数字フォーカス ON：5" }),
  ).toBeInTheDocument();
  expect(view.container.querySelectorAll('[data-focus="digit"]')).toHaveLength(3);
  expect(
    view.container.querySelectorAll('[data-focus="constraint"]').length,
  ).toBeGreaterThan(0);
});

it("presents a logical hint without filling its target cell", async () => {
  const { user, view } = await renderGame();
  const before = screen
    .getAllByRole("gridcell")
    .map((cell) => cell.textContent)
    .join("|");
  await user.click(screen.getByRole("button", { name: "確定候補を探す" }));
  expect(view.container.querySelector('[data-logical="target"]')).not.toBeNull();
  expect(screen.getByText(/このマスだけ|候補は/)).toBeInTheDocument();
  expect(
    screen
      .getAllByRole("gridcell")
      .map((cell) => cell.textContent)
      .join("|"),
  ).toBe(before);
  expect(screen.getByText("ヒント: 1回")).toBeInTheDocument();
});

it("focuses the missing digit when selecting the last empty cell of a unit", async () => {
  const almostComplete: SudokuPuzzle = {
    ...puzzle,
    id: "sudoku-ui-near-complete",
    givens: solution.map((value, index) => (index === 8 ? 0 : value)),
  };
  const { user, view } = await renderGame(almostComplete);
  expect(view.container.querySelector('[data-near="empty"]')).not.toBeNull();
  await user.click(screen.getByRole("gridcell", { name: "1行9列" }));
  expect(
    screen.getByRole("button", { name: "数字フォーカス ON：2" }),
  ).toBeInTheDocument();
  expect(screen.getByText(/不足している数字は2/)).toBeInTheDocument();
});

it("adds candidates as notes and removes invalid notes", async () => {
  const { user } = await renderGame();
  const target = screen.getByRole("gridcell", { name: "1行3列" });
  await user.click(target);
  await user.click(screen.getByRole("button", { name: "候補をメモ" }));
  expect(target).toHaveTextContent("124");
  await user.click(screen.getByRole("button", { name: "メモ OFF" }));
  await user.click(screen.getByRole("button", { name: "数字 5" }));
  expect(screen.getByRole("button", { name: /メモを整理（1）/ })).toBeEnabled();
  await user.click(screen.getByRole("button", { name: /メモを整理（1）/ }));
  expect(target).toHaveTextContent("124");
  expect(screen.getByText("不要なメモを1件削除しました。")).toBeInTheDocument();
});
