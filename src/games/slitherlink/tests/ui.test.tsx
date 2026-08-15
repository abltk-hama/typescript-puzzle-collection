import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { deleteSlitherlinkSession } from "../data/sessions";
import type { SlitherlinkPuzzle } from "../domain/slitherlink";
import { SlitherlinkGame } from "../ui/SlitherlinkGame";
const puzzle: SlitherlinkPuzzle = {
  id: "slither-ui",
  title: "UI問題",
  difficulty: "easy",
  width: 2,
  height: 2,
  clues: [2, 2, 2, 2],
  solutionEdges: [
    "h:0:0",
    "h:0:1",
    "h:2:0",
    "h:2:1",
    "v:0:0",
    "v:1:0",
    "v:0:2",
    "v:1:2",
  ],
};
it("cycles edges and previews surrounding combinations", async () => {
  await deleteSlitherlinkSession(puzzle.id);
  const user = userEvent.setup();
  render(
    <SlitherlinkGame puzzle={puzzle} onBack={vi.fn()} onLauncher={vi.fn()} />,
  );
  const edge = await screen.findByRole("button", { name: "横辺 1行1列" });
  await waitFor(() => expect(edge).toBeEnabled());
  await user.click(edge);
  expect(edge).toHaveClass("line");
  await user.click(screen.getByRole("button", { name: "1行1列 数字 2" }));
  expect(
    screen.getByRole("button", { name: /周囲候補 .* を採用/ }),
  ).toBeEnabled();
  await user.click(
    screen.getByRole("button", { name: "組み合わせ候補を解除" }),
  );
  expect(
    screen.getByRole("button", { name: "組み合わせ候補を解除" }),
  ).toBeDisabled();
});
it("selects points and applies a route", async () => {
  await deleteSlitherlinkSession(puzzle.id);
  const user = userEvent.setup();
  render(
    <SlitherlinkGame
      puzzle={{ ...puzzle, id: "slither-route-ui" }}
      onBack={vi.fn()}
      onLauncher={vi.fn()}
    />,
  );
  await screen.findByRole("button", { name: "経路入力 OFF" });
  await user.click(screen.getByRole("button", { name: "経路入力 OFF" }));
  await user.click(screen.getByRole("button", { name: "点 1行1列" }));
  await user.click(screen.getByRole("button", { name: "点 2行2列" }));
  expect(screen.getByRole("button", { name: "経路を採用" })).toBeEnabled();
  await user.click(screen.getByRole("button", { name: "経路を採用" }));
  expect(await screen.findByText(/最短経路を線として採用/)).toBeInTheDocument();
});
it("resets all board progress after confirmation", async () => {
  const resetPuzzle = { ...puzzle, id: "slither-reset-ui" };
  await deleteSlitherlinkSession(resetPuzzle.id);
  vi.spyOn(window, "confirm").mockReturnValue(true);
  const user = userEvent.setup();
  render(
    <SlitherlinkGame
      puzzle={resetPuzzle}
      onBack={vi.fn()}
      onLauncher={vi.fn()}
    />,
  );
  const edge = await screen.findByRole("button", { name: "横辺 1行1列" });
  await user.click(edge);
  expect(edge).toHaveClass("line");
  await user.click(screen.getByRole("button", { name: "盤面をリセット" }));
  expect(edge).toHaveClass("unknown");
  expect(await screen.findByText(/最初の状態へリセット/)).toBeInTheDocument();
});
