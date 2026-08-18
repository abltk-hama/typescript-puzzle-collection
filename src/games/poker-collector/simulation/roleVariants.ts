import type { PokerRoleType } from "../domain/pokerHandTypes";

export type RoleVariantId =
  | "standard"
  | "fourCardFlush"
  | "fourCardStraight"
  | "skipStraight"
  | "fourCardRoles"
  | "allOriginal";

export interface RoleVariant {
  id: RoleVariantId;
  label: string;
  enabledRoles: ReadonlySet<PokerRoleType>;
}

export const STANDARD_ROLE_TYPES: readonly PokerRoleType[] = [
  "royalFlush",
  "straightFlush",
  "fourOfAKind",
  "fullHouse",
  "flush",
  "straight",
  "threeOfAKind",
  "twoPair",
  "onePair",
];

export const ORIGINAL_ROLE_TYPES: readonly PokerRoleType[] = [
  "fourCardFlush",
  "fourCardStraight",
  "skipStraight",
];

function roleSet(...additional: PokerRoleType[]): ReadonlySet<PokerRoleType> {
  return new Set<PokerRoleType>([...STANDARD_ROLE_TYPES, ...additional]);
}

export const ROLE_VARIANTS: readonly RoleVariant[] = [
  {
    id: "standard",
    label: "標準役のみ",
    enabledRoles: roleSet(),
  },
  {
    id: "fourCardFlush",
    label: "4枚フラッシュのみ追加",
    enabledRoles: roleSet("fourCardFlush"),
  },
  {
    id: "fourCardStraight",
    label: "4枚ストレートのみ追加",
    enabledRoles: roleSet("fourCardStraight"),
  },
  {
    id: "skipStraight",
    label: "飛び地ストレートのみ追加",
    enabledRoles: roleSet("skipStraight"),
  },
  {
    id: "fourCardRoles",
    label: "4枚系のみ追加",
    enabledRoles: roleSet("fourCardFlush", "fourCardStraight"),
  },
  {
    id: "allOriginal",
    label: "オリジナル役を全解放",
    enabledRoles: roleSet(...ORIGINAL_ROLE_TYPES),
  },
] as const;

export function getRoleVariant(id: RoleVariantId): RoleVariant {
  const variant = ROLE_VARIANTS.find((candidate) => candidate.id === id);
  if (!variant) throw new Error(`Unknown role variant: ${id}`);
  return variant;
}
