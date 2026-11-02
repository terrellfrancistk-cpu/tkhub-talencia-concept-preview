/**
 * Legacy import runner. Run on a trusted machine, never in the browser:
 *   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… npx tsx import.ts ./legacy-export [--dry-run]
 * Reads organizations.json, people.json, shifts.json, timesheets.json, invoices.json, credentials.json, rewards.json
 * (any that exist), adapts each record, then upserts in dependency order keyed on legacy_id, so re-running is safe.
 * Writes import-report.json listing every warning and rejected record. The service-role key bypasses Row Level Security;
 * keep it in your shell environment only.
 */
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { adaptAll, adaptOrganization, adaptPerson, adaptShift, adaptTimesheet, adaptInvoice, adaptCredential, adaptReward, type Issue } from './adapter';

const dir = process.argv[2] ?? './legacy-export';
const dryRun = process.argv.includes('--dry-run');
const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!dryRun && (!url || !key)) { console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or pass --dry-run.'); process.exit(1); }
const db: SupabaseClient | null = dryRun ? null : createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } });

const load = (name: string): unknown => {
  const p = join(dir, name + '.json');
  if (!existsSync(p)) return [];
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch (e) { console.error(`Could not parse ${p}:`, e); return []; }
};
const report: { entity: string; adapted: number; rejected: number; written: number }[] = [];
const allIssues: Issue[] = [];
const ids = { org: new Map<string, string>(), person: new Map<string, string>(), shift: new Map<string, string>() };
const missing = (entity: string, legacyId: string, field: string, message: string): Issue => ({ entity, legacyId, field, message, severity: 'error' });

/** Upsert rows in batches; returns legacy_id → new uuid. */
async function upsert(table: string, rows: Record<string, unknown>[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!db || !rows.length) return out;
  for (let i = 0; i < rows.length; i += 500) {
    const { data, error } = await db.from(table).upsert(rows.slice(i, i + 500), { onConflict: 'legacy_id' }).select('id, legacy_id');
    if (error) { console.error(`${table}: ${error.message}`); continue; }
    for (const r of data ?? []) out.set(String(r.legacy_id), String(r.id));
  }
  return out;
}

/** Existing auth user ids by email, so re-runs reuse accounts instead of failing. */
async function existingUsers(): Promise<Map<string, string>> {
  const m = new Map<string, string>();
  if (!db) return m;
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error || !data.users.length) break;
    for (const u of data.users) if (u.email) m.set(u.email.toLowerCase(), u.id);
    if (data.users.length < 1000) break;
  }
  return m;
}

