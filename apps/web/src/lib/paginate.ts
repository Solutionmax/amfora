/**
 * Slices a list into pages and clamps the requested page into range.
 *
 * Clamping matters because the lists this feeds are reloaded after a delete: the
 * page the viewer is on can disappear under them, and an out of range page would
 * otherwise render as empty with no way back.
 */
export interface Page<T> {
  items: T[];
  page: number;
  totalPages: number;
}

export function paginate<T>(items: T[], page: number, perPage: number): Page<T> {
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const current = Math.min(Math.max(1, Math.trunc(page) || 1), totalPages);
  const start = (current - 1) * perPage;

  return { items: items.slice(start, start + perPage), page: current, totalPages };
}
