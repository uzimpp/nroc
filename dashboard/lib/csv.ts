/**
 * Serialises an array of objects to CSV and triggers a browser download.
 * Column order follows the keys of the first row.
 */
export function downloadCSV(rows: Record<string, unknown>[], filename: string): void {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map(r =>
      headers.map(h => {
        const v = r[h];
        if (v === null || v === undefined) return "";
        const s = String(v);
        // Wrap in quotes if the value contains a comma, quote, or newline
        return s.includes(",") || s.includes('"') || s.includes("\n")
          ? `"${s.replace(/"/g, '""')}"`
          : s;
      }).join(",")
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Returns today's date as YYYY-MM-DD for use in filenames. */
export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}
