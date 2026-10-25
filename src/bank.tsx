import { useCallback, useEffect, useMemo, useState } from "react";
import { signOut, type User } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type DocumentData,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import type { Goal, Profile, Profiles, Saving } from "./types";
import { daysLeft, errMsg, fmtDate, methodOf, rupiah, today } from "./lib";
import { Confetti, CountUp } from "./components/Fx";
import Piggy from "./components/piggy";
import Modal from "./components/Modal";
import SavingForm, { type SavingValues } from "./components/SavingForm";
import GoalForm, { type GoalValues } from "./components/GoalForm";

type Sheet =
  | { kind: "saving"; editing: Saving | null; goalId: string | null }
  | { kind: "goal"; editing: Goal | null; shared: boolean }
  | null;

type Toast = { id: number; msg: string; bad: boolean } | null;

const toSaving = (id: string, d: DocumentData): Saving => ({
  id,
  userId: d.userId ?? "",
  amount: Number(d.amount) || 0,
  date: d.date ?? "",
  note: d.note ?? "",
  goalId: d.goalId ?? null,
  method: d.method ?? "cash",
});

const toGoal = (id: string, d: DocumentData): Goal => ({
  id,
  userId: d.userId ?? "",
  shared: d.shared === true,
  name: d.name ?? "",
  emoji: d.emoji ?? "🎯",
  targetAmount: Number(d.targetAmount) || 0,
  deadline: d.deadline ?? null,
  createdAt: Number(d.createdAt) || 0,
});

const lastMethod = (): string => {
  try {
    return localStorage.getItem("sb-method") || "cash";
  } catch {
    return "cash";
  }
};

