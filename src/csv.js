// CSV export helpers.
//
// Spreadsheet applications (Excel, LibreOffice Calc, Google Sheets) treat a cell
// whose text starts with = + - @ (optionally preceded by a tab or CR) as a formula,
// even when the field was quoted in the source file. Values that reach an export
// from untrusted places -- MISP event titles pulled from upstream feeds, imported
// Google Form titles, usernames, proxy-derived IPs -- can therefore run as formulas
// on the workstation of whoever opens the file. Prefixing with a text-literal quote
// neutralises this; the marker is not displayed by the spreadsheet.

const FORMULA_PREFIX = /^[=+\-@\t\r]/;

// Escape a value for a CSV cell: neutralise formula injection, then quote.
export const csvCell = (v) => {
    const s = String(v ?? '');
    const safe = FORMULA_PREFIX.test(s) ? `'${s}` : s;
    return `"${safe.replace(/"/g, '""')}"`;
};

// Build a CSV document from a header row and an array of row arrays.
export const buildCsv = (header, rows) =>
    [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');

// Trigger a browser download of `content` as `filename`.
// The BOM keeps non-ASCII values (event titles, org names) readable in Excel.
export const downloadCsv = (content, filename) => {
    const blob = new Blob(['\ufeff', content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
