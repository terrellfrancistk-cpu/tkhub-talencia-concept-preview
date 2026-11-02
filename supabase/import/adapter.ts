/**
 * Legacy → Supabase adapter. Pure functions: each takes one unknown legacy record and returns either a row
 * shaped for the new schema or a list of issues. Nothing here throws; bad data becomes a reported issue.
 * Foreign keys stay as legacy ids here (…LegacyId) and are resolved to UUIDs by import.ts.
 */
import { FIELDS, STATUS, ROLE } from './mapping';

export type Issue = { entity: string; legacyId: string | null; field: string; message: string; severity: 'error' | 'warning' };
export type Adapted<T> = { ok: true; row: T; warnings: Issue[] } | { ok: false; issues: Issue[] };
type Rec = Record<string, unknown>;

// ---------- primitive readers ----------
const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);

/** First non-empty value among candidate field names; case-insensitive; dots reach into nested objects. */
export function pick(rec: Rec, names: readonly string[]): unknown {
  const lower = new Map<string, string>(Object.keys(rec).map(k => [k.toLowerCase(), k]));
  for (const name of names) {
    let cur: unknown = rec;
    for (const part of name.split('.')) {
      if (!isRec(cur)) { cur = undefined; break; }
      const key = cur === rec ? lower.get(part.toLowerCase()) ?? part : part;
      cur = cur[key];
    }
    if (cur !== undefined && cur !== null && !(typeof cur === 'string' && cur.trim() === '')) return cur;
  }
  return undefined;
}

const str = (v: unknown): string | null => {
  if (v === undefined || v === null) return null;
  if (typeof v === 'string') return v.trim() || null;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return null;
};

/** Dates: ISO strings, US "MM/DD/YYYY [h:mm am]", epoch seconds or milliseconds, Date objects. */
export function toDate(v: unknown): Date | null {
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === 'number' && isFinite(v)) return new Date(v < 1e11 ? v * 1000 : v);
  const s = str(v);
  if (!s) return null;
  if (/^\d{10,13}$/.test(s)) return toDate(Number(s));
  const us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?\s*([ap]\.?m\.?)?)?$/i);
  if (us) {
    const [, mo, d, y, h = '0', mi = '0', se = '0', ap] = us;
    let hour = Number(h);
    if (ap) { const pm = /^p/i.test(ap); if (pm && hour < 12) hour += 12; if (!pm && hour === 12) hour = 0; }
    const year = y.length === 2 ? 2000 + Number(y) : Number(y);
    const out = new Date(year, Number(mo) - 1, Number(d), hour, Number(mi), Number(se));
    return isNaN(out.getTime()) ? null : out;
  }
  const out = new Date(s);
  return isNaN(out.getTime()) ? null : out;
}
const iso = (d: Date | null): string | null => (d ? d.toISOString() : null);
const day = (d: Date | null): string | null => (d ? d.toISOString().slice(0, 10) : null);

/** Combine a date field with a time-only field ("8:00 AM") when the legacy app stored them separately. */
function dateTime(dateV: unknown, timeV: unknown): Date | null {
  const t = str(timeV);
  if (t && /^\d{1,2}:\d{2}(:\d{2})?\s*([ap]\.?m\.?)?$/i.test(t)) {
    const base = toDate(dateV);
    if (!base) return null;
    const m = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([ap])?/i)!;
    let h = Number(m[1]);
    if (m[4]) { const pm = m[4].toLowerCase() === 'p'; if (pm && h < 12) h += 12; if (!pm && h === 12) h = 0; }
    const out = new Date(base);
    out.setHours(h, Number(m[2]), Number(m[3] ?? 0), 0);
    return out;
  }
  return toDate(timeV) ?? null;
}

/** Money: "$1,234.50", 1234.5 (dollars), "123450c", {amount, currency}. Returns integer cents. */
export function toCents(v: unknown): number | null {
  if (isRec(v)) return toCents(v.amount ?? v.value);
  if (typeof v === 'number' && isFinite(v)) return Math.round(v * 100);
  const s = str(v);
  if (!s) return null;
  if (/^-?\d+c$/i.test(s)) return parseInt(s, 10);
  const n = Number(s.replace(/[$,\s]/g, '').replace(/^\((.*)\)$/, '-$1'));
  return isFinite(n) ? Math.round(n * 100) : null;
}

