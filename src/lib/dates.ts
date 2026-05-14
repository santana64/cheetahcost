export function isValidISODate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? ""));
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function toISODateUTC(year: number, month: number, day: number): string {
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
  return date.toISOString().slice(0, 10);
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function parseISODateUTC(value: string): Date | null {
  if (!isValidISODate(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
}

export function compareISODate(a: string, b: string): number {
  return String(a ?? "").localeCompare(String(b ?? ""));
}

export function clampEndDate(dateDebut: string, dateFin: string): string {
  if (!isValidISODate(dateDebut) || !isValidISODate(dateFin)) return dateFin;
  return compareISODate(dateFin, dateDebut) < 0 ? dateDebut : dateFin;
}

export function formatDateFR(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? ""));
  if (!match) return String(value ?? "");
  return `${match[3]}/${match[2]}/${match[1]}`;
}

export function formatDateShortFR(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? ""));
  if (!match) return String(value ?? "");
  return `${match[3]}/${match[2]}`;
}

export function parseFrenchDateInput(raw: string, fallbackYear?: number): string | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;

  if (isValidISODate(value)) return value;

  const normalized = value.replace(/\s+/g, "").replace(/[.]/g, "/").replace(/-/g, "/");
  const match = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?$/.exec(normalized);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  let year = match[3] ? Number(match[3]) : fallbackYear ?? new Date().getFullYear();
  if (year < 100) year += 2000;

  const iso = toISODateUTC(year, month, day);
  return isValidISODate(iso) ? iso : null;
}

export function parseMonthYearFR(raw: string): string | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;

  const normalized = value.replace(/\s+/g, "").replace("-", "/");
  const match = /^(\d{1,2})\/(\d{4})$/.exec(normalized);
  if (!match) return null;

  const month = Number(match[1]);
  const year = Number(match[2]);
  if (month < 1 || month > 12 || year < 1900 || year > 2500) return null;

  return `${String(month).padStart(2, "0")}/${year}`;
}

export function getYearFromISO(value: string): number {
  const date = parseISODateUTC(value);
  return date?.getUTCFullYear() ?? new Date().getFullYear();
}
