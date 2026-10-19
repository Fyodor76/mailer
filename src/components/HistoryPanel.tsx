"use client";

import { useMemo, useState } from "react";

export type HistoryRow = {
  id: string;
  email: string;
  label: string | null;
  status: string;
  statusLabel: string;
  error: string | null;
  source: string;
  sentAt: string;
};

const STATUS_FILTERS = [
  { value: "", label: "Все статусы" },
  { value: "SENT", label: "Отправлено" },
  { value: "DELIVERED", label: "Доставлено" },
  { value: "OPENED", label: "Открыто" },
  { value: "CLICKED", label: "Клик" },
  { value: "FAILED", label: "Ошибки" },
  { value: "BOUNCED", label: "Отскок" },
];

const ERROR_STATUSES = new Set(["FAILED", "BOUNCED", "SPAM", "UNSUBSCRIBED"]);

function csvCell(value: string) {
  const text = value.replaceAll('"', '""');
  return `"${text}"`;
}

export function HistoryPanel({ rows }: { rows: HistoryRow[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (status === "FAILED" ? !ERROR_STATUSES.has(row.status) : status && row.status !== status) {
        return false;
      }
      if (source && row.source !== source) return false;
      if (!needle) return true;
      return (
        row.email.toLowerCase().includes(needle) ||
        (row.label ?? "").toLowerCase().includes(needle) ||
        (row.error ?? "").toLowerCase().includes(needle)
      );
    });
  }, [query, rows, source, status]);

  function exportCsv() {
    const header = ["Когда", "Email", "Имя", "Статус", "Ошибка", "Источник"];
    const lines = [
      header.map(csvCell).join(";"),
      ...filtered.map((row) =>
        [
          row.sentAt,
          row.email,
          row.label ?? "",
          row.statusLabel,
          row.error ?? "",
          row.source === "restore" ? "Unisender" : "Отправка",
        ]
          .map(csvCell)
          .join(";"),
      ),
    ];
    const blob = new Blob(["\uFEFF" + lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "history.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  if (rows.length === 0) {
    return (
      <div className="panel">
        <div className="empty">
          История появится после отправки. Старые адреса, стёртые заменой базы,
          можно вернуть кнопкой «Вернуть отправленные».
        </div>
      </div>
    );
  }

  return (
    <div className="panel stack">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="row">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск по адресу"
            style={{ minWidth: 220 }}
          />
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            {STATUS_FILTERS.map((item) => (
              <option key={item.value || "all"} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <select value={source} onChange={(event) => setSource(event.target.value)}>
            <option value="">Все источники</option>
            <option value="restore">Unisender</option>
            <option value="worker">Отправка</option>
          </select>
        </div>
        <button className="btn btn-secondary" type="button" onClick={exportCsv}>
          Скачать CSV ({filtered.length})
        </button>
      </div>
      <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
        Показано {filtered.length.toLocaleString("ru-RU")} из{" "}
        {rows.length.toLocaleString("ru-RU")}. Это журнал событий, не текущая
        очередь отправки.
      </p>
      {filtered.length === 0 ? (
        <div className="empty">По этому фильтру ничего нет.</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Когда</th>
              <th>Адрес</th>
              <th>Статус</th>
              <th>Источник</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 500).map((row) => (
              <tr key={row.id}>
                <td className="muted">{row.sentAt}</td>
                <td>
                  <strong>{row.email}</strong>
                  {row.label ? (
                    <div className="muted" style={{ fontSize: "0.85rem" }}>
                      {row.label}
                    </div>
                  ) : null}
                  {row.error ? (
                    <div className="muted" style={{ fontSize: "0.85rem" }}>
                      {row.error}
                    </div>
                  ) : null}
                </td>
                <td>{row.statusLabel}</td>
                <td className="muted">
                  {row.source === "restore" ? "Unisender" : "Отправка"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {filtered.length > 500 ? (
        <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
          На экране первые 500. В CSV попадут все {filtered.length}.
        </p>
      ) : null}
    </div>
  );
}