const toInt = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : Number(str(v)?.replace(/[,\s]/g, ''));
  return isFinite(n) ? Math.round(n) : null;
};

const toBool = (v: unknown): boolean => {
  if (typeof v === 'boolean') return v;
  const s = (str(v) ?? '').toLowerCase();
  return ['true', 'yes', 'y', '1', 'eor', 'employer of record'].includes(s);
};

const email = (v: unknown): string | null => {
  const s = str(v)?.toLowerCase() ?? null;
  return s && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? s : null;
};

/** US phone to E.164 when possible; otherwise keep the digits and warn. */
const phone = (v: unknown): { value: string | null; clean: boolean } => {
  const s = str(v);
  if (!s) return { value: null, clean: true };
  const d = s.replace(/\D/g, '');
  if (d.length === 10) return { value: '+1' + d, clean: true };
  if (d.length === 11 && d.startsWith('1')) return { value: '+' + d, clean: true };
  return { value: d || null, clean: false };
};

function status<K extends keyof typeof STATUS>(kind: K, v: unknown, issue: (f: string, m: string, s?: Issue['severity']) => void): string {
  const table = STATUS[kind];
  const s = (str(v) ?? '').toLowerCase().replace(/[_-]+/g, ' ').trim();
  const hit = (table.map as Record<string, string>)[s];
  if (!hit) { if (s) issue('status', `unknown status "${s}", using "${table.default}"`, 'warning'); return table.default; }
  return hit;
}

/** Runs an adapter body with an issue collector; any "error" issue rejects the record. */
function adapt<T>(entity: string, rec: unknown, idNames: readonly string[], body: (r: Rec, issue: (f: string, m: string, s?: Issue['severity']) => void) => T | null): Adapted<T> {
  const issues: Issue[] = [];
  if (!isRec(rec)) return { ok: false, issues: [{ entity, legacyId: null, field: '*', message: 'record is not an object', severity: 'error' }] };
  const legacyId = str(pick(rec, idNames));
  const issue = (field: string, message: string, severity: Issue['severity'] = 'error') => issues.push({ entity, legacyId, field, message, severity });
  if (!legacyId) issue('id', 'missing legacy id; re-running the import would duplicate this record');
  let row: T | null = null;
  try { row = body(rec, issue); } catch (e) { issue('*', 'unexpected value: ' + (e instanceof Error ? e.message : String(e))); }
  const errors = issues.filter(i => i.severity === 'error');
  return errors.length || row === null ? { ok: false, issues } : { ok: true, row, warnings: issues };
}

// ---------- entity adapters ----------
export type OrgRow = { legacy_id: string; name: string; kind: 'dental' | 'medical' | 'other'; industry: string | null; eor_client: boolean; city: string | null; state: string | null };
export const adaptOrganization = (rec: unknown) => adapt<OrgRow>('organization', rec, FIELDS.organization.id, (r, issue) => {
  const F = FIELDS.organization, name = str(pick(r, F.name));
  if (!name) { issue('name', 'missing practice/company name'); return null; }
  const k = (str(pick(r, F.kind)) ?? '').toLowerCase();
  const kind = /dent|ortho|perio|endo/.test(k) ? 'dental' : /med|clinic|hospital|nurs|physician/.test(k) ? 'medical' : k ? 'other' : 'dental';
  if (!k) issue('kind', 'no practice type; assuming dental', 'warning');
  const st = str(pick(r, F.state));
  return { legacy_id: str(pick(r, F.id))!, name, kind, industry: kind === 'other' ? (str(pick(r, F.industry)) ?? k) : null,
    eor_client: toBool(pick(r, F.eor)), city: str(pick(r, F.city)), state: st && st.length === 2 ? st.toUpperCase() : st };
});

