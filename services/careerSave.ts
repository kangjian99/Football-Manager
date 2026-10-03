export const CAREER_SAVE_KEY = 'fm_career_v1';

/**
 * The only career field persisted today.
 * Match progress is still in memory. `seasonId` is stored so a later visit
 * rebuilds squads from that snapshot and does not silently adopt a newer one.
 */
export interface CareerSave {
  version: 1;
  seasonId: string;
}

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const SEASON_ID_PATTERN = /^\d{4}-\d{2}$/;

export function readCareerSeason(storage: KeyValueStorage): string | null {
  const raw = storage.getItem(CAREER_SAVE_KEY);
  if (raw === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      'Career save is not valid JSON. Refusing to start from the current season snapshot.'
    );
  }

  if (!parsed || typeof parsed !== 'object' || typeof (parsed as { seasonId?: unknown }).seasonId !== 'string') {
    throw new Error(
      'Career save is missing seasonId. Refusing to attach it to a newer season snapshot.'
    );
  }

  const seasonId = (parsed as { seasonId: string }).seasonId;
  if (!SEASON_ID_PATTERN.test(seasonId)) {
    throw new Error(
      `Career save seasonId "${seasonId}" is not a season id. Refusing to fall back to the current snapshot.`
    );
  }
  return seasonId;
}

export function writeCareerSeason(storage: KeyValueStorage, seasonId: string): void {
  if (!SEASON_ID_PATTERN.test(seasonId)) {
    throw new Error(`Refusing to record invalid season id "${seasonId}".`);
  }
  const save: CareerSave = { version: 1, seasonId };
  storage.setItem(CAREER_SAVE_KEY, JSON.stringify(save));
}
