import { describe, expect, it } from "vitest";
import {
  formatBalanceSimulationReport,
  runBalanceSimulation,
} from "../simulation/balanceSimulator";

declare const process: {
  env: Record<string, string | undefined>;
};

const enabled = process.env.POKER_BALANCE_SIM === "1";

describe.skipIf(!enabled)("manual poker collector balance report", () => {
  it(
    "prints a full-information score comparison",
    () => {
      const sampleCount = Number(process.env.POKER_BALANCE_SAMPLES ?? 1000);
      const seed = Number(process.env.POKER_BALANCE_SEED ?? 1347373893);
      const result = runBalanceSimulation({
        sampleCount,
        seed,
        targetScores: [300, 800, 1500],
      });

      console.log(`\n${formatBalanceSimulationReport(result)}\n`);
      expect(result.sampleCount).toBe(sampleCount);
    },
    120_000
  );
});