export type PersonRow = { legacy_id: string; email: string; role: 'practice' | 'professional'; full_name: string | null; phone: string | null; orgLegacyId: string | null; org_role: 'owner' | 'approver' | 'viewer' | null };
export const adaptPerson = (rec: unknown, fallbackRole?: 'practice' | 'professional') => adapt<PersonRow>('person', rec, FIELDS.person.id, (r, issue) => {
  const F = FIELDS.person, mail = email(pick(r, F.email));
  if (!mail) { issue('email', 'missing or invalid email; a sign-in account needs one'); return null; }
  const t = (str(pick(r, F.type)) ?? '').toLowerCase(), role = ROLE[t] ?? fallbackRole;
  if (!role) { issue('type', `unknown person type "${t}"`); return null; }
  const full = str(pick(r, F.fullName)) ?? ([str(pick(r, F.firstName)), str(pick(r, F.lastName))].filter(Boolean).join(' ') || null);
  const ph = phone(pick(r, F.phone));
  if (!ph.clean) issue('phone', 'phone number is not a 10-digit US number; kept digits only', 'warning');
  const orgLegacyId = role === 'practice' ? str(pick(r, F.orgId)) : null;
  if (role === 'practice' && !orgLegacyId) issue('orgId', 'practice user without an organization', 'warning');
  const or = (str(pick(r, F.orgRole)) ?? '').toLowerCase();
  const org_role = role !== 'practice' ? null : /own|admin/.test(or) ? 'owner' : /approv|manag/.test(or) ? 'approver' : 'viewer';
  return { legacy_id: str(pick(r, F.id))!, email: mail, role, full_name: full, phone: ph.value, orgLegacyId, org_role };
});

export type ShiftRow = { legacy_id: string; orgLegacyId: string; personLegacyId: string | null; role_title: string | null; starts_at: string; ends_at: string; rate_cents: number | null; status: string };
export const adaptShift = (rec: unknown) => adapt<ShiftRow>('shift', rec, FIELDS.shift.id, (r, issue) => {
  const F = FIELDS.shift, org = str(pick(r, F.orgId));
  if (!org) issue('orgId', 'shift has no client/practice');
  const date = pick(r, F.date), start = dateTime(date, pick(r, F.start));
  let end = dateTime(date, pick(r, F.end));
  if (!start) issue('start', 'missing or unreadable start time');
  if (!end) issue('end', 'missing or unreadable end time');
  if (start && end && end <= start) { end = new Date(end.getTime() + 864e5); issue('end', 'end before start; treated as an overnight shift', 'warning'); }
  if (!org || !start || !end) return null;
  return { legacy_id: str(pick(r, F.id))!, orgLegacyId: org, personLegacyId: str(pick(r, F.personId)), role_title: str(pick(r, F.role)),
    starts_at: iso(start)!, ends_at: iso(end)!, rate_cents: toCents(pick(r, F.rate)), status: status('shift', pick(r, F.status), issue) };
});

export type TimesheetRow = { legacy_id: string; shiftLegacyId: string | null; personLegacyId: string; orgLegacyId: string | null; clock_in: string; clock_out: string | null; break_minutes: number; status: string };
export const adaptTimesheet = (rec: unknown) => adapt<TimesheetRow>('timesheet', rec, FIELDS.timesheet.id, (r, issue) => {
  const F = FIELDS.timesheet, person = str(pick(r, F.personId)), cin = toDate(pick(r, F.clockIn)), cout = toDate(pick(r, F.clockOut));
  if (!person) issue('personId', 'timesheet has no professional');
  if (!cin) issue('clockIn', 'missing or unreadable clock-in');
  if (cin && cout && cout <= cin) issue('clockOut', 'clock-out is not after clock-in');
  if (!person || !cin || (cout && cout <= cin)) return null;
  const br = toInt(pick(r, F.breakMinutes)) ?? 0;
  return { legacy_id: str(pick(r, F.id))!, shiftLegacyId: str(pick(r, F.shiftId)), personLegacyId: person, orgLegacyId: str(pick(r, F.orgId)),
    clock_in: iso(cin)!, clock_out: iso(cout), break_minutes: Math.max(0, br), status: status('timesheet', pick(r, F.status), issue) };
});

