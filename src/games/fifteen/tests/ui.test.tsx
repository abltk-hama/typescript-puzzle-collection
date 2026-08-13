import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, expect, it, vi } from "vitest";
import { deleteDB } from "idb";
import { FifteenGame } from "../ui/FifteenGame";
import type { FifteenPuzzle } from "../domain/fifteen";
const puzzle: FifteenPuzzle = {
  id: "ui-fifteen",
  title: "UI問題",
  difficulty: "easy",
  initialTiles: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 0, 15],
  knownSolution: [15],
  metadata: {},
};
beforeAll(async () => deleteDB("puzzle-collection"));
beforeEach(() => localStorage.clear());
it("moves a tile and reports completion", async () => {
  const user = userEvent.setup();
  render(<FifteenGame puzzle={puzzle} onBack={vi.fn()} onLauncher={vi.fn()} />);
  await waitFor(() =>
    expect(
      screen.getByRole("grid", { name: "15パズル盤面" }),
    ).toBeInTheDocument(),
  );
  await user.click(screen.getByRole("button", { name: "駒 15" }));
  expect(screen.getByText(/完成しました/)).toBeInTheDocument();
});
it("focuses a tile without moving it and shows its goal", async () => {
  const user = userEvent.setup();
  render(<FifteenGame puzzle={puzzle} onBack={vi.fn()} onLauncher={vi.fn()} />);
  await waitFor(() => screen.getByRole("grid", { name: "15パズル盤面" }));
  await user.click(screen.getByRole("button", { name: "駒フォーカス" }));
  const tile = screen.getByRole("button", { name: "駒 15" });
  await user.click(tile);
  expect(tile).toHaveClass("focused-tile");
  expect(screen.getByText(/目標位置は 4行3列/)).toBeInTheDocument();
  expect(screen.queryByText(/完成しました/)).not.toBeInTheDocument();
});
it("previews and applies an empty-cell navigation path", async () => {
  const user = userEvent.setup();
  render(<FifteenGame puzzle={puzzle} onBack={vi.fn()} onLauncher={vi.fn()} />);
  await waitFor(() => screen.getByRole("grid", { name: "15パズル盤面" }));
  await user.click(screen.getByRole("button", { name: "空欄移動ナビ" }));
  await user.click(screen.getByRole("button", { name: "駒 15" }));
  expect(
    screen.getByRole("button", { name: "この手順を適用" }),
  ).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "この手順を適用" }));
  expect(screen.getByText(/完成しました/)).toBeInTheDocument();
});
