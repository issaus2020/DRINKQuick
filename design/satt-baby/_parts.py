SVG = '<svg class="baby" viewBox="0 0 140 190" style="width: {W}px; height: {H}px" role="img" aria-label="{ALT}">\n        <defs>\n          <clipPath id="belly{ID}">\n            <path d="M70 80 C 40 80, 26 100, 26 124 C 26 150, 44 166, 70 166 C 96 166, 114 150, 114 124 C 114 100, 100 80, 70 80 Z"></path>\n          </clipPath>\n        </defs>\n\n        <g style="transform: rotate({TILT}deg); transform-origin: 70px 110px">\n          <ellipse class="ink paper" cx="54" cy="169" rx="12" ry="8"></ellipse>\n          <ellipse class="ink paper" cx="86" cy="169" rx="12" ry="8"></ellipse>\n\n          <path class="ink paper" d="M70 80 C 40 80, 26 100, 26 124 C 26 150, 44 166, 70 166 C 96 166, 114 150, 114 124 C 114 100, 100 80, 70 80 Z"></path>\n\n          <g clip-path="url(#belly{ID})">\n            <rect x="20" y="{FILLTOP}" width="100" height="120" fill="{LIQUID}"></rect>\n            <g style="transform: translate(-10px, {FILLTOP}px)">\n              <g class="wave">\n                <path d="M0 0 Q 12.5 -6, 25 0 T 50 0 T 75 0 T 100 0 T 125 0 T 150 0 T 175 0 T 200 0 L200 60 L0 60 Z" fill="{LIQUID}"></path>\n              </g>\n              <g class="wave wave--back">\n                <path d="M0 2 Q 12.5 -4, 25 2 T 50 2 T 75 2 T 100 2 T 125 2 T 150 2 T 175 2 T 200 2 L200 60 L0 60 Z" fill="{LIQUIDSOFT}"></path>\n              </g>\n            </g>\n          </g>\n\n          <circle class="ink paper" cx="30" cy="52" r="8"></circle>\n          <circle class="ink paper" cx="110" cy="52" r="8"></circle>\n          <circle class="ink paper" cx="70" cy="48" r="38"></circle>\n          <path class="ink" d="M62 12 Q70 2 79 11"></path>\n\n          <ellipse class="blush" cx="42" cy="60" rx="7" ry="4.5" style="opacity: {BLUSH}"></ellipse>\n          <ellipse class="blush" cx="98" cy="60" rx="7" ry="4.5" style="opacity: {BLUSH}"></ellipse>\n\n          <path class="face" d="{EYES}" style="stroke-width: {EYEW}px"></path>\n          <path class="face" d="{MOUTH}"></path>\n\n          <path class="ink" d="M34 100 C 20 106, 15 119, 21 129"></path>\n          <path class="ink" d="M106 100 C 120 106, 125 119, 119 129"></path>\n        </g>\n      </svg>'
STYLE = '\n    .ink {\n      fill: none;\n      stroke: #3b3a35;\n      stroke-width: 2.4;\n      stroke-linecap: round;\n      stroke-linejoin: round;\n    }\n    /* Kein Hautton: die Figur ist eine Linienzeichnung auf Papier, gefüllt ist\n       nur der Bauch. Was man sieht, ist also ausschließlich die Trinkmenge. */\n    .paper { fill: #ffffff; }\n    .face {\n      fill: none;\n      stroke: #3b3a35;\n      stroke-width: 4;\n      stroke-linecap: round;\n      stroke-linejoin: round;\n    }\n    .blush { fill: #e8836a; }\n    .wave { animation: flow 9s linear infinite; }\n    .wave--back { animation: flow 14s linear infinite reverse; opacity: 0.55; }\n    @keyframes flow { to { transform: translateX(-50px); } }\n    @media (prefers-reduced-motion: reduce) {\n      .wave { animation: none; }\n    }\n'
import math
def face(t):
    clamped = min(1.0, t)
    over = t > 1.02
    fill_top = 166 - clamped * 86
    md = 2 + clamped * 11
    mw = 9 + clamped * 4
    mouth = f'M{70 - mw:.1f} 64 Q70 {64 + md:.1f} {70 + mw:.1f} 64'
    if over:
        eyes, eyew = 'M50 46 Q56 53 62 46 M78 46 Q84 53 90 46', 4
    elif clamped >= 0.72:
        eyes, eyew = 'M50 50 Q56 41 62 50 M78 50 Q84 41 90 50', 4
    else:
        eyes, eyew = 'M56 47 L56 47 M84 47 L84 47', 8
    blush = max(0.0, min(0.5, (clamped - 0.45) / 0.55 * 0.5))
    return dict(
        FILLTOP=f'{fill_top:.1f}', MOUTH=mouth, EYES=eyes, EYEW=eyew,
        BLUSH=f'{blush:.2f}', TILT=f'{clamped * 3:.1f}',
        LIQUID='#72c972' if over else '#72a6e4',
        LIQUIDSOFT='#a8dda8' if over else '#a3c6ee',
    )
