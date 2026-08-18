import type { DetectedRole } from "./pokerHandTypes";

export function calculateRoleScore(role: DetectedRole): number {
  return role.baseScore;
}

export function calculateBonusScore(roleCount: number): number {
  if (roleCount >= 5) return 500;
  if (roleCount >= 4) return 300;
  if (roleCount >= 3) return 150;
  return 0;
}

export function calculateTotalScore(roles: DetectedRole[]): number {
  const baseScore = roles.reduce((sum, role) => sum + role.baseScore, 0);
  const bonusScore = calculateBonusScore(roles.length);
  return baseScore + bonusScore;
}

export function calculateScoreBreakdown(
  roles: DetectedRole[]
): {
  baseScore: number;
  bonusScore: number;
  totalScore: number;
} {
  const baseScore = roles.reduce((sum, role) => sum + role.baseScore, 0);
  const bonusScore = calculateBonusScore(roles.length);
  return {
    baseScore,
    bonusScore,
    totalScore: baseScore + bonusScore,
  };
}