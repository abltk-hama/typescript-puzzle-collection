import type { PokerCollectorPuzzle, PokerCollectorState } from "../domain/pokerHandTypes";
import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "puzzle-games";
const STORE_NAME = "poker-collector-sessions";

async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });
}

export async function loadPokerSession(
  puzzle: PokerCollectorPuzzle
): Promise<PokerCollectorState | undefined> {
  const db = await getDB();
  return db.get(STORE_NAME, puzzle.id);
}

export async function savePokerSession(
  puzzle: PokerCollectorPuzzle,
  state: PokerCollectorState
): Promise<void> {
  const db = await getDB();
  await db.put(STORE_NAME, state, puzzle.id);
}

export async function deletePokerSession(puzzle: PokerCollectorPuzzle): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAME, puzzle.id);
}

export async function listPokerProgress(): Promise<Map<string, boolean>> {
  const db = await getDB();
  const allKeys = await db.getAllKeys(STORE_NAME);
  const progress = new Map<string, boolean>();

  for (const key of allKeys) {
    progress.set(String(key), true);
  }

  return progress;
}

export async function loadGeneratedPokerPuzzles(): Promise<PokerCollectorPuzzle[]> {
  const db = await getDB();
  const allKeys = await db.getAllKeys(STORE_NAME);
  const generated: PokerCollectorPuzzle[] = [];

  for (const key of allKeys) {
    const state = await db.get(STORE_NAME, key);
    if (state && typeof state === "object" && "cards" in state) {
      // ここでパズル情報を復元する必要がある（簡略版）
      // 実装では、別途パズルストレージを使用することを推奨
    }
  }

  return generated;
}
