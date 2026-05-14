// components/ui/Logo.tsx
"use client";

import type React from "react";

interface LogoProps {
  size?: number;
  animated?: boolean;
  showRing?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function Logo({ size = 80, animated = false, showRing = false, className = "", style }: LogoProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      style={style}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="CheetahSoft — Project Management Software"
    >
      <defs>
        <path id="cc-top-arc" d="M 10,60 A 50,50 0 0,0 110,60" />
        <path id="cc-bot-arc" d="M 10,60 A 50,50 0 0,1 110,60" />

        {/* Orange cheetah body gradient */}
        <radialGradient id="cc-body-grad" cx="35%" cy="35%" r="65%">
          <stop offset="0%"   stopColor="#fcd06a" />
          <stop offset="55%"  stopColor="#e8960a" />
          <stop offset="100%" stopColor="#a85c08" />
        </radialGradient>

        {/* Darker amber for shadow areas */}
        <radialGradient id="cc-body-dark" cx="40%" cy="40%" r="65%">
          <stop offset="0%"   stopColor="#d4840a" />
          <stop offset="100%" stopColor="#8a4a06" />
        </radialGradient>

        <radialGradient id="cc-inner-bg" cx="30%" cy="30%" r="80%">
          <stop offset="0%"   stopColor="#0d1f10" />
          <stop offset="100%" stopColor="#040b05" />
        </radialGradient>
        <linearGradient id="cc-outer-ring" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#0e2214" />
          <stop offset="100%" stopColor="#0a1a0d" />
        </linearGradient>

        {/* Orange claw gradient */}
        <linearGradient id="cc-claw-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#f4a321" />
          <stop offset="100%" stopColor="#fb923c" />
        </linearGradient>

        {/* Amber glow for cheetah body */}
        <filter id="cc-amber-glow" x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
          <feFlood floodColor="#e8960a" floodOpacity="0.45" result="color" />
          <feComposite in="color" in2="blur" operator="in" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Green glow (eye, accents) */}
        <filter id="cc-green-glow" x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
          <feFlood floodColor="#56a45b" floodOpacity="0.55" result="color" />
          <feComposite in="color" in2="blur" operator="in" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Orange claw glow */}
        <filter id="cc-orange-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
          <feFlood floodColor="#f4a321" floodOpacity="0.50" result="color" />
          <feComposite in="color" in2="blur" operator="in" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ══ OUTER RING (dark green brand) ══ */}
      <g style={showRing ? { transformOrigin: "60px 60px", animation: "logo-ring-rotate 28s linear infinite" } : undefined}>
        <circle cx="60" cy="60" r="60" fill="url(#cc-outer-ring)" />
        <circle cx="60" cy="60" r="59.5" fill="none" stroke="rgba(86,164,91,0.30)" strokeWidth="0.8" />
        <circle cx="60" cy="60" r="52.5" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="0.6" />
        <text fontFamily="'Helvetica Neue', Helvetica, Arial, sans-serif" fontSize="9" fontWeight="700" letterSpacing="2.5" fill="white">
          <textPath href="#cc-top-arc" startOffset="13%">CheetahSoft</textPath>
        </text>
        <text fontFamily="'Helvetica Neue', Helvetica, Arial, sans-serif" fontSize="5.8" fontWeight="500" letterSpacing="0.6" fill="rgba(255,255,255,0.68)">
          <textPath href="#cc-bot-arc" startOffset="5%">Project Management Software</textPath>
        </text>
        <circle cx="13"  cy="61" r="3"   fill="#56a45b" />
        <circle cx="107" cy="61" r="3"   fill="#56a45b" />
        <circle cx="13"  cy="61" r="1.2" fill="rgba(255,255,255,0.5)" />
        <circle cx="107" cy="61" r="1.2" fill="rgba(255,255,255,0.5)" />
      </g>

      {/* ══ INNER BADGE ══ */}
      <g style={animated ? { transformOrigin: "60px 60px", animation: "logo-breathe 3.5s ease-in-out infinite" } : undefined}>
        <circle cx="60" cy="60" r="44" fill="url(#cc-inner-bg)" />
        <circle cx="60" cy="60" r="44" fill="none" stroke="rgba(86,164,91,0.35)" strokeWidth="1.2" />
        <circle cx="60" cy="60" r="41" fill="none" stroke="rgba(255,180,50,0.08)" strokeWidth="0.5" />

        {/* ══ CHEETAH — profil courant (facing right) ══ */}

        {/* Queue courbée vers le haut */}
        <path d="M 33,63 Q 22,54 24,43 Q 26,36 30,34" stroke="#c07820" strokeWidth="3.8" fill="none" strokeLinecap="round" />
        <path d="M 30,34 Q 27,29 30,27" stroke="#e8960a" strokeWidth="2.6" fill="none" strokeLinecap="round" />

        {/* Pattes arrières — galop aérien */}
        <path d="M 40,67 Q 30,76 25,74 L 23,80" stroke="#c07820" strokeWidth="4.2" fill="none" strokeLinecap="round" />
        <path d="M 36,67 Q 27,74 23,72 L 21,78" stroke="#a05810" strokeWidth="3.6" fill="none" strokeLinecap="round" />
        {/* Pattes arrières — sabots */}
        <ellipse cx="23" cy="80" rx="3.2" ry="1.8" fill="#7a3c08" transform="rotate(12,23,80)" />
        <ellipse cx="21" cy="78" rx="2.8" ry="1.6" fill="#7a3c08" transform="rotate(12,21,78)" />

        {/* Corps principal */}
        <path
          d="M 34,64 Q 44,54 58,51 Q 69,50 76,53 L 75,61 Q 67,69 57,69 Q 44,70 34,66 Z"
          fill="url(#cc-body-grad)"
          filter="url(#cc-amber-glow)"
        />

        {/* Épaule / poitrail avant */}
        <ellipse cx="73" cy="60" rx="7" ry="8.5" fill="url(#cc-body-dark)" transform="rotate(-8,73,60)" />

        {/* Pattes avant — galop aérien */}
        <path d="M 75,68 Q 82,77 86,75 L 88,81" stroke="#c07820" strokeWidth="4.2" fill="none" strokeLinecap="round" />
        <path d="M 72,69 Q 78,78 82,76 L 84,82" stroke="#a05810" strokeWidth="3.6" fill="none" strokeLinecap="round" />
        {/* Pattes avant — sabots */}
        <ellipse cx="88" cy="81" rx="3.2" ry="1.8" fill="#7a3c08" transform="rotate(-12,88,81)" />
        <ellipse cx="84" cy="82" rx="2.8" ry="1.6" fill="#7a3c08" transform="rotate(-12,84,82)" />

        {/* Griffes orange sur patte avant */}
        <path d="M 86,82 Q 90,80 92,84" stroke="url(#cc-claw-grad)" strokeWidth="2.8" fill="none" strokeLinecap="round" filter="url(#cc-orange-glow)" />
        <path d="M 82,83 Q 86,81 88,85" stroke="url(#cc-claw-grad)" strokeWidth="2.4" fill="none" strokeLinecap="round" filter="url(#cc-orange-glow)" />
        <circle cx="92" cy="84" r="1.4" fill="rgba(255,210,100,0.75)" />
        <circle cx="88" cy="85" r="1.2" fill="rgba(255,210,100,0.65)" />

        {/* Encolure */}
        <path d="M 76,53 Q 80,53 84,52" stroke="#d48010" strokeWidth="11" fill="none" strokeLinecap="round" />

        {/* Tête */}
        <ellipse cx="85" cy="52" rx="9.5" ry="7" fill="url(#cc-body-grad)" transform="rotate(-12,85,52)" filter="url(#cc-amber-glow)" />

        {/* Oreille */}
        <path d="M 81,46 L 85,38 L 89,45 Z" fill="#c07820" />
        <path d="M 82,46 L 85,40 L 88,45 Z" fill="#3a1a00" opacity="0.80" />

        {/* Museau */}
        <ellipse cx="93" cy="55" rx="4.5" ry="3.5" fill="#f0b840" transform="rotate(-10,93,55)" />

        {/* Truffe */}
        <ellipse cx="96" cy="54" rx="1.8" ry="1.2" fill="#2a0e00" opacity="0.85" />

        {/* Œil — pupille verte (signature de marque) */}
        <circle cx="89" cy="49" r="2.8" fill="white" opacity="0.95" />
        <circle cx="89" cy="49" r="1.8" fill="#00b050" filter="url(#cc-green-glow)" />
        <circle cx="89" cy="49" r="0.9" fill="#003d18" />
        <circle cx="89.6" cy="48.4" r="0.6" fill="white" />

        {/* Larmes du guépard — marque distinctive absolue */}
        <path d="M 88,52 Q 86,57 84,62" stroke="#1a0500" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.92" />
        <path d="M 90,52 Q 89,57 88,62" stroke="#1a0500" strokeWidth="1.1" fill="none" strokeLinecap="round" opacity="0.82" />

        {/* Taches noires */}
        <circle cx="48" cy="55" r="2.2" fill="rgba(20,8,0,0.38)" />
        <circle cx="57" cy="53" r="1.9" fill="rgba(20,8,0,0.35)" />
        <circle cx="53" cy="62" r="2.1" fill="rgba(20,8,0,0.36)" />
        <circle cx="63" cy="57" r="1.8" fill="rgba(20,8,0,0.33)" />
        <circle cx="44" cy="63" r="1.8" fill="rgba(20,8,0,0.32)" />
        <circle cx="40" cy="57" r="1.6" fill="rgba(20,8,0,0.30)" />
        <circle cx="67" cy="62" r="1.5" fill="rgba(20,8,0,0.30)" />
        <circle cx="59" cy="66" r="1.5" fill="rgba(20,8,0,0.29)" />
        <circle cx="69" cy="54" r="1.4" fill="rgba(20,8,0,0.27)" />

        {/* Traînées de vitesse (vert marque) */}
        <line x1="17" y1="57" x2="32" y2="57" stroke="rgba(86,164,91,0.50)" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="17" y1="53" x2="26" y2="53" stroke="rgba(244,163,33,0.38)" strokeWidth="1" strokeLinecap="round" />
        <line x1="17" y1="61" x2="29" y2="61" stroke="rgba(86,164,91,0.36)" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="17" y1="65" x2="24" y2="65" stroke="rgba(86,164,91,0.24)" strokeWidth="0.8" strokeLinecap="round" />

        {/* Reflet de lumière sur le dos */}
        <ellipse cx="53" cy="54" rx="10" ry="3.5" fill="rgba(255,255,255,0.12)" transform="rotate(-15,53,54)" />
      </g>

      {/* ══ PULSE RING ══ */}
      {animated && (
        <circle
          cx="60" cy="60" r="44"
          fill="none"
          stroke="rgba(232,150,10,0.40)"
          strokeWidth="2"
          style={{ transformOrigin: "60px 60px", animation: "pulse-ring 2.2s ease-out infinite" }}
        />
      )}
    </svg>
  );
}

