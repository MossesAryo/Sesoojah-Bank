import { useState, type FormEvent } from "react";
import type { Goal } from "../types";
import { METHODS, QUICK_AMOUNTS, rupiah } from "../lib";

export interface SavingValues {
  amount: string;
  date: string;
  note: string;
  goalId: string | null;
  method: string;
}

interface Props {
  goals: Goal[];
  initial: SavingValues;
  busy: boolean;
  onSubmit: (v: SavingValues) => void;
}

export default function SavingForm({ goals, initial, busy, onSubmit }: Props) {
  const [v, setV] = useState<SavingValues>(initial);
  const [err, setErr] = useState("");
  const amount = Number(v.amount);
  const set = (patch: Partial<SavingValues>) => setV((p) => ({ ...p, ...patch }));

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!(amount > 0)) return setErr("Isi jumlah tabungannya dulu.");
    if (!v.date) return setErr("Tanggalnya belum diisi.");
    setErr("");
    onSubmit(v);
  };

  return (
    <form className="form" onSubmit={submit}>
      <label htmlFor="amt">Jumlah</label>
      <div className="money">
        <span>Rp</span>
        <input
          id="amt"
          type="number"
          inputMode="numeric"
          min="1"
          placeholder="0"
          value={v.amount}
          onChange={(e) => set({ amount: e.target.value })}
        />
      </div>
      <div className="chips" role="group" aria-label="Tambah cepat">
        {QUICK_AMOUNTS.map((q) => (
          <button
            type="button"
            key={q}
            className="chip"
            onClick={() => set({ amount: String((Number(v.amount) || 0) + q) })}
          >
            +{q / 1000}rb
          </button>
        ))}
      </div>
      {amount > 0 && (
        <p className="preview">
          Menabung <b>{rupiah(amount)}</b>
        </p>
      )}

      <label>Untuk target</label>
      <div className="chips" role="group" aria-label="Pilih target">
        <button
          type="button"
          aria-pressed={v.goalId === null}
          className={"chip" + (v.goalId === null ? " on" : "")}
          onClick={() => set({ goalId: null })}
        >
          Tabungan umum
        </button>
        {goals.map((g) => (
          <button
            type="button"
            key={g.id}
            aria-pressed={v.goalId === g.id}
            className={"chip" + (v.goalId === g.id ? " on" : "")}
            onClick={() => set({ goalId: g.id })}
          >
            {g.emoji} {g.name}
            {g.shared && <small className="mini-tag">berdua</small>}
          </button>
        ))}
      </div>

      <label>Metode bayar</label>
      <div className="chips" role="group" aria-label="Metode bayar">
        {METHODS.map((m) => (
          <button
            type="button"
            key={m.id}
            aria-pressed={v.method === m.id}
            className={"chip" + (v.method === m.id ? " on" : "")}
            onClick={() => set({ method: m.id })}
          >
            <span className="dot" style={{ background: m.tone }} />
            {m.label}
          </button>
        ))}
      </div>

      <div className="row2">
        <div>
          <label htmlFor="tgl">Tanggal</label>
          <input id="tgl" type="date" value={v.date} onChange={(e) => set({ date: e.target.value })} />
        </div>
        <div>
          <label htmlFor="cat">Catatan (opsional)</label>
          <input
            id="cat"
            placeholder="Sisa uang jajan"
            maxLength={60}
            value={v.note}
            onChange={(e) => set({ note: e.target.value })}
          />
        </div>
      </div>

      {err && <p className="err">{err}</p>}
      <button type="submit" className="btn pri big" disabled={busy}>
        {busy ? "Menyimpan..." : "Simpan"}
      </button>
    </form>
  );
}