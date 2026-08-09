import * as XLSX from "xlsx";
import {
  extractEmails,
  type ParseResult,
  type ParsedRecipient,
} from "@/lib/parse-list";

export type { ParsedRecipient, ParseResult };
export { extractEmails, parseEmailList } from "@/lib/parse-list";

const EMAIL_HEADERS = [
  "email",
  "e-mail",
  "e_mail",
  "mail",
  "почта",
  "emails",
  "email address",
];

const LABEL_HEADERS = [
  "label",
  "name",
  "имя",
  "название",
  "company",
  "компания",
  "source",
  "источник",
  "owner",
  "чья",
  "contact",
  "контакт",
];

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function findColumnIndex(headers: string[], candidates: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    if (candidates.includes(headers[i])) return i;
  }
  for (let i = 0; i < headers.length; i++) {
    if (candidates.some((c) => headers[i].includes(c))) return i;
  }
  return -1;
}

export function parseExcelBuffer(buffer: ArrayBuffer | Buffer): ParseResult {
  const empty = {
    recipients: [] as ParsedRecipient[],
    totalFound: 0,
    uniqueCount: 0,
    duplicateCount: 0,
    invalidCount: 0,
  };

  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return empty;

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  if (rows.length === 0) return empty;

  const headerRow = (rows[0] ?? []).map(normalizeHeader);
  let emailCol = findColumnIndex(headerRow, EMAIL_HEADERS);
  let labelCol = findColumnIndex(headerRow, LABEL_HEADERS);
  let dataStart = 1;

  if (emailCol === -1) {
    emailCol = 0;
    dataStart = 0;
    labelCol = headerRow.length > 1 ? 1 : -1;
  }

  const seen = new Set<string>();
  const recipients: ParsedRecipient[] = [];
  let totalFound = 0;
  let invalidCount = 0;

  for (let i = dataStart; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const cell = String(row[emailCol] ?? "").trim();
    if (!cell) continue;

    const emails = extractEmails(cell);
    if (emails.length === 0) {
      invalidCount += 1;
      continue;
    }

    const labelRaw =
      labelCol >= 0 ? String(row[labelCol] ?? "").trim() : undefined;
    const label = labelRaw || undefined;

    for (const email of emails) {
      totalFound += 1;
      if (seen.has(email)) continue;
      seen.add(email);
      recipients.push({ email, label });
    }
  }

  return {
    recipients,
    totalFound,
    uniqueCount: recipients.length,
    duplicateCount: Math.max(0, totalFound - recipients.length),
    invalidCount,
  };
}
