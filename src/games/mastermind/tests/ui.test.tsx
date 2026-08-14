import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, expect, it, vi } from "vitest";
import { deleteDB } from "idb";
import { MastermindGame } from "../ui/MastermindGame";
import type { MastermindPuzzle } from "../domain/mastermind";
const puzzle: MastermindPuzzle = {
  id: "ui-mastermind",
  title: "UI問題",
  difficulty: "easy",
  codeLength: 4,
  symbolCount: 6,
  allowDuplicates: false,
  maxAttempts: 10,
  secret: [1, 2, 3, 4],
  metadata: {},
};
beforeAll(async () => deleteDB("puzzle-collection"));
beforeEach(() => localStorage.clear());
it("enters and submits a winning guess", async () => {
  const user = userEvent.setup();
  render(
    <MastermindGame puzzle={puzzle} onBack={vi.fn()} onLauncher={vi.fn()} />,
  );
  await waitFor(() =>
    expect(screen.getByLabelText("入力位置 1")).toBeInTheDocument(),
  );
  for (const value of [1, 2, 3, 4])
    await user.click(screen.getByRole("button", { name: `数字 ${value}` }));
  await user.click(screen.getByRole("button", { name: "この予想を判定" }));
  expect(screen.getByText(/正解です/)).toBeInTheDocument();
});
it("records position notes without changing the current guess", async () => {
  const user = userEvent.setup();
  render(
    <MastermindGame puzzle={puzzle} onBack={vi.fn()} onLauncher={vi.fn()} />,
  );
  await waitFor(() => screen.getByLabelText("入力位置 1"));
  await user.click(screen.getByRole("button", { name: /位置候補メモ OFF/ }));
  await user.click(screen.getByRole("button", { name: "数字 2" }));
  expect(screen.getByLabelText("入力位置 1")).toHaveTextContent("2");
  expect(screen.getByLabelText("入力位置 1")).toHaveTextContent("?");
});
it("selects history for staged organization and adds its colors to every position", async () => {
  const user = userEvent.setup();
  const organizationPuzzle = { ...puzzle, id: "ui-mastermind-organization" };
  render(
    <MastermindGame
      puzzle={organizationPuzzle}
      onBack={vi.fn()}
      onLauncher={vi.fn()}
    />,
  );
  await waitFor(() => screen.getByLabelText("入力位置 1"));
  for (const value of [1, 2, 3, 5])
    await user.click(screen.getByRole("button", { name: `数字 ${value}` }));
  await user.click(screen.getByRole("button", { name: "この予想を判定" }));
  await user.click(screen.getByRole("button", { name: "整理対象" }));
  await user.click(screen.getByRole("button", { name: "色をメモへ追加" }));
  await user.click(screen.getByRole("button", { name: "レベル3" }));
  expect(screen.getByText("選択中: 1手目")).toBeInTheDocument();
  expect(screen.getByLabelText("入力位置 1")).toHaveTextContent("1·2·3·5");
  expect(
    screen.getByRole("button", { name: "選択履歴からメモ整理" }),
  ).toBeEnabled();
});
