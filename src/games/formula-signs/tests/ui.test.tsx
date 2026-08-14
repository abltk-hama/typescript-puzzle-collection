import { render, screen, waitFor } from "@testing-library/react";
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
