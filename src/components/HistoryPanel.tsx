"use client";

import { useMemo, useState } from "react";

export type HistoryRow = {
  id: string;
  email: string;
  label: string | null;
  status: string;
  statusLabel: string;
  error: string | null;
  fromEmail: string;
  day: string;
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
  const [sender, setSender] = useState("");

  const senders = useMemo(() => {
    const unique = new Set(rows.map((row) => row.fromEmail || "Без отправителя"));
    return [...unique].sort((a, b) => a.localeCompare(b, "ru"));
  }, [rows]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      const rowSender = row.fromEmail || "Без отправителя";
      if (status === "FAILED" ? !ERROR_STATUSES.has(row.status) : status && row.status !== status) {
        return false;
      }
      if (sender && rowSender !== sender) return false;
      if (!needle) return true;
      return (
        row.email.toLowerCase().includes(needle) ||
        (row.label ?? "").toLowerCase().includes(needle) ||
        (row.error ?? "").toLowerCase().includes(needle)
      );
    });
  }, [query, rows, sender, status]);

  const groups = useMemo(() => {
    const bySender = new Map<string, Map<string, HistoryRow[]>>();
    for (const row of filtered) {
      const rowSender = row.fromEmail || "Без отправителя";
      const byDay = bySender.get(rowSender) ?? new Map<string, HistoryRow[]>();
      const dayRows = byDay.get(row.day) ?? [];
      dayRows.push(row);
      byDay.set(row.day, dayRows);
      bySender.set(rowSender, byDay);
    }
    return [...bySender.entries()];
  }, [filtered]);

  function exportCsv() {
    const header = ["Отправитель", "Дата", "Когда", "Email", "Имя", "Статус", "Ошибка"];
    const lines = [
      header.map(csvCell).join(";"),
      ...filtered.map((row) =>
        [
          row.fromEmail || "Без отправителя",
          row.day,
          row.sentAt,
          row.email,
          row.label ?? "",
          row.statusLabel,
          row.error ?? "",
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
    link.download = "sends.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  if (rows.length === 0) {
    return (
      <div className="panel">
        <div className="empty">
          Здесь появятся отправки. Они остаются отдельно от текущей базы и группируются по отправителю.
        </div>
      </div>
    );
  }

  let shown = 0;

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
          <select value={sender} onChange={(event) => setSender(event.target.value)}>
            <option value="">Все отправители</option>
            {senders.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            {STATUS_FILTERS.map((item) => (
              <option key={item.value || "all"} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <button className="btn btn-secondary" type="button" onClick={exportCsv}>
          Скачать CSV ({filtered.length})
        </button>
      </div>
      <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
        {filtered.length.toLocaleString("ru-RU")} писем
        {groups.length > 0
          ? `, ${groups.length.toLocaleString("ru-RU")} по отправителю`
          : ""}
        . Это не очередь для «Запустить».
      </p>
      {filtered.length === 0 ? (
        <div className="empty">По этому фильтру ничего нет.</div>
      ) : (
        groups.map(([rowSender, days]) => {
          const senderCount = [...days.values()].reduce((sum, items) => sum + items.length, 0);
          return (
            <section key={rowSender} className="stack">
              <h2 style={{ fontSize: "1.05rem", margin: 0 }}>
                {rowSender}
                <span className="muted" style={{ fontWeight: 500 }}>
                  {" "}
                  · {senderCount.toLocaleString("ru-RU")}
                </span>
              </h2>
              {[...days.entries()].map(([day, items]) => (
                <div key={`${rowSender}-${day}`} className="stack">
                  <h3 className="muted" style={{ fontSize: "0.92rem", margin: 0, fontWeight: 600 }}>
                    {day} · {items.length.toLocaleString("ru-RU")}
                  </h3>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Когда</th>
                        <th>Адрес</th>
                        <th>Статус</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((row) => {
                        if (shown >= 500) return null;
                        shown += 1;
                        return (
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
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
            </section>
          );
        })
      )}
      {filtered.length > 500 ? (
        <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
          На экране первые 500. В CSV попадут все {filtered.length}.
        </p>
      ) : null}
    </div>
  );
}
