/******** Lowercase Emails — Dry Run First (with logging & retry) ********/
const TABLE_NAME = "Table Namet";   // your table
const EMAIL_FIELD = "Email Address";       // your field

// --- Config ---
const BATCH_SIZE = 50;                     // Airtable limit-friendly
const SHOW_PREVIEW = 10;                   // preview rows to display

// --- Helpers ---
function toStr(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  try { return String(v); } catch { return ""; }
}

const start = Date.now();
const table = base.getTable(TABLE_NAME);
const field = table.getField(EMAIL_FIELD);

// 1) Guardrails: read-only field types (cannot update)
const READ_ONLY_TYPES = new Set(["formula", "rollup", "lookup", "count", "createdTime", "lastModifiedTime"]);
if (READ_ONLY_TYPES.has(field.type)) {
  output.markdown(
    `❌ **"${EMAIL_FIELD}" is a read-only field** of type \`${field.type}\`.\n` +
    `Use a formula \`LOWER({${EMAIL_FIELD}})\` or copy into an editable field.`
  );
  return;
}

// 2) Fetch minimal data
const query = await table.selectRecordsAsync({ fields: [EMAIL_FIELD] });
const scanned = query.records.length;

// 3) Determine changes (DRY RUN PHASE)
let updates = [];
for (let r of query.records) {
  const raw = r.getCellValue(EMAIL_FIELD);
  if (!raw) continue;
  const str = toStr(raw);
  const normalized = str.trim().toLowerCase();
  if (normalized !== str) {
    updates.push({ id: r.id, fields: { [EMAIL_FIELD]: normalized } });
  }
}
const toChange = updates.length;

// 4) Report dry run results + preview
const secsDry = ((Date.now() - start) / 1000).toFixed(1);
output.markdown([
  `## 🔎 Dry run complete — no changes made`,
  `- Scanned: **${scanned}**`,
  `- Would update: **${toChange}**`,
  `- Duration: **${secsDry}s**`
].join('\n'));

if (toChange === 0) {
  output.markdown(`✅ Everything is already lowercase in **${TABLE_NAME}.${EMAIL_FIELD}**. Nothing to do.`);
  return;
}

const preview = updates.slice(0, SHOW_PREVIEW).map(u => {
  const rec = query.getRecord(u.id);
  return {
    Record: rec.name || rec.id,
    Before: toStr(rec.getCellValue(EMAIL_FIELD)),
    After: u.fields[EMAIL_FIELD],
  };
});
output.markdown(`**Preview of first ${Math.min(SHOW_PREVIEW, toChange)} change(s):**`);
output.table(preview);

// 5) Ask whether to proceed (keeps default as “stay dry run”)
const choice = await input.buttonsAsync('Proceed with updates now?', [
  { label: 'No (keep dry run only)', value: 'no' },
  { label: `Yes, update ${toChange} record(s)`, value: 'go' },
]);

if (choice !== 'go') {
  output.markdown('🛑 Stopping after dry run. **No changes were made.**');
  return;
}

// 6) Commit updates (with logging + retry per record on batch failures)
let successes = 0;
let failures = 0;
let errorLogs = []; // {Record, Before, IntendedAfter, Error}

for (let i = 0; i < updates.length; i += BATCH_SIZE) {
  const chunk = updates.slice(i, i + BATCH_SIZE);
  try {
    await table.updateRecordsAsync(chunk);
    successes += chunk.length;
  } catch (batchErr) {
    // Retry each record individually to identify exact failures
    for (let u of chunk) {
      const rec = query.getRecord(u.id);
      const before = toStr(rec.getCellValue(EMAIL_FIELD));
      try {
        await table.updateRecordAsync(u);
        successes += 1;
      } catch (e) {
        failures += 1;
        errorLogs.push({
          Record: rec.name || rec.id,
          Before: before,
          IntendedAfter: u.fields[EMAIL_FIELD],
          Error: e.message || String(e),
        });
      }
    }
  }
}

// 7) Final summary
const secsTotal = ((Date.now() - start) / 1000).toFixed(1);
output.markdown([
  `### ✅ Update complete`,
  `- Scanned: **${scanned}**`,
  `- Needed changes: **${toChange}**`,
  `- Successfully updated: **${successes}**`,
  `- Failed: **${failures}**`,
  `- Total duration: **${secsTotal}s**`
].join('\n'));

if (errorLogs.length) {
  output.markdown(`#### ⚠️ Error log (showing up to 50)`);
  output.table(errorLogs.slice(0, 50));
}