export type InvoiceRow = { legacy_id: string; orgLegacyId: string; number: string; period_start: string | null; period_end: string | null; total_cents: number; status: string; due_on: string | null; paid_at: string | null };
export const adaptInvoice = (rec: unknown) => adapt<InvoiceRow>('invoice', rec, FIELDS.invoice.id, (r, issue) => {
  const F = FIELDS.invoice, org = str(pick(r, F.orgId)), id = str(pick(r, F.id)), total = toCents(pick(r, F.total));
  if (!org) issue('orgId', 'invoice has no client');
  if (total === null) issue('total', 'missing or unreadable total');
  else if (total < 0) issue('total', 'negative total (credit memo); import credits separately');
  if (!org || total === null || total < 0) return null;
  return { legacy_id: id!, orgLegacyId: org, number: str(pick(r, F.number)) ?? `LEGACY-${id}`, period_start: day(toDate(pick(r, F.periodStart))), period_end: day(toDate(pick(r, F.periodEnd))),
    total_cents: total, status: status('invoice', pick(r, F.status), issue), due_on: day(toDate(pick(r, F.dueOn))), paid_at: iso(toDate(pick(r, F.paidAt))) };
});

export type CredentialRow = { legacy_id: string; personLegacyId: string; kind: string; number: string | null; state: string | null; expires_on: string | null; status: string };
export const adaptCredential = (rec: unknown) => adapt<CredentialRow>('credential', rec, FIELDS.credential.id, (r, issue) => {
  const F = FIELDS.credential, person = str(pick(r, F.personId)), kind = str(pick(r, F.kind));
  if (!person) issue('personId', 'credential has no professional');
  if (!kind) issue('kind', 'credential has no type');
  if (!person || !kind) return null;
  const exp = toDate(pick(r, F.expiresOn));
  let st = status('credential', pick(r, F.status), issue);
  if (exp && exp < new Date() && st === 'verified') { st = 'expired'; issue('expiresOn', 'verified but past expiry; marked expired', 'warning'); }
  return { legacy_id: str(pick(r, F.id))!, personLegacyId: person, kind: kind.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
    number: str(pick(r, F.number)), state: str(pick(r, F.state)), expires_on: day(exp), status: st };
});

export type RewardRow = { legacy_id: string; personLegacyId: string | null; orgLegacyId: string | null; points: number; reason: string; created_at: string };
export const adaptReward = (rec: unknown) => adapt<RewardRow>('reward', rec, FIELDS.reward.id, (r, issue) => {
  const F = FIELDS.reward, person = str(pick(r, F.personId)), org = str(pick(r, F.orgId)), pts = toInt(pick(r, F.points));
  if (!person && !org) issue('owner', 'reward entry belongs to no one');
  if (pts === null) issue('points', 'missing or unreadable points');
  if ((!person && !org) || pts === null) return null;
  return { legacy_id: str(pick(r, F.id))!, personLegacyId: person, orgLegacyId: person ? null : org, points: pts,
    reason: str(pick(r, F.reason)) ?? 'Legacy balance', created_at: iso(toDate(pick(r, F.createdAt))) ?? new Date().toISOString() };
});

/** Adapt a whole array, splitting good rows from rejected records. */
export function adaptAll<T>(records: unknown, fn: (r: unknown) => Adapted<T>): { rows: T[]; issues: Issue[]; rejected: number } {
  const list = Array.isArray(records) ? records : isRec(records) && Array.isArray((records as Rec).data) ? ((records as Rec).data as unknown[]) : [];
  const rows: T[] = [], issues: Issue[] = [];
  let rejected = 0;
  for (const rec of list) {
    const a = fn(rec);
    if (a.ok) { rows.push(a.row); issues.push(...a.warnings); } else { rejected++; issues.push(...a.issues); }
  }
  return { rows, issues, rejected };
}
