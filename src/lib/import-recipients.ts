import { prisma } from "@/lib/db";
import { parseEmailList, parseExcelBuffer } from "@/lib/parse-emails";

export type ImportRecipientsResult =
  | {
      ok: true;
      uniqueCount: number;
      totalFound: number;
      invalidCount: number;
      count: number;
    }
  | { error: string };

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const CHUNK = 1000;

export async function importRecipientsFromFormData(
  campaignId: string,
  formData: FormData,
): Promise<ImportRecipientsResult> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
  });
  if (!campaign) return { error: "Рассылка не найдена" };
  if (campaign.status === "RUNNING") {
    return { error: "Нельзя импортировать во время отправки" };
  }

  const replace = formData.get("replace") === "on";
  const listText = String(formData.get("listText") ?? "");
  const file = formData.get("file");

  let parsed =
    listText.trim().length > 0
      ? parseEmailList(listText)
      : {
          recipients: [] as { email: string; label?: string }[],
          totalFound: 0,
          uniqueCount: 0,
          invalidCount: 0,
        };

  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_FILE_BYTES) {
      return { error: "Файл больше 20 МБ — уменьшите Excel или разбейте на части" };
    }
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      parsed = parseExcelBuffer(buffer);
    } catch (e) {
      console.error("[import] excel parse failed", e);
      return {
        error:
          "Не удалось прочитать Excel. Проверьте формат (.xlsx/.xls/.csv) и колонку email.",
      };
    }
  }

  if (parsed.recipients.length === 0) {
    return { error: "Не найдено ни одного email" };
  }

  if (replace) {
    await prisma.recipient.deleteMany({ where: { campaignId } });
  }

  try {
    for (let i = 0; i < parsed.recipients.length; i += CHUNK) {
      const chunk = parsed.recipients.slice(i, i + CHUNK);
      await prisma.recipient.createMany({
        data: chunk.map((r) => ({
          campaignId,
          email: r.email,
          label: r.label,
        })),
        skipDuplicates: true,
      });
    }
  } catch (e) {
    console.error("[import] db insert failed", e);
    return { error: "Ошибка записи в базу. Попробуйте ещё раз или меньший файл." };
  }

  const count = await prisma.recipient.count({ where: { campaignId } });
  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      status:
        count > 0 && campaign.subject.trim() ? "READY" : "DRAFT",
      finishedAt: null,
      errorMessage: null,
    },
  });

  return {
    ok: true,
    uniqueCount: parsed.uniqueCount,
    totalFound: parsed.totalFound,
    invalidCount: parsed.invalidCount,
    count,
  };
}
