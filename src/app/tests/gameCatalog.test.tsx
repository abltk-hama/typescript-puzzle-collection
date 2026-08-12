import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import App from "../../App";
import { GameFlow } from "../GameFlow";
import { findGame, gameCatalog } from "../gameCatalog";

describe("game catalog", () => {
  it("has unique registrations for every implemented game", () => {
    expect(gameCatalog.map((game) => game.id)).toEqual([
      "lights_out",
      "fifteen",
      "mastermind",
      "maze",
      "sudoku",
    ]);
    expect(new Set(gameCatalog.map((game) => game.id)).size).toBe(
      gameCatalog.length,
    );
    expect(findGame("mastermind")?.displayName).toBe("マスターマインド");
  });
  it("builds launcher cards from registrations", () => {
    render(<App />);
    for (const game of gameCatalog)
      expect(
        screen.getByRole("button", { name: new RegExp(game.displayName) }),
      ).toBeInTheDocument();
  });
});

it("keeps game-specific puzzle types inside the common flow", async () => {
  interface Puzzle {
    id: number;
  }
  const load = vi.fn(async () => [{ id: 7 }]),
    launcher = vi.fn(),
    user = userEvent.setup();
  function Setup({
    puzzles,
    onStart,
  }: {
    puzzles: Puzzle[];
    onStart: (puzzle: Puzzle) => void;
  }) {
    return (
      <button onClick={() => onStart(puzzles[0])}>問題 {puzzles[0]?.id}</button>
    );
  }
  function Game({ puzzle, onBack }: { puzzle: Puzzle; onBack: () => void }) {
    return <button onClick={onBack}>盤面 {puzzle.id}</button>;
  }
  render(
    <GameFlow
      loadPuzzles={load}
      Setup={Setup}
      Game={Game}
      onLauncher={launcher}
    />,
  );
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "問題 7" })).toBeInTheDocument(),
  );
  await user.click(screen.getByRole("button", { name: "問題 7" }));
  expect(screen.getByRole("button", { name: "盤面 7" })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "盤面 7" }));
  expect(screen.getByRole("button", { name: "問題 7" })).toBeInTheDocument();
});