/* ── Icon-only variant (no text ring) ── */
export function LogoIcon({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="17 17 86 86"
      width={size}
      height={size}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="CheetahSoft"
    >
      <defs>
        <linearGradient id="li-claw" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#f4a321" />
          <stop offset="100%" stopColor="#fb923c" />
        </linearGradient>
        <radialGradient id="li-body" cx="35%" cy="35%" r="65%">
          <stop offset="0%"   stopColor="#fcd06a" />
          <stop offset="55%"  stopColor="#e8960a" />
          <stop offset="100%" stopColor="#a85c08" />
        </radialGradient>
        <radialGradient id="li-dark" cx="40%" cy="40%" r="65%">
          <stop offset="0%"   stopColor="#d4840a" />
          <stop offset="100%" stopColor="#8a4a06" />
        </radialGradient>
      </defs>

      <circle cx="60" cy="60" r="44" fill="#070f09" />
      <circle cx="60" cy="60" r="44" fill="none" stroke="rgba(86,164,91,0.30)" strokeWidth="1" />

      {/* Queue */}
      <path d="M 33,63 Q 22,54 24,43 Q 26,36 30,34" stroke="#c07820" strokeWidth="3.5" fill="none" strokeLinecap="round" />

      {/* Pattes arrières */}
      <path d="M 40,67 Q 30,76 25,74 L 23,80" stroke="#c07820" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M 36,67 Q 27,74 23,72 L 21,78" stroke="#a05810" strokeWidth="3.5" fill="none" strokeLinecap="round" />

      {/* Corps */}
      <path d="M 34,64 Q 44,54 58,51 Q 69,50 76,53 L 75,61 Q 67,69 57,69 Q 44,70 34,66 Z" fill="url(#li-body)" />

      {/* Épaule */}
      <ellipse cx="73" cy="60" rx="7" ry="8.5" fill="url(#li-dark)" transform="rotate(-8,73,60)" />

      {/* Pattes avant */}
      <path d="M 75,68 Q 82,77 86,75 L 88,81" stroke="#c07820" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M 72,69 Q 78,78 82,76 L 84,82" stroke="#a05810" strokeWidth="3.5" fill="none" strokeLinecap="round" />

      {/* Griffes */}
      <path d="M 86,82 Q 90,80 92,84" stroke="url(#li-claw)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M 82,83 Q 86,81 88,85" stroke="url(#li-claw)" strokeWidth="2.2" fill="none" strokeLinecap="round" />

      {/* Encolure */}
      <path d="M 76,53 Q 80,53 84,52" stroke="#d48010" strokeWidth="10" fill="none" strokeLinecap="round" />

      {/* Tête */}
      <ellipse cx="85" cy="52" rx="9.5" ry="7" fill="url(#li-body)" transform="rotate(-12,85,52)" />

      {/* Oreille */}
      <path d="M 81,46 L 85,38 L 89,45 Z" fill="#c07820" />
      <path d="M 82,46 L 85,40 L 88,45 Z" fill="#3a1a00" opacity="0.80" />

      {/* Museau */}
      <ellipse cx="93" cy="55" rx="4.5" ry="3.5" fill="#f0b840" transform="rotate(-10,93,55)" />

      {/* Œil vert */}
      <circle cx="89" cy="49" r="2.5" fill="white" opacity="0.92" />
      <circle cx="89" cy="49" r="1.5" fill="#00b050" />
      <circle cx="89.6" cy="48.5" r="0.6" fill="white" />

      {/* Larmes */}
      <path d="M 88,52 Q 86,57 84,62" stroke="#1a0500" strokeWidth="1.3" fill="none" strokeLinecap="round" opacity="0.88" />
      <path d="M 90,52 Q 89,57 88,62" stroke="#1a0500" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.78" />

      {/* Taches */}
      <circle cx="48" cy="55" r="2" fill="rgba(20,8,0,0.36)" />
      <circle cx="57" cy="53" r="1.8" fill="rgba(20,8,0,0.33)" />
      <circle cx="53" cy="62" r="2" fill="rgba(20,8,0,0.34)" />
      <circle cx="63" cy="57" r="1.6" fill="rgba(20,8,0,0.31)" />
      <circle cx="44" cy="63" r="1.6" fill="rgba(20,8,0,0.30)" />

      {/* Traînées vitesse */}
      <line x1="17" y1="57" x2="32" y2="57" stroke="rgba(86,164,91,0.45)" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="17" y1="53" x2="26" y2="53" stroke="rgba(244,163,33,0.32)" strokeWidth="0.9" strokeLinecap="round" />
      <line x1="17" y1="61" x2="28" y2="61" stroke="rgba(86,164,91,0.30)" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}