export default function Bank({ user }: { user: User }) {
  const me = user.uid;
  const defaultName = (user.email || "Kamu").split("@")[0];

  const [savings, setSavings] = useState<Saving[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [profiles, setProfiles] = useState<Profiles>({});
  const [active, setActive] = useState<string>(me);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [delSaving, setDelSaving] = useState<string | null>(null);
  const [delGoal, setDelGoal] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [syncKey, setSyncKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const [coin, setCoin] = useState(0);
  const [party, setParty] = useState(0);

  const notify = useCallback(
    (msg: string, bad = false) => setToast({ id: Date.now(), msg, bad }),
    []
  );
  const clearParty = useCallback(() => setParty(0), []);
  const closeSheet = useCallback(() => setSheet(null), []);
  const resync = useCallback(() => setSyncKey((k) => k + 1), []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  // Semua data realtime. Ubah syncKey untuk memasang ulang listener (refresh).
  useEffect(() => {
    setLoadError(null);
    const onErr = (e: Error) => {
      setLoadError(errMsg(e));
      setLoading(false);
    };

    const offSavings = onSnapshot(
      query(collection(db, "savings"), orderBy("date", "desc")),
      (snap) => {
        setSavings(snap.docs.map((d) => toSaving(d.id, d.data())));
        setLoading(false);
      },
      onErr
    );

    const offGoals = onSnapshot(
      collection(db, "goals"),
      (snap) => setGoals(snap.docs.map((d) => toGoal(d.id, d.data())).sort((a, b) => a.createdAt - b.createdAt)),
      onErr
    );

    const offUsers = onSnapshot(
      collection(db, "users"),
      (snap) => {
        const p: Profiles = {};
        snap.docs.forEach((d) => {
          p[d.id] = d.data() as Profile;
        });
        setProfiles(p);
        if (!p[me]) setDoc(doc(db, "users", me), { name: defaultName }).catch(() => {});
      },
      onErr
    );

    return () => {
      offSavings();
      offGoals();
      offUsers();
    };
  }, [me, defaultName, syncKey]);

  // Kalau sempat error (misalnya rules baru diperbaiki), pulih otomatis saat kembali ke tab ini.
  useEffect(() => {
    if (!loadError) return;
    window.addEventListener("focus", resync);
    window.addEventListener("online", resync);
    return () => {
      window.removeEventListener("focus", resync);
      window.removeEventListener("online", resync);
    };
  }, [loadError, resync]);

  const partnerId = Object.keys(profiles).find((id) => id !== me);
  const tabs: string[] = partnerId ? [me, partnerId] : [me];
  const nameOf = (id: string): string => profiles[id]?.name || (id === me ? defaultName : "Pasangan");
  const isMine = active === me;

  useEffect(() => {
    setNameDraft(profiles[me]?.name || defaultName);
  }, [profiles, me, defaultName]);

  const totals = useMemo(() => {
    const t: Record<string, number> = {};
    savings.forEach((s) => {
      t[s.userId] = (t[s.userId] || 0) + s.amount;
    });
    return t;
  }, [savings]);

  // Total per target, dan sumbangan tiap orang per target
  const goalSaved = useMemo(() => {
    const t: Record<string, number> = {};
    savings.forEach((s) => {
      if (s.goalId) t[s.goalId] = (t[s.goalId] || 0) + s.amount;
    });
    return t;
  }, [savings]);

  const contrib = useMemo(() => {
    const t: Record<string, Record<string, number>> = {};
    savings.forEach((s) => {
      if (!s.goalId) return;
      const row = t[s.goalId] || {};
      row[s.userId] = (row[s.userId] || 0) + s.amount;
      t[s.goalId] = row;
    });
    return t;
  }, [savings]);

  const totalMe = totals[me] || 0;
  const totalPartner = partnerId ? totals[partnerId] || 0 : 0;
  const sharedGoals = goals.filter((g) => g.shared);
  const personalGoals = goals.filter((g) => !g.shared && g.userId === active);
  const formGoals = goals.filter((g) => g.shared || g.userId === me);
  const list = savings.filter((s) => s.userId === active);
  const goalById = (id: string | null): Goal | undefined => goals.find((g) => g.id === id);
  const canUse = (g: Goal): boolean => g.shared || g.userId === me;

  const switchTab = (id: string) => {
    setActive(id);
    setDelSaving(null);
    setDelGoal(null);
  };

  const saveName = async () => {
    const value = nameDraft.trim() || defaultName;
    if (value === nameOf(me)) return;
    try {
      await setDoc(doc(db, "users", me), { name: value }, { merge: true });
      notify("Nama panggilan disimpan.");
    } catch (e) {
      notify("Gagal menyimpan nama: " + errMsg(e), true);
    }
  };

  const saveSaving = async (v: SavingValues) => {
    if (sheet?.kind !== "saving") return;
    const editing = sheet.editing;
    const amount = Number(v.amount);
    const data = { amount, date: v.date, note: v.note.trim(), goalId: v.goalId, method: v.method };
    setBusy(true);
    try {
      if (editing) {
        await updateDoc(doc(db, "savings", editing.id), data);
        notify("Perubahan tersimpan.");
      } else {
        const g = goalById(v.goalId);
        const before = g ? goalSaved[g.id] || 0 : 0;
        await addDoc(collection(db, "savings"), { ...data, userId: me, createdAt: serverTimestamp() });
        try {
          localStorage.setItem("sb-method", v.method);
        } catch {
          /* abaikan */
        }
        setCoin(Date.now());
        const reached = !!g && g.targetAmount > 0 && before < g.targetAmount && before + amount >= g.targetAmount;
        if (reached) {
          setParty(Date.now());
          notify(`Target "${g?.name}" tercapai!`);
        } else {
          notify(`${rupiah(amount)} masuk ke ${g ? g.name : "tabungan umum"}.`);
        }
      }
      setSheet(null);
    } catch (e) {
      notify("Gagal menyimpan: " + errMsg(e), true);
    } finally {
      setBusy(false);
    }
  };

  const saveGoal = async (v: GoalValues) => {
    if (sheet?.kind !== "goal") return;
    const editing = sheet.editing;
    const data = {
      name: v.name.trim(),
      emoji: v.emoji,
      targetAmount: Number(v.targetAmount),
      deadline: v.deadline || null,
    };
    setBusy(true);
    try {
      if (editing) {
        await updateDoc(doc(db, "goals", editing.id), data);
        notify("Target diperbarui.");
      } else {
        await addDoc(collection(db, "goals"), { ...data, userId: me, shared: v.shared, createdAt: Date.now() });
        notify(`Target "${data.name}" dibuat.`);
      }
      setSheet(null);
    } catch (e) {
      notify("Gagal menyimpan target: " + errMsg(e), true);
    } finally {
      setBusy(false);
    }
  };

  const removeSaving = async (id: string) => {
    try {
      await deleteDoc(doc(db, "savings", id));
      notify("Tabungan dihapus.");
    } catch (e) {
      notify("Gagal menghapus: " + errMsg(e), true);
    }
    setDelSaving(null);
  };

  const removeGoal = async (g: Goal) => {
    try {
      await deleteDoc(doc(db, "goals", g.id));
      notify("Target dihapus. Tabungannya tetap tercatat sebagai tabungan umum.");
    } catch (e) {
      notify("Gagal menghapus target: " + errMsg(e), true);
    }
    setDelGoal(null);
  };

  const renderGoal = (g: Goal, i: number) => {
    const saved = goalSaved[g.id] || 0;
    const pct = g.targetAmount > 0 ? Math.min(100, Math.round((saved / g.targetAmount) * 100)) : 0;
    const done = g.targetAmount > 0 && saved >= g.targetAmount;
    const dl = g.deadline ? daysLeft(g.deadline) : null;
    const left = rupiah(Math.max(0, g.targetAmount - saved));
    const hint = done
      ? "Target tercapai"
      : dl !== null && dl < 0
        ? `Lewat tenggat · kurang ${left}`
        : dl !== null
          ? `${dl} hari lagi · kurang ${left}`
          : `Kurang ${left}`;
    const usable = canUse(g);

    return (
      <article className={"goal" + (done ? " done" : "")} key={g.id} style={{ animationDelay: `${i * 60}ms` }}>
        <div className="goal-top">
          <span className="goal-emoji" aria-hidden="true">
            {g.emoji}
          </span>
          <div className="goal-info">
            <h3>{g.name}</h3>
            <p>
              <b>{rupiah(saved)}</b> dari {rupiah(g.targetAmount)}
            </p>
          </div>
          <span className="pct">{done ? "✓" : `${pct}%`}</span>
        </div>
        <div
          className="bar"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progres ${g.name}`}
        >
          <i style={{ width: `${pct}%` }} />
        </div>
        {g.shared && (
          <p className="split">
            <span>
              {nameOf(me)} <b>{rupiah(contrib[g.id]?.[me] || 0)}</b>
            </span>
            {partnerId && (
              <span>
                {nameOf(partnerId)} <b>{rupiah(contrib[g.id]?.[partnerId] || 0)}</b>
              </span>
            )}
          </p>
        )}
        <div className="goal-foot">
          <span className="hint">{hint}</span>
          {usable &&
            (delGoal === g.id ? (
              <div className="acts">
                <button className="btn danger sm" onClick={() => removeGoal(g)}>
                  Yakin hapus?
                </button>
                <button className="link" onClick={() => setDelGoal(null)}>
                  Batal
                </button>
              </div>
            ) : (
              <div className="acts">
                <button
                  className="btn pri sm"
                  onClick={() => setSheet({ kind: "saving", editing: null, goalId: g.id })}
                >
                  Nabung
                </button>
                <button className="link" onClick={() => setSheet({ kind: "goal", editing: g, shared: g.shared })}>
                  Ubah
                </button>
                <button className="link bad" onClick={() => setDelGoal(g.id)}>
                  Hapus
                </button>
              </div>
            ))}
        </div>
      </article>
    );
  };

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <Piggy size={44} coinKey={coin} />
          <div>
            <h1>Sesoojah Bank</h1>
            <p>Halo, {nameOf(me)}</p>
          </div>
        </div>
        <button className="link" onClick={() => signOut(auth)}>
          Keluar
        </button>
      </header>

      {loadError && (
        <div className="banner" role="alert">
          <span>Data belum bisa dimuat: {loadError}</span>
          <button className="btn sm" onClick={resync}>
            Coba lagi
          </button>
        </div>
      )}

      <section className="hero" aria-label="Total tabungan">
        <p className="hero-label">Total tabungan berdua</p>
        <div className="hero-amount">
          <CountUp value={totalMe + totalPartner} />
        </div>
        <div className="stats">
          <div>
            <small>{nameOf(me)}</small>
            <b>
              <CountUp value={totalMe} />
            </b>
          </div>
          <div>
            <small>{partnerId ? nameOf(partnerId) : "Pasangan"}</small>
            <b>{partnerId ? <CountUp value={totalPartner} /> : "belum masuk"}</b>
          </div>
        </div>
      </section>

      {tabs.length > 1 && (
        <nav className="tabs" aria-label="Pilih tabungan">
          {tabs.map((id) => (
            <button
              key={id}
              className={id === active ? "on" : ""}
              aria-pressed={id === active}
              onClick={() => switchTab(id)}
            >
              {id === me ? "Punyaku" : nameOf(id)}
            </button>
          ))}
        </nav>
      )}

      <section aria-label="Target berdua">
        <div className="sec-head">
          <h2>Target berdua</h2>
          <button className="btn sm" onClick={() => setSheet({ kind: "goal", editing: null, shared: true })}>
            + Target
          </button>
        </div>
        {sharedGoals.length === 0 ? (
          <div className="empty">
            <p>Belum ada target berdua. Bikin satu untuk ditabung bareng.</p>
          </div>
        ) : (
          <div className="goals">{sharedGoals.map(renderGoal)}</div>
        )}
      </section>

      <section aria-label="Target pribadi">
        <div className="sec-head">
          <h2>{isMine ? "Target pribadi" : `Target ${nameOf(active)}`}</h2>
          {isMine && (
            <button className="btn sm" onClick={() => setSheet({ kind: "goal", editing: null, shared: false })}>
              + Target
            </button>
          )}
        </div>
        {personalGoals.length === 0 ? (
          <div className="empty">
            <p>{isMine ? "Belum ada target pribadi." : "Belum ada target pribadi di sini."}</p>
          </div>
        ) : (
          <div className="goals">{personalGoals.map(renderGoal)}</div>
        )}
      </section>

      <section aria-label="Riwayat tabungan">
        <div className="sec-head">
          <h2>Riwayat {isMine ? "punyaku" : nameOf(active)}</h2>
          <b className="sub-total">{rupiah(totals[active] || 0)}</b>
        </div>

        {loading && (
          <div className="empty">
            <p>Memuat data...</p>
          </div>
        )}
        {!loading && list.length === 0 && (
          <div className="empty">
            <Piggy size={52} bob />
            <p>{isMine ? "Celenganmu masih kosong. Mulai dari tombol Nabung." : "Belum ada tabungan di sini."}</p>
          </div>
        )}

        <ul className="list">
          {list.map((s, i) => {
            const m = methodOf(s.method);
            const g = goalById(s.goalId);
            return (
              <li className="tx" key={s.id} style={{ animationDelay: `${Math.min(i, 8) * 35}ms` }}>
                <span className="mbadge" style={{ background: m.tone + "1f", color: m.tone }} title={m.label}>
                  {m.short}
                </span>
                <div className="tx-main">
                  <b>+{rupiah(s.amount)}</b>
                  <div className="tx-meta">
                    <span className={"tag" + (g?.shared ? " shared" : "")}>
                      {g ? `${g.emoji} ${g.name}` : "Tabungan umum"}
                      {g?.shared ? " · berdua" : ""}
                    </span>
                    <span>{m.label}</span>
                    <span>{fmtDate(s.date)}</span>
                  </div>
                  {s.note && <p className="tx-note">“{s.note}”</p>}
                </div>
                {isMine &&
                  (delSaving === s.id ? (
                    <div className="acts">
                      <button className="btn danger sm" onClick={() => removeSaving(s.id)}>
                        Hapus
                      </button>
                      <button className="link" onClick={() => setDelSaving(null)}>
                        Batal
                      </button>
                    </div>
                  ) : (
                    <div className="acts">
                      <button
                        className="link"
                        onClick={() => setSheet({ kind: "saving", editing: s, goalId: s.goalId })}
                      >
                        Ubah
                      </button>
                      <button className="link bad" onClick={() => setDelSaving(s.id)}>
                        Hapus
                      </button>
                    </div>
                  ))}
              </li>
            );
          })}
        </ul>
      </section>

      {isMine && (
        <section className="card name-card">
          <label htmlFor="nick">Nama panggilan</label>
          <input
            id="nick"
            maxLength={20}
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={saveName}
          />
        </section>
      )}

      <button className="fab" onClick={() => setSheet({ kind: "saving", editing: null, goalId: null })}>
        + Nabung
      </button>

      {sheet?.kind === "saving" && (
        <Modal title={sheet.editing ? "Ubah tabungan" : "Nabung"} onClose={closeSheet}>
          <SavingForm
            goals={formGoals}
            busy={busy}
            onSubmit={saveSaving}
            initial={
              sheet.editing
                ? {
                    amount: String(sheet.editing.amount),
                    date: sheet.editing.date,
                    note: sheet.editing.note,
                    goalId: goalById(sheet.editing.goalId) ? sheet.editing.goalId : null,
                    method: sheet.editing.method,
                  }
                : { amount: "", date: today(), note: "", goalId: sheet.goalId, method: lastMethod() }
            }
          />
        </Modal>
      )}

      {sheet?.kind === "goal" && (
        <Modal title={sheet.editing ? "Ubah target" : "Target baru"} onClose={closeSheet}>
          <GoalForm
            busy={busy}
            lockShared={!!sheet.editing}
            onSubmit={saveGoal}
            initial={
              sheet.editing
                ? {
                    name: sheet.editing.name,
                    emoji: sheet.editing.emoji,
                    targetAmount: String(sheet.editing.targetAmount),
                    deadline: sheet.editing.deadline ?? "",
                    shared: sheet.editing.shared,
                  }
                : { name: "", emoji: "🎀", targetAmount: "", deadline: "", shared: sheet.shared }
            }
          />
        </Modal>
      )}

      {toast && (
        <div key={toast.id} className={"toast" + (toast.bad ? " bad" : "")} role="status">
          {toast.msg}
        </div>
      )}
      {party > 0 && <Confetti key={party} onDone={clearParty} />}
    </div>
  );
}