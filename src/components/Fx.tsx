import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { rupiah } from "../lib";

/** Angka rupiah yang berhitung naik/turun dengan halus. */
export function CountUp({ value }: { value: number }) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      from.current = value;
      setShown(value);
      return;
    }
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min((t - start) / 700, 1);
      const v = Math.round(a + (value - a) * (1 - Math.pow(1 - p, 3)));
      from.current = v;
      setShown(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <>{rupiah(shown)}</>;
}

const GLYPHS = ["♥", "✦", "●", "♥", "✦"];
const COLORS = ["#c24b6b", "#f3b9c6", "#f2c14e", "#7aa58f", "#e08aa0"];

/** Hujan kecil berbentuk hati dan bintang, dipakai saat target tercapai. */
export function Confetti({ onDone }: { onDone: () => void }) {
  const items = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        id: i,
        g: GLYPHS[i % GLYPHS.length],
        color: COLORS[i % COLORS.length],
        left: Math.random() * 100,
        delay: Math.random() * 0.4,
        dur: 1.6 + Math.random() * 1.2,
        size: 10 + Math.random() * 12,
        drift: (Math.random() - 0.5) * 140,
      })),
    []
  );

  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="confetti" aria-hidden="true">
      {items.map((p) => (
        <span
          key={p.id}
          style={
            {
              left: `${p.left}%`,
              color: p.color,
              fontSize: p.size,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.dur}s`,
              "--drift": `${p.drift}px`,
            } as CSSProperties
          }
        >
          {p.g}
        </span>
      ))}
    </div>
  );
}

/** Koin emas kecil yang melayang pelan di latar belakang. */
export function FloatingCoins() {
  return (
    <div className="coins" aria-hidden="true">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className="coin-dot"
          style={{
            left: `${8 + i * 16}%`,
            width: 12 + (i % 3) * 7,
            height: 12 + (i % 3) * 7,
            animationDelay: `${i * 1.3}s`,
            animationDuration: `${11 + (i % 3) * 3}s`,
          }}
        />
      ))}
    </div>
  );
}