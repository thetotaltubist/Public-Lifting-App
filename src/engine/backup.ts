import { Session, Settings } from './types';

// ------------------------------------------------------------------
// A backup is one JSON file with every workout and every setting. It's
// what you'd move to a new phone, or keep in Files or iCloud Drive in
// case this one is lost. Restoring replaces what's on the phone.
// ------------------------------------------------------------------

export const BACKUP_KIND = 'lifting-app-backup';
export const BACKUP_VERSION = 1;

export type Backup = {
  kind: typeof BACKUP_KIND;
  version: number;
  exportedAt: string; // ISO
  sessions: Session[];
  settings: Settings;
};

export function makeBackup(sessions: Session[], settings: Settings, now = new Date()): Backup {
  return { kind: BACKUP_KIND, version: BACKUP_VERSION, exportedAt: now.toISOString(), sessions, settings };
}

export function backupFileName(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `lifting-backup-${y}-${m}-${d}.json`;
}

// Checks a file before anything on the phone is replaced. Returns the
// backup, or a plain reason it can't be used.
export function readBackup(raw: string): { backup: Backup } | { error: string } {
  let data: any;
  try {
    data = JSON.parse(raw);
  } catch {
    return { error: "That file isn't a backup from this app." };
  }
  if (!data || data.kind !== BACKUP_KIND) return { error: "That file isn't a backup from this app." };
  if (typeof data.version !== 'number' || data.version > BACKUP_VERSION) {
    return { error: 'That backup is from a newer version of the app. Update the app, then try again.' };
  }
  if (!Array.isArray(data.sessions) || !data.settings || typeof data.settings !== 'object') {
    return { error: 'That backup is incomplete, so nothing was changed.' };
  }
  const sessions = (data.sessions as any[]).filter(
    (s) => s && typeof s.id === 'string' && typeof s.dayId === 'string' && typeof s.finishedAt === 'string' && Array.isArray(s.exercises)
  ) as Session[];
  // Someone restoring a backup has already been through setup
  return { backup: { ...data, sessions, settings: { ...data.settings, setupDone: true } } };
}
