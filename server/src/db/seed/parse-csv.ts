/**
 * Parses a CSV line, handling quoted fields that may contain commas or escaped quotes.
 * RFC 4180 compliant.
 */
function parseCSVLine(line: string): readonly string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        // Check for escaped quote (double quote)
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i += 2;
        } else {
          // End of quoted field
          inQuotes = false;
          i += 1;
        }
      } else {
        current += char;
        i += 1;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i += 1;
      } else if (char === ",") {
        fields.push(current);
        current = "";
        i += 1;
      } else {
        current += char;
        i += 1;
      }
    }
  }

  // Push the last field
  fields.push(current);

  return fields;
}

/**
 * Parses CSV content into an array of records keyed by header names.
 * Handles quoted fields, escaped quotes, and empty lines.
 */
export function parseCSV(content: string): readonly Record<string, string>[] {
  const lines = content.split("\n");

  if (lines.length === 0) {
    return [];
  }

  const headers = parseCSVLine(lines[0]).map((h) => h.trim());

  return lines
    .slice(1)
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const values = parseCSVLine(line);
      const record: Record<string, string> = {};
      for (let i = 0; i < headers.length; i++) {
        record[headers[i]] = values[i]?.trim() ?? "";
      }
      return record;
    });
}
