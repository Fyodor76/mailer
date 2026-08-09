"use client";

import { useRef, useState } from "react";

type Props = {
  name: string;
  accept?: string;
  disabled?: boolean;
  hint?: string;
  label?: string;
};

export function FilePicker({
  name,
  accept,
  disabled,
  hint,
  label = "Файл",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);

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
          const file = e.target.files?.[0];
          setFileName(file?.name ?? null);
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
          {fileName ?? "Файл не выбран"}
        </span>
      </div>
      {hint ? (
        <span className="muted" style={{ fontSize: "0.8rem" }}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}
