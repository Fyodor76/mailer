import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { importRecipientsFromFormData } from "@/lib/import-recipients";

export const runtime = "nodejs";
/** Large Excel imports can take a while on 50k–100k rows. */
export const maxDuration = 300;

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: campaignId } = await ctx.params;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (e) {
    console.error("[api/recipients] formData failed", e);
    return NextResponse.json(
      {
        error:
          "Не удалось принять файл (слишком большой или оборвался). Лимит ~20 МБ.",
      },
      { status: 413 },
    );
  }

  try {
    const result = await importRecipientsFromFormData(campaignId, formData);
    if ("error" in result) {
      return NextResponse.json(result, { status: 400 });
    }
    revalidatePath(`/campaigns/${campaignId}`);
    revalidatePath("/");
    return NextResponse.json(result);
  } catch (e) {
    console.error("[api/recipients] import failed", e);
    return NextResponse.json(
      { error: "Внутренняя ошибка импорта. Смотрите логи сервера." },
      { status: 500 },
    );
  }
}
