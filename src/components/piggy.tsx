interface Props {
  size?: number;
  /** Ubah angkanya untuk memutar animasi koin masuk ke celengan. */
  coinKey?: number;
  /** Koin jatuh terus-menerus (untuk halaman login). */
  loop?: boolean;
  bob?: boolean;
}

export default function Piggy({ size = 40, coinKey = 0, loop = false, bob = false }: Props) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={"piggy" + (bob ? " bob" : "")}
      aria-hidden="true"
    >
      {(loop || coinKey > 0) && (
        <circle
          key={coinKey}
          className={"piggy-coin" + (loop ? " loop" : "")}
          cx="32"
          cy="6"
          r="5"
          fill="#f2c14e"
          stroke="#d9a62e"
          strokeWidth="1.5"
        />
      )}
      <g key={"b" + coinKey} className={coinKey > 0 ? "piggy-body jig" : "piggy-body"}>
        <path d="M11 33c-5-1-6-7-3-10" stroke="#e08aa0" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        <rect x="19" y="47" width="7" height="10" rx="3.5" fill="#e08aa0" />
        <rect x="38" y="47" width="7" height="10" rx="3.5" fill="#e08aa0" />
        <ellipse cx="32" cy="35" rx="23" ry="17" fill="#f3b9c6" />
        <path d="M17 23 14 11l12 7z" fill="#e08aa0" />
        <ellipse cx="54" cy="37" rx="6" ry="5" fill="#e08aa0" />
        <circle cx="52.4" cy="36.8" r="1" fill="#43283a" />
        <circle cx="55.8" cy="36.8" r="1" fill="#43283a" />
        <circle cx="46" cy="29" r="2" fill="#43283a" />
        <rect x="25" y="19" width="14" height="3.2" rx="1.6" fill="#43283a" opacity="0.6" />
        <ellipse cx="42" cy="38" rx="4" ry="2.6" fill="#f7cdd7" />
      </g>
    </svg>
  );
}