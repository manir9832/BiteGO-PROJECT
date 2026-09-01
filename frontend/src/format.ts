export const money = (n: number | undefined | null): string => {
  if (n === undefined || n === null) return "₹0";
  const v = Math.round(n * 100) / 100;
  return `₹${Number.isInteger(v) ? v : v.toFixed(2)}`;
};

export const timeAgo = (iso?: string): string => {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

export const fmtDateTime = (iso?: string): string => {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
  });
};

export const genId = (): string =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
