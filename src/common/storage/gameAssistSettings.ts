const prefix = "puzzle-collection:assist:v1:";

export function loadAssistSettings<T>(gameId: string, defaults: T): T {
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(prefix + gameId) ?? "{}") };
  } catch {
    return defaults;
  }
}

export function saveAssistSettings<T>(gameId: string, settings: T) {
  localStorage.setItem(prefix + gameId, JSON.stringify(settings));
}
