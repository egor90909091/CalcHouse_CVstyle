export default function CalculatingLoader() {
  return (
    <div className="calc-loader-overlay">
      <div className="calc-loader-card">
        <div className="calc-loader-house">
          <svg viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="loaderGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="var(--accent)" />
                <stop offset="100%" stopColor="#60a5fa" />
              </linearGradient>
            </defs>

            {/* Blueprint grid */}
            <g opacity="0.08" stroke="var(--accent)" strokeWidth="0.5">
              {Array.from({ length: 9 }, (_, i) => (
                <line key={`h${i}`} x1={0} y1={i * 20 + 10} x2={180} y2={i * 20 + 10} />
              ))}
              {Array.from({ length: 9 }, (_, i) => (
                <line key={`v${i}`} x1={i * 20 + 10} y1={0} x2={i * 20 + 10} y2={180} />
              ))}
            </g>

            {/* Roof — drawn progressively */}
            <polyline
              className="calc-stroke-line"
              points="15,120 90,30 165,120"
              stroke="url(#loaderGrad)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Walls */}
            <polyline
              className="calc-stroke-line calc-stroke-delay-1"
              points="35,120 35,170 145,170 145,120"
              stroke="url(#loaderGrad)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Door */}
            <rect
              className="calc-stroke-line calc-stroke-delay-2"
              x="80" y="140" width="20" height="30" rx="2"
              stroke="url(#loaderGrad)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {/* Left window */}
            <rect
              className="calc-stroke-line calc-stroke-delay-3"
              x="52" y="132" width="16" height="16" rx="2"
              stroke="url(#loaderGrad)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              className="calc-stroke-line calc-stroke-delay-3"
              x1="60" y1="132" x2="60" y2="148"
              stroke="url(#loaderGrad)" strokeWidth="1.5" strokeLinecap="round"
            />
            <line
              className="calc-stroke-line calc-stroke-delay-3"
              x1="52" y1="140" x2="68" y2="140"
              stroke="url(#loaderGrad)" strokeWidth="1.5" strokeLinecap="round"
            />

            {/* Right window */}
            <rect
              className="calc-stroke-line calc-stroke-delay-3"
              x="112" y="132" width="16" height="16" rx="2"
              stroke="url(#loaderGrad)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              className="calc-stroke-line calc-stroke-delay-3"
              x1="120" y1="132" x2="120" y2="148"
              stroke="url(#loaderGrad)" strokeWidth="1.5" strokeLinecap="round"
            />
            <line
              className="calc-stroke-line calc-stroke-delay-3"
              x1="112" y1="140" x2="128" y2="140"
              stroke="url(#loaderGrad)" strokeWidth="1.5" strokeLinecap="round"
            />

            {/* Foundation line */}
            <line
              className="calc-stroke-line calc-stroke-delay-4"
              x1="25" y1="170" x2="155" y2="170"
              stroke="url(#loaderGrad)" strokeWidth="3" strokeLinecap="round"
            />

            {/* Rising particles */}
            <circle className="calc-particle calc-particle-1" cx="90" cy="110" r="2.5" fill="url(#loaderGrad)" opacity="0" />
            <circle className="calc-particle calc-particle-2" cx="60" cy="90" r="2" fill="url(#loaderGrad)" opacity="0" />
            <circle className="calc-particle calc-particle-3" cx="120" cy="85" r="2" fill="url(#loaderGrad)" opacity="0" />
            <circle className="calc-particle calc-particle-4" cx="80" cy="65" r="1.5" fill="url(#loaderGrad)" opacity="0" />
          </svg>
        </div>

        <div className="calc-loader-text">Рассчитываем смету</div>

        <div className="calc-loader-dots">
          <span className="calc-dot" />
          <span className="calc-dot calc-dot-2" />
          <span className="calc-dot calc-dot-3" />
        </div>

        <div className="calc-loader-bar">
          <div className="calc-loader-bar-fill" />
        </div>
      </div>
    </div>
  );
}