async function main() {
  // 1. organizations
  const orgs = adaptAll(load('organizations'), adaptOrganization);
  allIssues.push(...orgs.issues);
  ids.org = await upsert('organizations', orgs.rows);
  report.push({ entity: 'organizations', adapted: orgs.rows.length, rejected: orgs.rejected, written: ids.org.size });

  // 2. people: an auth account each (no password; they sign in with a magic link or reset), then their profile
  const people = adaptAll(load('people'), r => adaptPerson(r));
  allIssues.push(...people.issues);
  const known = await existingUsers();
  let written = 0;
  for (const p of people.rows) {
    if (!db) continue;
    let uid = known.get(p.email);
    if (!uid) {
      const { data, error } = await db.auth.admin.createUser({ email: p.email, email_confirm: true, user_metadata: { role: p.role, full_name: p.full_name, legacy_import: true } });
      if (error || !data.user) { allIssues.push(missing('person', p.legacy_id, 'email', `could not create account: ${error?.message ?? 'unknown error'}`)); continue; }
      uid = data.user.id;
    }
    const org = p.orgLegacyId ? ids.org.get(p.orgLegacyId) ?? null : null;
    if (p.orgLegacyId && !org) allIssues.push({ entity: 'person', legacyId: p.legacy_id, field: 'orgId', message: `organization ${p.orgLegacyId} was not imported`, severity: 'warning' });
    const { error } = await db.from('profiles').upsert({ id: uid, role: p.role, full_name: p.full_name, phone: p.phone, org_id: org, org_role: org ? p.org_role : null, legacy_id: p.legacy_id }, { onConflict: 'id' });
    if (error) { allIssues.push(missing('person', p.legacy_id, '*', error.message)); continue; }
    ids.person.set(p.legacy_id, uid);
    written++;
  }
  report.push({ entity: 'people', adapted: people.rows.length, rejected: people.rejected, written });

  // 3. shifts (need organizations; the professional is optional for open shifts)
  const shifts = adaptAll(load('shifts'), adaptShift);
  allIssues.push(...shifts.issues);
  const shiftRows = shifts.rows.flatMap(s => {
    const org = ids.org.get(s.orgLegacyId);
    if (!org) { allIssues.push(missing('shift', s.legacy_id, 'orgId', `organization ${s.orgLegacyId} was not imported`)); return []; }
    const pro = s.personLegacyId ? ids.person.get(s.personLegacyId) ?? null : null;
    if (s.personLegacyId && !pro) allIssues.push({ entity: 'shift', legacyId: s.legacy_id, field: 'personId', message: `professional ${s.personLegacyId} was not imported; shift imported unassigned`, severity: 'warning' });
    return [{ legacy_id: s.legacy_id, org_id: org, professional_id: pro, role_title: s.role_title, starts_at: s.starts_at, ends_at: s.ends_at, rate_cents: s.rate_cents, status: pro ? s.status : (s.status === 'claimed' ? 'open' : s.status) }];
  });
  ids.shift = await upsert('shifts', shiftRows);
  report.push({ entity: 'shifts', adapted: shifts.rows.length, rejected: shifts.rejected + shifts.rows.length - shiftRows.length, written: ids.shift.size });

  // 4. timesheets (need a professional; organization comes from the row or its shift)
  const ts = adaptAll(load('timesheets'), adaptTimesheet);
  allIssues.push(...ts.issues);
  const shiftOrg = new Map(shiftRows.map(s => [s.legacy_id, s.org_id] as const));
  const tsRows = ts.rows.flatMap(t => {
    const pro = ids.person.get(t.personLegacyId);
    const org = (t.orgLegacyId && ids.org.get(t.orgLegacyId)) || (t.shiftLegacyId && shiftOrg.get(t.shiftLegacyId)) || null;
    if (!pro || !org) { allIssues.push(missing('timesheet', t.legacy_id, pro ? 'orgId' : 'personId', 'linked professional or organization was not imported')); return []; }
    return [{ legacy_id: t.legacy_id, shift_id: t.shiftLegacyId ? ids.shift.get(t.shiftLegacyId) ?? null : null, professional_id: pro, org_id: org, clock_in: t.clock_in, clock_out: t.clock_out, break_minutes: t.break_minutes, status: t.status }];
  });
  const tsWritten = await upsert('timesheets', tsRows);
  report.push({ entity: 'timesheets', adapted: ts.rows.length, rejected: ts.rejected + ts.rows.length - tsRows.length, written: tsWritten.size });

  // 5. invoices, credentials, rewards
  const inv = adaptAll(load('invoices'), adaptInvoice);
  allIssues.push(...inv.issues);
  const invRows = inv.rows.flatMap(i => {
    const org = ids.org.get(i.orgLegacyId);
    if (!org) { allIssues.push(missing('invoice', i.legacy_id, 'orgId', `organization ${i.orgLegacyId} was not imported`)); return []; }
    const { orgLegacyId: _o, ...rest } = i;
    return [{ ...rest, org_id: org }];
  });
  report.push({ entity: 'invoices', adapted: inv.rows.length, rejected: inv.rejected + inv.rows.length - invRows.length, written: (await upsert('invoices', invRows)).size });

  const cred = adaptAll(load('credentials'), adaptCredential);
  allIssues.push(...cred.issues);
  const credRows = cred.rows.flatMap(c => {
    const pro = ids.person.get(c.personLegacyId);
    if (!pro) { allIssues.push(missing('credential', c.legacy_id, 'personId', `professional ${c.personLegacyId} was not imported`)); return []; }
    const { personLegacyId: _p, ...rest } = c;
    return [{ ...rest, professional_id: pro }];
  });
  report.push({ entity: 'credentials', adapted: cred.rows.length, rejected: cred.rejected + cred.rows.length - credRows.length, written: (await upsert('credentials', credRows)).size });

  const rw = adaptAll(load('rewards'), adaptReward);
  allIssues.push(...rw.issues);
  const rwRows = rw.rows.flatMap(x => {
    const user = x.personLegacyId ? ids.person.get(x.personLegacyId) ?? null : null;
    const org = x.orgLegacyId ? ids.org.get(x.orgLegacyId) ?? null : null;
    if (!user && !org) { allIssues.push(missing('reward', x.legacy_id, 'owner', 'linked person or organization was not imported')); return []; }
    return [{ legacy_id: x.legacy_id, user_id: user, org_id: org, points: x.points, reason: x.reason, source: 'legacy', created_at: x.created_at }];
  });
  report.push({ entity: 'rewards', adapted: rw.rows.length, rejected: rw.rejected + rw.rows.length - rwRows.length, written: (await upsert('rewards_ledger', rwRows)).size });

  const errors = allIssues.filter(i => i.severity === 'error').length;
  writeFileSync('import-report.json', JSON.stringify({ dryRun, finishedAt: new Date().toISOString(), summary: report, errors, warnings: allIssues.length - errors, issues: allIssues }, null, 2));
  console.table(report);
  console.log(`${errors} rejected records, ${allIssues.length - errors} warnings. Details in import-report.json${dryRun ? ' (dry run: nothing written)' : ''}.`);
}

main().catch(e => { console.error(e); process.exit(1); });
