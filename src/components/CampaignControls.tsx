"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  importRecipientsAction,
  updateCampaignAction,
} from "@/app/actions";
import { FilePicker } from "@/components/FilePicker";
import { parseEmailList } from "@/lib/parse-list";
import { useToast } from "@/components/Toast";

type Props = {
  campaignId: string;
  initial: {
    name: string;
    subject: string;
    bodyHtml: string;
    bodyText: string;
    batchSize: number;
    delayMs: number;
  };
  canEdit: boolean;
  recipientCount: number;
};

type LetterState = {
  name: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  batchSize: number;
  delayMs: number;
};

type SaveStatus = "idle" | "pending" | "saved" | "error";

const AUTOSAVE_MS = 700;

export function CampaignControls({
  campaignId,
  initial,
  canEdit,
  recipientCount,
}: Props) {
  const [err, setErr] = useState<string | null>(null);
  const [listText, setListText] = useState("");
  const [pending, startTransition] = useTransition();
  const listRef = useRef<HTMLTextAreaElement>(null);
  const toast = useToast();

  const [letter, setLetter] = useState<LetterState>(initial);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [htmlFileName, setHtmlFileName] = useState<string | null>(null);
  const htmlFileRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const letterRef = useRef(letter);
  letterRef.current = letter;

  const MAX_HTML_BYTES = 2 * 1024 * 1024;

  function normalizeImportedHtml(raw: string) {
    const text = raw.replace(/^\uFEFF/, "").trim();
    const body = text.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    return (body ? body[1] : text).trim();
  }

  async function onHtmlFile(file: File | undefined) {
    if (!file || !canEdit) return;
    if (file.size > MAX_HTML_BYTES) {
      toast.error("HTML-файл больше 2 МБ");
      return;
    }
    const name = file.name.toLowerCase();
    if (!name.endsWith(".html") && !name.endsWith(".htm") && file.type && !file.type.includes("html")) {
      toast.error("Нужен файл .html или .htm");
      return;
    }
    try {
      const raw = await file.text();
      const html = normalizeImportedHtml(raw);
      if (!html) {
        toast.error("Файл пустой");
        return;
      }
      setHtmlFileName(file.name);
      patchLetter("bodyHtml", html);
      toast.success(`HTML загружен: ${file.name}`, { id: "html-file" });
    } catch {
      toast.error("Не удалось прочитать файл");
    }
  }

  const preview = useMemo(() => parseEmailList(listText), [listText]);

  function runImport(
    fn: () => Promise<
      | {
          error?: string;
          ok?: boolean;
          uniqueCount?: number;
          totalFound?: number;
          invalidCount?: number;
        }
      | void
    >,
  ) {
    startTransition(async () => {
      setErr(null);
      const res = await fn();
      if (res && "error" in res && res.error) {
        setErr(res.error);
        toast.error(res.error);
      } else if (res && "uniqueCount" in res && res.uniqueCount != null) {
        const text =
          `Сохранено ${res.uniqueCount} адресов` +
          (res.invalidCount ? ` · пропущено: ${res.invalidCount}` : "");
        toast.success(text, { id: "recipients-save" });
        setListText("");
      } else {
        toast.success("База адресов сохранена", { id: "recipients-save" });
      }
    });
  }

  function saveLetter(next: LetterState) {
    if (!canEdit) return;
    setSaveStatus("pending");
    setSaveError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("name", next.name);
      fd.set("subject", next.subject);
      fd.set("bodyHtml", next.bodyHtml);
      fd.set("bodyText", next.bodyText);
      fd.set("batchSize", String(next.batchSize));
      fd.set("delayMs", String(next.delayMs));
      const res = await updateCampaignAction(campaignId, fd);
      if (res && "error" in res && res.error) {
        setSaveStatus("error");
        setSaveError(res.error);
        toast.error(res.error, { id: "letter-save" });
        return;
      }
      setSaveStatus("saved");
      toast.success("Письмо сохранено", { id: "letter-save" });
    });
  }

  function scheduleSave(next: LetterState) {
    if (!canEdit) return;
    setSaveStatus("pending");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => saveLetter(next), AUTOSAVE_MS);
  }

  function patchLetter<K extends keyof LetterState>(
    key: K,
    value: LetterState[K],
  ) {
    const next = { ...letterRef.current, [key]: value };
    setLetter(next);
    scheduleSave(next);
  }

  function flushSave() {
    if (!canEdit) return;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    saveLetter(letterRef.current);
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (saveStatus !== "saved") return;
    const t = setTimeout(() => setSaveStatus("idle"), 2000);
    return () => clearTimeout(t);
  }, [saveStatus]);

  const statusLabel =
    saveStatus === "pending"
      ? "Сохраняется…"
      : saveStatus === "saved"
        ? "Сохранено"
        : saveStatus === "error"
          ? saveError || "Ошибка сохранения"
          : null;

  return (
    <div className="stack">
      <div className="panel stack">
        <div
          className="row"
          style={{ justifyContent: "space-between", alignItems: "baseline" }}
        >
          <h2 style={{ fontSize: "1.2rem" }}>Письмо</h2>
          {canEdit && statusLabel ? (
            <span
              className="muted"
              style={{
                fontSize: "0.85rem",
                color:
                  saveStatus === "error" ? "var(--danger, #b42318)" : undefined,
              }}
            >
              {statusLabel}
            </span>
          ) : null}
        </div>

        <label className="field">
          Название
          <input
            name="name"
            value={letter.name}
            disabled={!canEdit}
            onChange={(e) => patchLetter("name", e.target.value)}
            onBlur={flushSave}
          />
        </label>
        <label className="field">
          Тема
          <input
            name="subject"
            value={letter.subject}
            disabled={!canEdit}
            onChange={(e) => patchLetter("subject", e.target.value)}
            onBlur={flushSave}
          />
        </label>
        <div className="field">
          <span>HTML</span>
          <input
            ref={htmlFileRef}
            type="file"
            accept=".html,.htm,text/html"
            hidden
            disabled={!canEdit}
            onChange={(e) => {
              const file = e.target.files?.[0];
              void onHtmlFile(file);
              e.target.value = "";
            }}
          />
          <div className="file-picker">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={!canEdit}
              onClick={() => htmlFileRef.current?.click()}
            >
              Загрузить .html
            </button>
            <span className="file-picker-name">
              {htmlFileName ?? "Файл не выбран"}
            </span>
          </div>
          <span className="muted" style={{ fontSize: "0.8rem" }}>
            Файл .html / .htm подставит код в поле ниже. Можно и вручную.
          </span>
          <textarea
            name="bodyHtml"
            value={letter.bodyHtml}
            disabled={!canEdit}
            style={{ minHeight: 180, marginTop: "0.5rem" }}
            placeholder="<p>Привет, {{to_name}}</p>"
            onChange={(e) => {
              setHtmlFileName(null);
              patchLetter("bodyHtml", e.target.value);
            }}
            onBlur={flushSave}
          />
        </div>
        <label className="field">
          Текст без вёрстки
          <textarea
            name="bodyText"
            value={letter.bodyText}
            disabled={!canEdit}
            onChange={(e) => patchLetter("bodyText", e.target.value)}
            onBlur={flushSave}
          />
        </label>
        <div className="grid-2">
          <label className="field">
            Писем за раз
            <input
              name="batchSize"
              type="number"
              min={1}
              max={500}
              value={letter.batchSize}
              disabled={!canEdit}
              onChange={(e) =>
                patchLetter("batchSize", Number(e.target.value) || 1)
              }
              onBlur={flushSave}
            />
          </label>
          <label className="field">
            Пауза между пачками, мс
            <input
              name="delayMs"
              type="number"
              min={0}
              step={100}
              value={letter.delayMs}
              disabled={!canEdit}
              onChange={(e) =>
                patchLetter("delayMs", Math.max(0, Number(e.target.value) || 0))
              }
              onBlur={flushSave}
            />
          </label>
        </div>
        {!canEdit ? (
          <p className="muted" style={{ margin: 0 }}>
            Пока идёт отправка, настройки заблокированы.
          </p>
        ) : null}
      </div>

      <form
        className="panel stack"
        action={(fd) => runImport(() => importRecipientsAction(campaignId, fd))}
      >
        <div
          className="row"
          style={{ justifyContent: "space-between", alignItems: "baseline" }}
        >
          <div>
            <h2 style={{ fontSize: "1.2rem" }}>База адресов</h2>
            {recipientCount === 0 ? (
              <p
                className="muted"
                style={{ margin: "0.25rem 0 0", fontSize: "0.85rem" }}
              >
                Сохраните базу — затем можно запускать
              </p>
            ) : null}
          </div>
          {canEdit ? (
            <button className="btn" type="submit" disabled={pending}>
              Сохранить
            </button>
          ) : null}
        </div>
        <FilePicker
          name="file"
          accept=".xlsx,.xls,.csv"
          disabled={!canEdit}
          label="Excel"
          hint="Колонка email или почта. Имя/компания не обязательны."
        />
        <label className="field">
          Или вставьте список
          <textarea
            ref={listRef}
            name="listText"
            disabled={!canEdit}
            value={listText}
            onChange={(e) => setListText(e.target.value)}
            placeholder={
              "fishouk@yandex.ru\nuser@mail.com\nother@mail.com, Компания А"
            }
          />
          <span className="muted" style={{ fontSize: "0.8rem" }}>
            Один email на строку. Имя после запятой — по желанию (для{" "}
            <code>{"{{to_name}}"}</code>).
          </span>
        </label>

        {preview.recipients.length > 0 ? (
          <div className="chip-preview">
            <div
              className="muted"
              style={{ fontSize: "0.8rem", marginBottom: "0.5rem" }}
            >
              Превью · {preview.uniqueCount} уникальных
              {preview.duplicateCount > 0
                ? ` · повторов схлопнуто: ${preview.duplicateCount}`
                : ""}
              {preview.invalidCount > 0
                ? ` · битых строк: ${preview.invalidCount}`
                : ""}
            </div>
            <div className="chip-list">
              {preview.recipients.slice(0, 40).map((r) => (
                <span key={r.email} className="chip">
                  <span className="chip-email">{r.email}</span>
                  {r.label ? (
                    <span className="chip-label">{r.label}</span>
                  ) : null}
                </span>
              ))}
              {preview.recipients.length > 40 ? (
                <span className="muted" style={{ fontSize: "0.85rem" }}>
                  +{preview.recipients.length - 40}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

        <label
          className="row"
          style={{ color: "var(--muted)", fontSize: "0.9rem" }}
        >
          <input
            type="checkbox"
            name="replace"
            disabled={!canEdit}
            style={{ width: "auto" }}
            defaultChecked={recipientCount > 0}
          />
          Заменить текущую базу
        </label>
      </form>

      {err ? <div className="alert">{err}</div> : null}
    </div>
  );
}
