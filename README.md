## Lowercase Emails Script (Airtable Scripting Extension)

This script scans an Airtable table for email addresses and converts them to lowercase, ensuring data consistency for lookups, integrations, and deduplication.

### Features
- **Dry Run First** – Always starts in *preview mode*, showing exactly which records would be changed without altering any data.
- **Change Preview** – Displays the first 10 changes, including the “before” and “after” values.
- **Confirmation Prompt** – Updates only occur if explicitly confirmed.
- **Batch Updates** – Processes records in batches of 50 to comply with Airtable API limits.
- **Error Handling & Logging** – Retries failed batch updates one record at a time, logs failures with full details (record, before value, intended value, error message).
- **Summary Report** – Shows total records scanned, number of changes needed, successful updates, failures, and execution time.

### Configuration
At the top of the script, set:
\`\`\`javascript
const TABLE_NAME = "Student Management";  // Your table name
const EMAIL_FIELD = "Email Address";      // Your email field name
\`\`\`

### Usage
1. In your Airtable base, go to **Extensions** → **Add an extension** → **Scripting**.
2. Paste the script into the Scripting editor.
3. Click **Run**:
   - The script will scan the table and report any email addresses that aren’t lowercase.
   - If changes are found, it will show a preview and prompt you to proceed.
4. Review the summary and error log after execution.

### Notes
- The target field must be editable (not a formula, lookup, rollup, etc.).
- Works with *Email*, *Single line text*, and *Long text* field types.
- Designed for one-time cleanups, but can be adapted into an automation.
