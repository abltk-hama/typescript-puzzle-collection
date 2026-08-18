export function getInitialVisibleIndices(): number[] {
  // 25枚中、ランダムに15枚を表示
  const indices = Array.from({ length: 25 }, (_, i) => i);

  // シャッフルして最初の15枚を選択
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  return indices.slice(0, 15).sort((a, b) => a - b);
}

export function revealNextCard(
  currentVisibleIndices: number[],
  allCardIndices: number[],
  excludedIndices: ReadonlySet<number> = new Set(),
  seed?: number
): number[] {
  // 未取得かつ裏向きのカードだけを開示候補にする
  const visibleSet = new Set(currentVisibleIndices);
  const hiddenIndices = allCardIndices.filter(
    (idx) => !visibleSet.has(idx) && !excludedIndices.has(idx)
  );

  if (hiddenIndices.length === 0) {
    return currentVisibleIndices; // 全て見えている場合は変化なし
  }

  // ランダムに1枚選択
  const randomIdx = seed !== undefined
    ? hiddenIndices[seed % hiddenIndices.length]
    : hiddenIndices[Math.floor(Math.random() * hiddenIndices.length)];

  return [...currentVisibleIndices, randomIdx].sort((a, b) => a - b);
}