import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { generateFormulaSigns } from "../generation/generate";
import { FormulaGame } from "../ui/FormulaGame";
it("selects an operator cell and enters a sign", async () => {
  const puzzle = generateFormulaSigns(1234, "easy"),
    user = userEvent.setup();
  render(<FormulaGame puzzle={puzzle} onBack={vi.fn()} onLauncher={vi.fn()} />);
  const [cell] = await screen.findAllByRole("gridcell", { name: /演算子\s*$/ });
  await user.click(cell);
  await user.click(screen.getByRole("button", { name: "+" }));
  await waitFor(() => expect(cell).toHaveAccessibleName(/演算子 \+/));
});
it("opens the two-stage verification tables", async () => {
  const puzzle = generateFormulaSigns(2222, "easy"),
    user = userEvent.setup();
  const { container } = render(
    <FormulaGame puzzle={puzzle} onBack={vi.fn()} onLauncher={vi.fn()} />,
  );
  const [line] = await screen.findAllByRole("button", { name: /^横 目標/ });
  await user.click(line);
  const [number] = screen.getAllByRole("button", { name: /^起点/ });
  await user.click(number);
  expect(
    screen.getByRole("heading", { name: "第1検算表" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "残りの数字による第2検算表" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "入口に戻る" }),
  ).toBeInTheDocument();
  const secondTable = screen.getAllByRole("table")[1],
    [possibleResult] = within(secondTable).getAllByRole("button", {
      name: /成立可能/,
    });
  await user.click(possibleResult);
  await user.click(screen.getByRole("button", { name: "第2検算結果を仮適用" }));
  expect(await screen.findByText(/演算子を仮適用しました/)).toBeInTheDocument();
  expect(
    container.querySelector(".formula-cell.operator.hypothetical"),
  ).not.toBeNull();
  expect(screen.getByRole("button", { name: "すべて適用" })).toBeEnabled();
});
