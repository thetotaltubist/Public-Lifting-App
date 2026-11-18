import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { backupFileName, makeBackup, readBackup } from './engine/backup';
import { loadSessions, loadSettings, restoreAll } from './storage';

// ------------------------------------------------------------------
// Saving a backup writes one file and opens the share sheet, so it can go
// to Files, iCloud Drive, AirDrop or email. Restoring picks that file.
// ------------------------------------------------------------------

export async function shareBackup() {
  const [sessions, settings] = await Promise.all([loadSessions(), loadSettings()]);
  const file = new File(Paths.cache, backupFileName());
  if (file.exists) file.delete();
  file.create();
  file.write(JSON.stringify(makeBackup(sessions, settings)));
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Save your backup' });
}

// Lets you pick a backup file and checks it. Nothing changes until apply()
// is called, so the screen can ask first.
export async function pickBackup() {
  const picked = await File.pickFileAsync({ mimeTypes: ['application/json', 'public.json'] });
  if (picked.canceled) return null;
  const checked = readBackup(await picked.result.text());
  if ('error' in checked) return checked;
  const { backup } = checked;
  return { backup, apply: () => restoreAll(backup.sessions, backup.settings) };
}
