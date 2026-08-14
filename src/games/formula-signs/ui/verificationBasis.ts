import type { Operator } from "../domain/formulaSigns";

export type VerificationBasis = {
  target: number;
  cells: number[];
  calculations: string[];
};

export function calculationBasis(
  expressionCells: number[],
  target: number,
  numbers: number[],
  operators: (Operator | null)[],
): VerificationBasis {
  let cells = [...expressionCells],
    remainingTarget = target;
  const calculations: string[] = [];
  while (cells.length >= 3) {
    let position = cells.length - 1,
      term = numbers[cells[position]];
    if (!term) break;
    const factors = [term];
    while (
      position >= 2 &&
      operators[cells[position - 1]] === "*" &&
      numbers[cells[position - 2]]
    ) {
      position -= 2;
      term *= numbers[cells[position]];
      factors.unshift(numbers[cells[position]]);
    }
    if (position === 0) break;
    const separator = operators[cells[position - 1]];
    if (separator !== "+" && separator !== "-") break;
    const before = remainingTarget;
    remainingTarget =
      separator === "+" ? remainingTarget - term : remainingTarget + term;
    calculations.push(
      `${before} ${separator === "+" ? "−" : "＋"} ${factors.join("×")} = ${remainingTarget}`,
    );
    cells = cells.slice(0, position - 1);
  }
  return { target: remainingTarget, cells, calculations };
}
