const KEY = 'puzzle-collection:settings:v1'
export interface AppSettings { lastGame: string | null }
export const settingsStore = {
  get(): AppSettings { try { return { lastGame: JSON.parse(localStorage.getItem(KEY) ?? '{}').lastGame ?? null } } catch { return { lastGame: null } } },
  set(patch: Partial<AppSettings>) { localStorage.setItem(KEY, JSON.stringify({ ...this.get(), ...patch })) },
}
