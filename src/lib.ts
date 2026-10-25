export const rupiah = (n: number): string =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

const pad = (n: number): string => String(n).padStart(2, "0");

export const today = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const fmtDate = (iso: string): string => {
  const d = new Date(iso + "T00:00:00");
  return isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
};

export const daysLeft = (iso: string): number =>
  Math.ceil((new Date(iso + "T23:59:59").getTime() - Date.now()) / 86400000);

export const errMsg = (e: unknown): string => {
  const code =
    typeof e === "object" && e !== null && "code" in e ? String((e as { code: unknown }).code) : "";
  if (code === "permission-denied") {
    return "Ditolak oleh rules Firestore. Cek rules dan UID di Firebase Console.";
  }
  return e instanceof Error ? e.message : String(e);
};

export interface Method {
  id: string;
  label: string;
  short: string; // kode singkat untuk lencana
  tone: string; // warna lencana
}

export const METHODS: Method[] = [
  { id: "cash", label: "Cash", short: "Rp", tone: "#3f7a55" },
  { id: "qris", label: "QRIS", short: "QR", tone: "#b8432f" },
  { id: "mandiri", label: "Mandiri", short: "MDR", tone: "#1f4e8c" },
  { id: "bca", label: "BCA", short: "BCA", tone: "#1f5fa8" },
  { id: "bri", label: "BRI", short: "BRI", tone: "#17609e" },
  { id: "bni", label: "BNI", short: "BNI", tone: "#c25e12" },
  { id: "gopay", label: "GoPay", short: "GP", tone: "#1c8a60" },
  { id: "ovo", label: "OVO", short: "OVO", tone: "#6b3fa0" },
  { id: "dana", label: "DANA", short: "DN", tone: "#1e63c4" },
  { id: "shopeepay", label: "ShopeePay", short: "SP", tone: "#c93a1f" },
  { id: "lainnya", label: "Lainnya", short: "···", tone: "#6f5f68" },
];

export const methodOf = (id: string): Method =>
  METHODS.find((m) => m.id === id) ?? METHODS[METHODS.length - 1];

export const GOAL_EMOJIS = ["🎀", "🏖️", "📱", "💻", "🛍️", "🏠", "✈️", "🎓", "💍", "🐶", "🎁", "🚗"];

export const QUICK_AMOUNTS = [10000, 20000, 50000, 100000];
export const QUICK_TARGETS = [500000, 1000000, 5000000, 10000000];