import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PokerSetup } from "../ui/PokerSetup";

describe("PokerSetup", () => {
  it("should render setup screen", () => {
    render(
      <PokerSetup
        onStart={() => {}}
        onLauncher={() => {}}
      />
    );
    expect(screen.getByText("ポーカーコレクター")).toBeInTheDocument();
    expect(
      screen.getByText("見えているカードから役を作り、目標得点に達しよう")
    ).toBeInTheDocument();
  });

  it("should show only the random puzzle setup", () => {
    render(
      <PokerSetup
        onStart={() => {}}
        onLauncher={() => {}}
      />
    );
    expect(screen.getByText("ランダム問題")).toBeInTheDocument();
    expect(screen.queryByText("同梱問題")).not.toBeInTheDocument();
  });
});
