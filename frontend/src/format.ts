export function money(value: any): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "\u20B90";
  return `\u20B9${Math.round(n).toLocaleString("en-IN")}`;
}

export function fmtDateTime(value: any): string {
  if (!value) return "-";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";

  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function timeAgo(value: any): string {
  if (!value) return "-";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";

  const diff = Math.max(0, Date.now() - d.getTime());
  const seconds = Math.floor(diff / 1000);

  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  return fmtDateTime(value);
}
export function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
