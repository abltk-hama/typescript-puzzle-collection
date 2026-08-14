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
it("evaluates the current guess from selected histories and reveals examples as a hint", async () => {
  const user = userEvent.setup();
  vi.spyOn(window, "confirm").mockReturnValue(true);
  const informationPuzzle = {
    ...puzzle,
    id: "ui-mastermind-information",
    allowDuplicates: true,
    secret: [6, 6, 2, 5],
  };
  render(
    <MastermindGame
      puzzle={informationPuzzle}
      onBack={vi.fn()}
      onLauncher={vi.fn()}
    />,
  );
  await waitFor(() => screen.getByLabelText("入力位置 1"));
  for (const guess of [
    [1, 2, 5, 6],
    [2, 3, 5, 6],
  ]) {
    for (const value of guess)
      await user.click(screen.getByRole("button", { name: `数字 ${value}` }));
    await user.click(screen.getByRole("button", { name: "この予想を判定" }));
  }
  const targets = screen.getAllByRole("button", { name: "整理対象" });
  await user.click(targets[0]);
  await user.click(targets[1]);
  for (const value of [2, 1, 5, 6])
    await user.click(screen.getByRole("button", { name: `数字 ${value}` }));
  await user.click(screen.getByRole("button", { name: "レベル1" }));
  expect(
    screen.getByText(/現在入力: 2156／評価: 非常に低い/),
  ).toBeInTheDocument();
  expect(screen.getByText("判定分岐 2種類")).toBeInTheDocument();
  await user.click(
    screen.getByRole("button", { name: "情報収集に向く回答例を見る" }),
  );
  expect(screen.getByText("ヒント: 1回")).toBeInTheDocument();
  expect(screen.getByText(/情報収集向けの回答例を表示/)).toBeInTheDocument();
});
