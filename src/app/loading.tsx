// app/loading.tsx — Next.js App Router loading UI

export default function Loading() {
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "#030a04", zIndex: 9999 }}
    >

      {/* ══════════════════════════════════════════
          SAVANNA BACKGROUND SCENE
          ══════════════════════════════════════════ */}
      <svg
        viewBox="0 0 1400 700"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          {/* Sky gradient — deep night to golden horizon */}
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#020804" />
            <stop offset="30%"  stopColor="#051208" />
            <stop offset="58%"  stopColor="#0a1e0e" />
            <stop offset="75%"  stopColor="#1a3d18" />
            <stop offset="88%"  stopColor="#6b3a00" />
            <stop offset="95%"  stopColor="#c46800" />
            <stop offset="100%" stopColor="#e88200" />
          </linearGradient>

          {/* Ground gradient */}
          <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#1a3d18" />
            <stop offset="100%" stopColor="#050f06" />
          </linearGradient>

          {/* Cheetah body gradient — real cheetah tawny orange */}
          <radialGradient id="ch-body" cx="38%" cy="32%" r="62%">
            <stop offset="0%"   stopColor="#fcd06a" />
            <stop offset="50%"  stopColor="#e8960a" />
            <stop offset="100%" stopColor="#9a5208" />
          </radialGradient>

          {/* Dust cloud */}
          <radialGradient id="dust" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#c46800" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#c46800" stopOpacity="0" />
          </radialGradient>

          {/* Moon glow */}
          <radialGradient id="moon-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#fff8e0" stopOpacity="0.55" />
            <stop offset="40%"  stopColor="#ffe090" stopOpacity="0.20" />
            <stop offset="100%" stopColor="#ffe090" stopOpacity="0" />
          </radialGradient>

          {/* Horizon glow */}
          <radialGradient id="horizon-glow" cx="50%" cy="100%" r="60%">
            <stop offset="0%"   stopColor="#e88200" stopOpacity="0.55" />
            <stop offset="60%"  stopColor="#c46800" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#c46800" stopOpacity="0" />
          </radialGradient>

          {/* Speed line blur */}
          <filter id="speed-blur">
            <feGaussianBlur in="SourceGraphic" stdDeviation="0 1.5" />
          </filter>

          {/* Soft glow filter */}
          <filter id="soft-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feFlood floodColor="#e8960a" floodOpacity="0.30" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* ── Sky ── */}
        <rect width="1400" height="700" fill="url(#sky)" />

        {/* ── Horizon atmospheric glow ── */}
        <rect x="0" y="400" width="1400" height="300" fill="url(#horizon-glow)" />

        {/* ── Moon ── */}
        <circle cx="220" cy="90" r="55" fill="url(#moon-glow)" />
        <circle cx="220" cy="90" r="28" fill="#fff8e0" opacity="0.88" />
        <circle cx="220" cy="90" r="26" fill="#fef3c0" opacity="0.92" />
        {/* Crescent shadow */}
        <circle cx="230" cy="86" r="22" fill="#0a1e0e" opacity="0.65" />

        {/* ── Stars ── */}
        {[
          [80,35,1.2],[140,18,0.8],[180,52,1.0],[320,28,0.7],[400,14,1.1],[480,42,0.8],
          [560,22,0.9],[640,38,1.2],[700,16,0.7],[780,44,1.0],[850,25,0.8],[920,10,1.1],
          [990,36,0.9],[1060,20,0.7],[1120,48,1.0],[1180,30,0.8],[1250,12,0.9],[1310,40,1.1],
          [1360,22,0.7],[60,70,0.6],[280,60,0.7],[450,72,0.6],[610,58,0.8],[750,74,0.6],
          [880,62,0.7],[1010,68,0.6],[1140,56,0.7],[1300,70,0.6],[350,50,0.5],[1080,50,0.5],
        ].map(([cx, cy, r], i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="white"
            opacity={0.4 + Math.sin(i * 1.7) * 0.3}
            style={{ animation: `fade-in ${1 + (i % 3) * 0.4}s ease ${(i % 5) * 0.3}s both` }}
          />
        ))}

        {/* ── Distant hills silhouette ── */}
        <path
          d="M 0,440 Q 80,415 180,428 Q 280,440 380,418 Q 480,398 580,415 Q 680,432 780,412 Q 880,392 980,408 Q 1080,425 1180,405 Q 1280,388 1400,415 L 1400,700 L 0,700 Z"
          fill="#0e2410"
          opacity="0.85"
        />

        {/* ── Near hill / ground base ── */}
        <path
          d="M 0,468 Q 150,452 300,462 Q 450,472 600,455 Q 750,438 900,455 Q 1050,468 1200,452 Q 1300,440 1400,458 L 1400,700 L 0,700 Z"
          fill="#0a1e0c"
        />

        {/* ── Ground ── */}
        <path
          d="M 0,500 Q 350,488 700,494 Q 1050,500 1400,490 L 1400,700 L 0,700 Z"
          fill="url(#ground)"
        />

        {/* ══ ACACIA TREES (silhouettes) ══ */}

        {/* Tree 1 — far right, small */}
        <g opacity="0.90">
          <rect x="1282" y="418" width="5" height="52" rx="2" fill="#030a04" />
          <line x1="1284" y1="435" x2="1256" y2="424" stroke="#030a04" strokeWidth="3" strokeLinecap="round" />
          <line x1="1284" y1="448" x2="1308" y2="438" stroke="#030a04" strokeWidth="2.5" strokeLinecap="round" />
          <ellipse cx="1284" cy="412" rx="44" ry="10" fill="#030a04" />
          <ellipse cx="1268" cy="415" rx="26" ry="8" fill="#030a04" />
          <ellipse cx="1302" cy="414" rx="24" ry="8" fill="#030a04" />
        </g>

        {/* Tree 2 — right, medium */}
        <g opacity="0.92">
          <rect x="1118" y="402" width="6" height="66" rx="2.5" fill="#030a04" />
          <line x1="1121" y1="424" x2="1086" y2="410" stroke="#030a04" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="1121" y1="440" x2="1154" y2="428" stroke="#030a04" strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="1121" cy="394" rx="58" ry="13" fill="#030a04" />
          <ellipse cx="1100" cy="398" rx="34" ry="10" fill="#030a04" />
          <ellipse cx="1144" cy="397" rx="32" ry="10" fill="#030a04" />
        </g>

        {/* Tree 3 — right-center, larger */}
        <g opacity="0.94">
          <rect x="952" y="383" width="7" height="85" rx="3" fill="#040c05" />
          <line x1="955" y1="410" x2="910" y2="394" stroke="#040c05" strokeWidth="4" strokeLinecap="round" />
          <line x1="955" y1="432" x2="996" y2="418" stroke="#040c05" strokeWidth="3.5" strokeLinecap="round" />
          <ellipse cx="955" cy="373" rx="72" ry="16" fill="#040c05" />
          <ellipse cx="932" cy="378" rx="44" ry="12" fill="#040c05" />
          <ellipse cx="980" cy="377" rx="40" ry="12" fill="#040c05" />
        </g>

        {/* Tree 4 — left of cheetah */}
        <g opacity="0.92">
          <rect x="272" y="398" width="6" height="70" rx="2.5" fill="#030a04" />
          <line x1="275" y1="418" x2="244" y2="406" stroke="#030a04" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="275" y1="435" x2="306" y2="424" stroke="#030a04" strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="275" cy="390" rx="60" ry="13" fill="#030a04" />
          <ellipse cx="256" cy="394" rx="36" ry="10" fill="#030a04" />
          <ellipse cx="298" cy="393" rx="33" ry="10" fill="#030a04" />
        </g>

        {/* Tree 5 — far left, small */}
        <g opacity="0.88">
          <rect x="72" y="422" width="4" height="48" rx="2" fill="#030a04" />
          <line x1="74" y1="437" x2="52" y2="428" stroke="#030a04" strokeWidth="2.5" strokeLinecap="round" />
          <ellipse cx="74" cy="416" rx="40" ry="9" fill="#030a04" />
          <ellipse cx="60" cy="419" rx="22" ry="7" fill="#030a04" />
          <ellipse cx="90" cy="418" rx="20" ry="7" fill="#030a04" />
        </g>

        {/* ══ SPEED LINES (behind cheetah) ══ */}
        {[
          [170,460,290,3.5,0.55],[175,472,260,2.5,0.42],[168,482,220,2,0.35],
          [172,490,180,1.5,0.28],[170,450,320,2,0.38],[173,500,140,1.2,0.22],
          [169,444,380,2.8,0.30],[176,510,100,1,0.18],[171,436,200,1.5,0.25],
        ].map(([x1, y, len, sw, op], i) => (
          <line key={i} x1={x1} y1={y} x2={x1 as number + (len as number)} y2={y}
            stroke="#e8960a" strokeWidth={sw} strokeLinecap="round" opacity={op}
            filter="url(#speed-blur)"
          />
        ))}

        {/* ══ RUNNING CHEETAH ══ */}
        <g filter="url(#soft-glow)" style={{ animation: "float 3.5s ease-in-out infinite" }}>

          {/* Queue */}
          <path d="M 480,455 Q 418,428 424,385 Q 428,360 445,352" stroke="#c07820" strokeWidth="10" fill="none" strokeLinecap="round" />
          <path d="M 445,352 Q 440,340 450,332" stroke="#e8960a" strokeWidth="7" fill="none" strokeLinecap="round" />

          {/* Pattes arrières — galop aérien */}
          <path d="M 560,478 Q 510,518 480,508 L 458,538" stroke="#c07820" strokeWidth="12" fill="none" strokeLinecap="round" />
          <path d="M 540,480 Q 492,516 462,506 L 440,534" stroke="#9a5208" strokeWidth="10" fill="none" strokeLinecap="round" />
          {/* Sabots arrières */}
          <ellipse cx="458" cy="538" rx="18" ry="8" fill="#7a3c08" transform="rotate(14,458,538)" />
          <ellipse cx="440" cy="534" rx="16" ry="7" fill="#7a3c08" transform="rotate(14,440,534)" />

          {/* Corps principal */}
          <path
            d="M 490,462 C 535,418 600,408 670,415 C 720,420 745,430 775,438 L 770,468 C 740,494 695,500 650,498 C 590,500 535,498 490,475 Z"
            fill="url(#ch-body)"
          />

          {/* Épaule / poitrail */}
          <ellipse cx="768" cy="460" rx="28" ry="34" fill="#d4840a" transform="rotate(-8,768,460)" />

          {/* Pattes avant — galop aérien */}
          <path d="M 778,494 Q 818,534 840,524 L 860,554" stroke="#c07820" strokeWidth="12" fill="none" strokeLinecap="round" />
          <path d="M 762,498 Q 800,538 822,528 L 842,558" stroke="#9a5208" strokeWidth="10" fill="none" strokeLinecap="round" />
          {/* Sabots avant */}
          <ellipse cx="860" cy="554" rx="18" ry="8" fill="#7a3c08" transform="rotate(-14,860,554)" />
          <ellipse cx="842" cy="558" rx="16" ry="7" fill="#7a3c08" transform="rotate(-14,842,558)" />

          {/* Griffes orange sur patte avant */}
          <path d="M 856,558 Q 878,546 886,564" stroke="#f4a321" strokeWidth="7" fill="none" strokeLinecap="round" opacity="0.95" />
          <path d="M 840,562 Q 860,550 868,568" stroke="#f4a321" strokeWidth="6" fill="none" strokeLinecap="round" opacity="0.85" />
          <circle cx="886" cy="564" r="5" fill="rgba(255,210,100,0.80)" />
          <circle cx="868" cy="568" r="4.5" fill="rgba(255,210,100,0.70)" />

          {/* Encolure */}
          <path d="M 775,438 Q 800,438 820,432" stroke="#d48010" strokeWidth="36" fill="none" strokeLinecap="round" />

          {/* Tête */}
          <ellipse cx="830" cy="430" rx="40" ry="30" fill="#e8960a" transform="rotate(-12,830,430)" />
          <ellipse cx="835" cy="428" rx="38" ry="28" fill="url(#ch-body)" transform="rotate(-12,835,428)" />

          {/* Oreille */}
          <path d="M 812,406 L 828,376 L 844,404 Z" fill="#c07820" />
          <path d="M 814,406 L 828,380 L 842,404 Z" fill="#3a1a00" opacity="0.80" />

          {/* Museau */}
          <ellipse cx="868" cy="444" rx="18" ry="14" fill="#f0b840" transform="rotate(-10,868,444)" />

          {/* Truffe */}
          <ellipse cx="882" cy="440" rx="6.5" ry="4.5" fill="#2a0e00" opacity="0.88" />

          {/* Œil vert */}
          <circle cx="850" cy="414" r="10" fill="white" opacity="0.95" />
          <circle cx="850" cy="414" r="6.5" fill="#00b050" />
          <circle cx="850" cy="414" r="3.2" fill="#003d18" />
          <circle cx="852.5" cy="411.5" r="2.2" fill="white" />

          {/* Larmes du guépard */}
          <path d="M 848,422 Q 842,436 838,452" stroke="#1a0500" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.90" />
          <path d="M 854,422 Q 850,436 848,452" stroke="#1a0500" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.80" />

          {/* Taches noires */}
          <circle cx="570" cy="428" r="8" fill="rgba(20,8,0,0.36)" />
          <circle cx="608" cy="418" r="7" fill="rgba(20,8,0,0.33)" />
          <circle cx="588" cy="448" r="8.5" fill="rgba(20,8,0,0.35)" />
          <circle cx="636" cy="436" r="6.5" fill="rgba(20,8,0,0.32)" />
          <circle cx="556" cy="448" r="7" fill="rgba(20,8,0,0.32)" />
          <circle cx="540" cy="432" r="6" fill="rgba(20,8,0,0.30)" />
          <circle cx="658" cy="452" r="6" fill="rgba(20,8,0,0.30)" />
          <circle cx="618" cy="456" r="6.5" fill="rgba(20,8,0,0.29)" />
          <circle cx="670" cy="432" r="5.5" fill="rgba(20,8,0,0.28)" />
          <circle cx="648" cy="418" r="6" fill="rgba(20,8,0,0.28)" />
          <circle cx="700" cy="448" r="5" fill="rgba(20,8,0,0.26)" />
          <circle cx="690" cy="464" r="5.5" fill="rgba(20,8,0,0.25)" />

          {/* Reflet sur le dos */}
          <ellipse cx="610" cy="422" rx="55" ry="14" fill="rgba(255,255,255,0.09)" transform="rotate(-12,610,422)" />
        </g>

        {/* ══ NUAGE DE POUSSIÈRE (pattes) ══ */}
        <ellipse cx="462" cy="540" rx="48" ry="18" fill="url(#dust)" opacity="0.80" />
        <ellipse cx="442" cy="536" rx="38" ry="14" fill="url(#dust)" opacity="0.60" />
        <ellipse cx="855" cy="556" rx="44" ry="16" fill="url(#dust)" opacity="0.70" />
        <ellipse cx="838" cy="560" rx="35" ry="13" fill="url(#dust)" opacity="0.55" />

        {/* Particules de poussière */}
        <circle cx="435" cy="525" r="4" fill="#c46800" opacity="0.25" />
        <circle cx="418" cy="518" r="3" fill="#c46800" opacity="0.18" />
        <circle cx="875" cy="542" r="3.5" fill="#c46800" opacity="0.22" />
        <circle cx="892" cy="535" r="3" fill="#c46800" opacity="0.18" />

        {/* ══ HERBE EN AVANT-PLAN ══ */}
        {[80,190,340,510,680,820,960,1100,1250,1350].map((x, i) => (
          <g key={i} transform={`translate(${x},${540 + (i % 3) * 12})`}>
            <path d={`M 0,0 Q ${-6 + (i%3)*4},${-22 - (i%4)*8} ${-3 + (i%3)*3},${-38 - (i%4)*10}`} stroke="#0a2010" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d={`M 0,0 Q ${8 - (i%3)*3},${-18 - (i%4)*6} ${5 - (i%3)*2},${-32 - (i%4)*8}`} stroke="#0e2814" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d={`M 0,0 Q ${2 + (i%4)*2},${-24 - (i%3)*7} ${4 + (i%4)*2},${-40 - (i%3)*9}`} stroke="#122e18" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          </g>
        ))}

      </svg>

      {/* ══════════════════════════════════════════
          CONTENT OVERLAY (vignette + brand)
          ══════════════════════════════════════════ */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 60% 55% at 50% 42%, rgba(3,10,4,0.72) 0%, rgba(3,10,4,0.40) 55%, transparent 100%)",
        }}
        aria-hidden="true"
      />

      {/* ══════════════════════════════════════════
          BRAND LOADING CONTENT
          ══════════════════════════════════════════ */}
      <div className="relative z-10 flex flex-col items-center" style={{ animation: "fade-up 0.5s ease both" }}>
        {/* Logo */}
        <div className="relative logo-float" style={{ animationDelay: "0s" }}>
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(232,150,10,0.22) 0%, transparent 68%)",
              transform: "scale(1.3)",
              animation: "pulse-ring 2.5s ease-out infinite",
            }}
            aria-hidden="true"
          />

          {/* Inline logo SVG for performance */}
          <svg viewBox="0 0 120 120" width="110" height="110" xmlns="http://www.w3.org/2000/svg"
            style={{ animation: "logo-breathe 3.5s ease-in-out infinite" }}
          >
            <defs>
              <path id="ll-top" d="M 10,60 A 50,50 0 0,0 110,60" />
              <path id="ll-bot" d="M 10,60 A 50,50 0 0,1 110,60" />
              <radialGradient id="ll-body" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#fcd06a" />
                <stop offset="55%" stopColor="#e8960a" />
                <stop offset="100%" stopColor="#a85c08" />
              </radialGradient>
              <radialGradient id="ll-dark" cx="40%" cy="40%" r="65%">
                <stop offset="0%" stopColor="#d4840a" />
                <stop offset="100%" stopColor="#8a4a06" />
              </radialGradient>
              <radialGradient id="ll-inner" cx="30%" cy="30%" r="80%">
                <stop offset="0%" stopColor="#0d1f10" />
                <stop offset="100%" stopColor="#040b05" />
              </radialGradient>
              <linearGradient id="ll-claw" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f4a321" />
                <stop offset="100%" stopColor="#fb923c" />
              </linearGradient>
              <filter id="ll-aglow" x="-25%" y="-25%" width="150%" height="150%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feFlood floodColor="#e8960a" floodOpacity="0.45" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="glow" />
                <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <filter id="ll-oglow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feFlood floodColor="#f4a321" floodOpacity="0.50" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="glow" />
                <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            {/* Outer ring */}
            <g style={{ transformOrigin: "60px 60px", animation: "logo-ring-rotate 28s linear infinite" }}>
              <circle cx="60" cy="60" r="60" fill="#0e2214" />
              <circle cx="60" cy="60" r="59.5" fill="none" stroke="rgba(86,164,91,0.30)" strokeWidth="0.8" />
              <circle cx="60" cy="60" r="52.5" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="0.6" />
              <text fontFamily="'Helvetica Neue',Helvetica,Arial,sans-serif" fontSize="9" fontWeight="700" letterSpacing="2.5" fill="white">
                <textPath href="#ll-top" startOffset="13%">CheetahSoft</textPath>
              </text>
              <text fontFamily="'Helvetica Neue',Helvetica,Arial,sans-serif" fontSize="5.8" fontWeight="500" letterSpacing="0.6" fill="rgba(255,255,255,0.68)">
                <textPath href="#ll-bot" startOffset="5%">Project Management Software</textPath>
              </text>
              <circle cx="13" cy="61" r="3" fill="#56a45b" />
              <circle cx="107" cy="61" r="3" fill="#56a45b" />
              <circle cx="13" cy="61" r="1.2" fill="rgba(255,255,255,0.5)" />
              <circle cx="107" cy="61" r="1.2" fill="rgba(255,255,255,0.5)" />
            </g>

            {/* Inner badge */}
            <g style={{ transformOrigin: "60px 60px", animation: "logo-breathe 3.5s ease-in-out infinite" }}>
              <circle cx="60" cy="60" r="44" fill="url(#ll-inner)" />
              <circle cx="60" cy="60" r="44" fill="none" stroke="rgba(86,164,91,0.35)" strokeWidth="1.2" />

              {/* Cheetah profile */}
              <path d="M 33,63 Q 22,54 24,43 Q 26,36 30,34" stroke="#c07820" strokeWidth="3.8" fill="none" strokeLinecap="round" />
              <path d="M 30,34 Q 27,29 30,27" stroke="#e8960a" strokeWidth="2.6" fill="none" strokeLinecap="round" />
              <path d="M 40,67 Q 30,76 25,74 L 23,80" stroke="#c07820" strokeWidth="4.2" fill="none" strokeLinecap="round" />
              <path d="M 36,67 Q 27,74 23,72 L 21,78" stroke="#a05810" strokeWidth="3.6" fill="none" strokeLinecap="round" />
              <ellipse cx="23" cy="80" rx="3.2" ry="1.8" fill="#7a3c08" transform="rotate(12,23,80)" />
              <ellipse cx="21" cy="78" rx="2.8" ry="1.6" fill="#7a3c08" transform="rotate(12,21,78)" />
              <path d="M 34,64 Q 44,54 58,51 Q 69,50 76,53 L 75,61 Q 67,69 57,69 Q 44,70 34,66 Z" fill="url(#ll-body)" filter="url(#ll-aglow)" />
              <ellipse cx="73" cy="60" rx="7" ry="8.5" fill="url(#ll-dark)" transform="rotate(-8,73,60)" />
              <path d="M 75,68 Q 82,77 86,75 L 88,81" stroke="#c07820" strokeWidth="4.2" fill="none" strokeLinecap="round" />
              <path d="M 72,69 Q 78,78 82,76 L 84,82" stroke="#a05810" strokeWidth="3.6" fill="none" strokeLinecap="round" />
              <ellipse cx="88" cy="81" rx="3.2" ry="1.8" fill="#7a3c08" transform="rotate(-12,88,81)" />
              <ellipse cx="84" cy="82" rx="2.8" ry="1.6" fill="#7a3c08" transform="rotate(-12,84,82)" />
              <path d="M 86,82 Q 90,80 92,84" stroke="url(#ll-claw)" strokeWidth="2.8" fill="none" strokeLinecap="round" filter="url(#ll-oglow)" />
              <path d="M 82,83 Q 86,81 88,85" stroke="url(#ll-claw)" strokeWidth="2.4" fill="none" strokeLinecap="round" filter="url(#ll-oglow)" />
              <path d="M 76,53 Q 80,53 84,52" stroke="#d48010" strokeWidth="11" fill="none" strokeLinecap="round" />
              <ellipse cx="85" cy="52" rx="9.5" ry="7" fill="url(#ll-body)" transform="rotate(-12,85,52)" filter="url(#ll-aglow)" />
              <path d="M 81,46 L 85,38 L 89,45 Z" fill="#c07820" />
              <path d="M 82,46 L 85,40 L 88,45 Z" fill="#3a1a00" opacity="0.80" />
              <ellipse cx="93" cy="55" rx="4.5" ry="3.5" fill="#f0b840" transform="rotate(-10,93,55)" />
              <ellipse cx="96" cy="54" rx="1.8" ry="1.2" fill="#2a0e00" opacity="0.85" />
              <circle cx="89" cy="49" r="2.8" fill="white" opacity="0.95" />
              <circle cx="89" cy="49" r="1.8" fill="#00b050" />
              <circle cx="89" cy="49" r="0.9" fill="#003d18" />
              <circle cx="89.6" cy="48.4" r="0.6" fill="white" />
              <path d="M 88,52 Q 86,57 84,62" stroke="#1a0500" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.92" />
              <path d="M 90,52 Q 89,57 88,62" stroke="#1a0500" strokeWidth="1.1" fill="none" strokeLinecap="round" opacity="0.82" />
              <circle cx="48" cy="55" r="2.2" fill="rgba(20,8,0,0.38)" />
              <circle cx="57" cy="53" r="1.9" fill="rgba(20,8,0,0.35)" />
              <circle cx="53" cy="62" r="2.1" fill="rgba(20,8,0,0.36)" />
              <circle cx="63" cy="57" r="1.8" fill="rgba(20,8,0,0.33)" />
              <circle cx="44" cy="63" r="1.8" fill="rgba(20,8,0,0.32)" />
              <circle cx="40" cy="57" r="1.6" fill="rgba(20,8,0,0.30)" />
              <circle cx="67" cy="62" r="1.5" fill="rgba(20,8,0,0.30)" />
              <circle cx="59" cy="66" r="1.5" fill="rgba(20,8,0,0.29)" />
              <line x1="17" y1="57" x2="32" y2="57" stroke="rgba(86,164,91,0.50)" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="17" y1="53" x2="26" y2="53" stroke="rgba(244,163,33,0.38)" strokeWidth="1" strokeLinecap="round" />
              <line x1="17" y1="61" x2="29" y2="61" stroke="rgba(86,164,91,0.36)" strokeWidth="1.2" strokeLinecap="round" />
              <ellipse cx="53" cy="54" rx="10" ry="3.5" fill="rgba(255,255,255,0.12)" transform="rotate(-15,53,54)" />
            </g>

            {/* Pulse ring */}
            <circle cx="60" cy="60" r="44" fill="none" stroke="rgba(232,150,10,0.40)" strokeWidth="2"
              style={{ transformOrigin: "60px 60px", animation: "pulse-ring 2.2s ease-out infinite" }} />
          </svg>
        </div>

        {/* Brand title */}
        <div className="mt-7 text-center" style={{ animation: "fade-up 0.6s ease 0.15s both" }}>
          <div
            className="text-[27px] font-black tracking-[-0.04em] leading-none"
            style={{ color: "#fff", textShadow: "0 2px 24px rgba(0,0,0,0.60)" }}
          >
            CheetahCost
          </div>
          <div
            className="mt-1.5 text-[11.5px] font-bold tracking-widest uppercase"
            style={{ color: "rgba(232,150,10,0.85)", letterSpacing: "0.16em" }}
          >
            FGF · Cockpit de coûts
          </div>
        </div>

        {/* Progress bar */}
        <div
          className="mt-8 h-[3px] w-56 overflow-hidden rounded-full"
          style={{ background: "rgba(255,255,255,0.10)", animation: "fade-in 0.4s ease 0.35s both" }}
        >
          <div
            className="h-full"
            style={{
              background: "linear-gradient(90deg, #56a45b, #e8960a, #56a45b)",
              backgroundSize: "200% 100%",
              animation: "aurora-border 1.5s ease infinite, loading-bar 1.2s ease infinite",
            }}
          />
        </div>

        {/* Animated dots */}
        <div className="mt-4 flex items-center gap-1.5" style={{ animation: "fade-in 0.4s ease 0.45s both" }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-1.5 w-1.5 rounded-full"
              style={{
                background: i === 1 ? "#e8960a" : "#56a45b",
                animation: "dots-bounce 1.2s ease infinite",
                animationDelay: `${i * 0.18}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Footer brand ── */}
      <div
        className="absolute bottom-7 text-center z-10"
        style={{ animation: "fade-in 0.6s ease 0.55s both" }}
      >
        <div className="flex items-center gap-2.5 justify-center">
          <div className="h-px w-14 rounded-full" style={{ background: "rgba(86,164,91,0.40)" }} />
          <span className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.30)", letterSpacing: "0.13em" }}>
            CheetahSoft · Project Management Software
          </span>
          <div className="h-px w-14 rounded-full" style={{ background: "rgba(232,150,10,0.40)" }} />
        </div>
      </div>

    </div>
  );
}
