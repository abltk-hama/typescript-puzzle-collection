import { openDB } from 'idb'

export interface SavedGame<T> { gameId: string; puzzleId: string; schemaVersion: 1; state: T; puzzle?: unknown; updatedAt: string }
const database = () => openDB('puzzle-collection', 1, { upgrade(db) { if (!db.objectStoreNames.contains('sessions')) db.createObjectStore('sessions', { keyPath: ['gameId', 'puzzleId'] }) } })
export async function saveSession<T>(session: SavedGame<T>) { return (await database()).put('sessions', session) }
export async function loadSession<T>(gameId: string, puzzleId: string) { return (await database()).get('sessions', [gameId, puzzleId]) as Promise<SavedGame<T> | undefined> }
export async function deleteSession(gameId: string, puzzleId: string) { return (await database()).delete('sessions', [gameId, puzzleId]) }
