import { useState, type FormEvent } from "react";
import { GOAL_EMOJIS, QUICK_TARGETS, rupiah, today } from "../lib";

export interface GoalValues {
  name: string;
  emoji: string;
  targetAmount: string;
  deadline: string;
  shared: boolean;
}

interface Props {
  initial: GoalValues;
  busy: boolean;
  /** Jenis target (pribadi/berdua) tidak bisa diubah setelah dibuat. */
  lockShared: boolean;
  onSubmit: (v: GoalValues) => void;
}

const short = (n: number): string => (n >= 1000000 ? `${n / 1000000}jt` : `${n / 1000}rb`);

export default function GoalForm({ initial, busy, lockShared, onSubmit }: Props) {
  const [v, setV] = useState<GoalValues>(initial);
  const [err, setErr] = useState("");
  const target = Number(v.targetAmount);
  const set = (patch: Partial<GoalValues>) => setV((p) => ({ ...p, ...patch }));

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!v.name.trim()) return setErr("Kasih nama targetnya dulu.");
    if (!(target > 0)) return setErr("Isi nominal targetnya.");
    setErr("");
    onSubmit(v);
  };

  return (
    <form className="form" onSubmit={submit}>
      <label>Jenis target</label>
      <div className="toggle" role="group" aria-label="Jenis target">
        <button
          type="button"
          disabled={lockShared}
          aria-pressed={!v.shared}
          className={!v.shared ? "on" : ""}
          onClick={() => set({ shared: false })}
        >
          Pribadi
        </button>
        <button
          type="button"
          disabled={lockShared}
          aria-pressed={v.shared}
          className={v.shared ? "on" : ""}
          onClick={() => set({ shared: true })}
        >
          Berdua
        </button>
      </div>
      <p className="preview">
        {v.shared
          ? "Bisa diisi tabungan oleh kalian berdua, progresnya digabung."
          : "Hanya kamu yang bisa menabung untuk target ini."}
      </p>

      <label htmlFor="gname">Nama target</label>
      <input
        id="gname"
        placeholder="Contoh: Liburan ke Bali"
        maxLength={30}
        value={v.name}
        onChange={(e) => set({ name: e.target.value })}
      />

      <label>Ikon</label>
      <div className="chips" role="group" aria-label="Pilih ikon">
        {GOAL_EMOJIS.map((em) => (
          <button
            type="button"
            key={em}
            aria-pressed={v.emoji === em}
            aria-label={`Ikon ${em}`}
            className={"chip emo" + (v.emoji === em ? " on" : "")}
            onClick={() => set({ emoji: em })}
          >
            {em}
          </button>
        ))}
      </div>

      <label htmlFor="gamt">Target nominal</label>
      <div className="money">
        <span>Rp</span>
        <input
          id="gamt"
          type="number"
          inputMode="numeric"
          min="1"
          placeholder="0"
          value={v.targetAmount}
          onChange={(e) => set({ targetAmount: e.target.value })}
        />
      </div>
      <div className="chips" role="group" aria-label="Target cepat">
        {QUICK_TARGETS.map((q) => (
          <button type="button" key={q} className="chip" onClick={() => set({ targetAmount: String(q) })}>
            {short(q)}
          </button>
        ))}
      </div>
      {target > 0 && (
        <p className="preview">
          Target <b>{rupiah(target)}</b>
        </p>
      )}

      <label htmlFor="gdl">Tenggat (opsional)</label>
      <input
        id="gdl"
        type="date"
        min={today()}
        value={v.deadline}
        onChange={(e) => set({ deadline: e.target.value })}
      />

      {err && <p className="err">{err}</p>}
      <button type="submit" className="btn pri big" disabled={busy}>
        {busy ? "Menyimpan..." : "Simpan target"}
      </button>
    </form>
  );
}