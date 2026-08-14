import { openDB } from "idb";

export interface SavedGame<T> {
  gameId: string;
  puzzleId: string;
  schemaVersion: 1;
  state: T;
  puzzle?: unknown;
  updatedAt: string;
}
export interface ActivityLogEntry {
  id: string;
  at: string;
  message: string;
}
interface ActivityLogRecord {
  logKey: string;
  entries: ActivityLogEntry[];
}
const database = () =>
  openDB("puzzle-collection", 2, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("sessions"))
        db.createObjectStore("sessions", { keyPath: ["gameId", "puzzleId"] });
      if (!db.objectStoreNames.contains("activity_logs"))
        db.createObjectStore("activity_logs", { keyPath: "logKey" });
    },
  });
export async function saveSession<T>(session: SavedGame<T>) {
  return (await database()).put("sessions", session);
}
export async function loadSession<T>(gameId: string, puzzleId: string) {
  return (await database()).get("sessions", [gameId, puzzleId]) as Promise<
    SavedGame<T> | undefined
  >;
}
export async function deleteSession(gameId: string, puzzleId: string) {
  return (await database()).delete("sessions", [gameId, puzzleId]);
}
export async function listSessions<T>(gameId: string) {
  const all = (await (await database()).getAll("sessions")) as SavedGame<T>[];
  return all.filter((session) => session.gameId === gameId);
}
export async function loadActivityLog(logKey: string) {
  const record = (await (await database()).get("activity_logs", logKey)) as
    | ActivityLogRecord
    | undefined;
  return record?.entries ?? [];
}
export async function saveActivityLog(
  logKey: string,
  entries: ActivityLogEntry[],
) {
  return (await database()).put("activity_logs", {
    logKey,
    entries: entries.slice(-200),
  });
}
export async function deleteActivityLog(logKey: string) {
  return (await database()).delete("activity_logs", logKey);
}
