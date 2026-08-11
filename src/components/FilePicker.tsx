"use client";

import { useRef, useState } from "react";

type Props = {
  name: string;
  accept?: string;
  disabled?: boolean;
  hint?: string;
  label?: string;
  /** Soft warn if file is larger (bytes). Still allows select. */
  warnAboveBytes?: number;
  onFileChange?: (file: File | null) => void;
};

function formatBytes(n: number) {
  if (n < 1024) return `${n} Б`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} КБ`;
  return `${(n / (1024 * 1024)).toFixed(1)} МБ`;
}

export function FilePicker({
  name,
  accept,
  disabled,
  hint,
  label = "Файл",
  warnAboveBytes,
  onFileChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);

  function applyFile(next: File | null) {
    setFile(next);
    onFileChange?.(next);
  }

  function clear() {
    if (inputRef.current) inputRef.current.value = "";
    applyFile(null);
  }

  const tooBig =
    file && warnAboveBytes != null && file.size > warnAboveBytes;

  return (
    <div className="field">
      <span>{label}</span>
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept={accept}
        disabled={disabled}
        hidden
        onChange={(e) => {
          const next = e.target.files?.[0] ?? null;
          applyFile(next);
        }}
      />
      <div className="file-picker">
        <button
          type="button"
          className="btn btn-secondary"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          Выбрать файл
        </button>
        <span className="file-picker-name">
          {file
            ? `${file.name} · ${formatBytes(file.size)}`
            : "Файл не выбран"}
        </span>
        {file ? (
          <button
            type="button"
            className="btn-icon"
            disabled={disabled}
            title="Убрать файл"
            aria-label="Убрать файл"
            onClick={clear}
          >
            ×
          </button>
        ) : null}
      </div>
      {tooBig ? (
        <span
          className="muted"
          style={{ fontSize: "0.8rem", color: "var(--danger, #b42318)" }}
        >
          Файл крупный ({formatBytes(file.size)}) — импорт может занять
          время. После выбора нажмите «Сохранить».
        </span>
      ) : hint ? (
        <span className="muted" style={{ fontSize: "0.8rem" }}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}
