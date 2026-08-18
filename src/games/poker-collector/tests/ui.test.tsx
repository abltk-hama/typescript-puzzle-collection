import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createCard } from "../../../common/cards";
import type { PokerCollectorPuzzle } from "../domain/pokerHandTypes";
import { PokerSetup } from "../ui/PokerSetup";

describe("PokerSetup", () => {
  const mockPuzzles: PokerCollectorPuzzle[] = [
    {
      id: "test_1",
      title: "Test Puzzle 1",
      difficulty: "easy",
      cardsLayout: Array(25).fill(createCard("♠", "A")),
      targetScore: 300,
      allowedRetries: 5,
    },
  ];

  it("should render setup screen", () => {
    render(
      <PokerSetup
        puzzles={mockPuzzles}
        onStart={() => {}}
        onLauncher={() => {}}
      />
    );
    expect(screen.getByText("ポーカーコレクター")).toBeInTheDocument();
    expect(
      screen.getByText("見えているカードから役を作り、目標得点に達しよう")
    ).toBeInTheDocument();
  });

  it("should show puzzle title", () => {
    render(
      <PokerSetup
        puzzles={mockPuzzles}
        onStart={() => {}}
        onLauncher={() => {}}
      />
    );
    expect(screen.getByText("Test Puzzle 1")).toBeInTheDocument();
  });
});