const EMAIL_RE =
  /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+/g;

export type ParsedRecipient = {
  email: string;
  label?: string;
};

export type ParseResult = {
  recipients: ParsedRecipient[];
  totalFound: number;
  uniqueCount: number;
  duplicateCount: number;
  invalidCount: number;
};

export function extractEmails(cell: string): string[] {
  const matches = cell.match(EMAIL_RE) ?? [];
  return matches.map((e) => e.toLowerCase().trim());
}

export function parseEmailList(text: string): ParseResult {
  const lines = text.split(/\r?\n/);
  const seen = new Set<string>();
  const recipients: ParsedRecipient[] = [];
  let totalFound = 0;
  let invalidCount = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const emails = extractEmails(trimmed);
    if (emails.length === 0) {
      invalidCount += 1;
      continue;
    }

    let label: string | undefined;
    const withoutEmails = trimmed
      .replace(EMAIL_RE, " ")
      .replace(/[,<|;]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (withoutEmails) label = withoutEmails;

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
