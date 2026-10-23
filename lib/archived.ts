type Archivable = { id: string; name: string; archivedAt: string | null };

/** Active items, plus the archived one already chosen (an old transaction may still point at it). */
export function selectableItems<T extends Archivable>(items: T[], keepId?: string) {
  return items.filter((item) => !item.archivedAt || item.id === keepId);
}

export function archiveLabel({ name, archivedAt }: Archivable) {
  return archivedAt ? `${name} (arsip)` : name;
}
