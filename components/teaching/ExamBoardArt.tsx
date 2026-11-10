"use client"

import {
  BookOpen, Calculator, Landmark, Coins, Users, Megaphone, TrendingUp, Sigma, Monitor, Languages, Scale,
  Plane, Truck, Briefcase, Dumbbell, Leaf, ShoppingCart, Hotel, Globe, PieChart, Brain, Palette, Factory,
  Receipt, Handshake, ChefHat, Database, Code2, FlaskConical,
} from "lucide-react"

type IconType = typeof BookOpen

/* Fan nomidan kalit so'z bo'yicha belgi — har bir fan uchun alohida rasm yo'q,
   shuning uchun mavzuga yaqin belgi va doimiy rang tanlanadi */
const SUBJECT_ICONS: Array<[RegExp, IconType]> = [
  [/buxgalter|hisob|audit/i, Calculator],
  [/soliq|bojxona/i, Receipt],
  [/moliya|bank|kredit|pul|sug.urta|invest/i, Coins],
  [/marketing|reklama|brend/i, Megaphone],
  [/menejment|boshqar|kadr|personal|rahbar/i, Users],
  [/ekonometr|statist|matem|algebra|hisoblash/i, Sigma],
  [/iqtisod|ekonom|makro|mikro/i, TrendingUp],
  [/ma.lumotlar baza|database|sql/i, Database],
  [/dastur|algoritm|python|java|web/i, Code2],
  [/informat|axborot|kompyuter|raqamli|digital|it\b/i, Monitor],
  [/ingliz|rus tili|nemis|fransuz|xorijiy|til\b|tili|english/i, Languages],
  [/huquq|qonun|yurid/i, Scale],
  [/turizm|sayyoh|mehmonxona/i, Plane],
  [/mehmon|xizmat|servis|hotel/i, Hotel],
  [/oshxona|pazand|ovqat|restoran/i, ChefHat],
  [/logistika|transport|tashish/i, Truck],
  [/tadbirkor|biznes|startap/i, Briefcase],
  [/savdo|tijorat|kommer/i, ShoppingCart],
  [/xalqaro|jahon|global|tashqi/i, Globe],
  [/ekolog|tabiat|agrar|qishloq/i, Leaf],
  [/sanoat|ishlab chiqarish|texnolog/i, Factory],
  [/kimyo|fizika|biolog/i, FlaskConical],
  [/psixolog|pedagog/i, Brain],
  [/dizayn|san.at|madaniyat/i, Palette],
  [/sport|jismoniy/i, Dumbbell],
  [/tarix|falsafa|ma.naviy|din/i, Landmark],
  [/tahlil|analiz|prognoz/i, PieChart],
  [/muzokara|etika|kommunik/i, Handshake],
]

const SUBJECT_COLORS = ["#2563eb", "#0d9488", "#7c3aed", "#ea580c", "#db2777", "#0891b2", "#16a34a", "#c2410c"]

export function subjectVisual(name: string): { Icon: IconType; color: string } {
  const Icon = SUBJECT_ICONS.find(([re]) => re.test(name))?.[1] ?? BookOpen
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return { Icon, color: SUBJECT_COLORS[h % SUBJECT_COLORS.length] }
}

export const tint = (color: string, pct = 10) => `color-mix(in srgb, ${color} ${pct}%, var(--lms-cell))`

/** Ochilgan fan kartasining chap tomonidagi bezak: fan belgisi, atrofida
    yumshoq doira va kichik shakllar */
export function SubjectArt({ name }: { name: string }) {
  const { Icon, color } = subjectVisual(name)
  return (
    <div className="relative h-[150px] w-full" aria-hidden>
      <svg viewBox="0 0 180 150" className="absolute inset-0 h-full w-full">
        <circle cx="92" cy="78" r="58" fill={color} opacity="0.10" />
        <circle cx="92" cy="78" r="40" fill={color} opacity="0.10" />
        <rect x="26" y="104" width="10" height="26" rx="3" fill={color} opacity="0.25" />
        <rect x="40" y="92" width="10" height="38" rx="3" fill={color} opacity="0.4" />
        <rect x="54" y="110" width="10" height="20" rx="3" fill={color} opacity="0.25" />
        <circle cx="146" cy="36" r="7" fill="#fbbf24" />
        <circle cx="146" cy="36" r="3.5" fill="#f59e0b" />
        <circle cx="158" cy="104" r="9" fill="#fcd34d" />
        <circle cx="158" cy="104" r="5" fill="#f59e0b" opacity="0.8" />
        <circle cx="150" cy="118" r="7" fill="#fde68a" />
        <path d="M34 34 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z" fill={color} opacity="0.35" />
        <path d="M126 132 l2 4 4 2 -4 2 -2 4 -2 -4 -4 -2 4 -2z" fill={color} opacity="0.35" />
      </svg>
      <div className="absolute left-1/2 top-1/2 flex h-[72px] w-[72px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl"
        style={{ backgroundColor: "var(--lms-cell)", boxShadow: `0 10px 24px ${color}33`, border: `1px solid ${color}22` }}>
        <Icon className="h-9 w-9" style={{ color }} />
      </div>
    </div>
  )
}

/** Sahifa sarlavhasidagi rasm: kitoblar ustida bitiruvchi qalpoq, barglar */
export function HeroArt({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 250 140" className={className} aria-hidden>
      {/* barglar */}
      <g opacity="0.85">
        <ellipse cx="40" cy="96" rx="20" ry="8" fill="#93c5fd" transform="rotate(-35 40 96)" />
        <ellipse cx="30" cy="70" rx="16" ry="6" fill="#bfdbfe" transform="rotate(-60 30 70)" />
        <ellipse cx="58" cy="76" rx="15" ry="6" fill="#60a5fa" transform="rotate(-20 58 76)" />
        <path d="M24 122 Q44 98 62 64" stroke="#60a5fa" strokeWidth="2" fill="none" />
        <ellipse cx="226" cy="58" rx="14" ry="5" fill="#bfdbfe" transform="rotate(40 226 58)" />
        <ellipse cx="214" cy="38" rx="11" ry="4.5" fill="#93c5fd" transform="rotate(65 214 38)" />
      </g>
      {/* yumshoq soya */}
      <ellipse cx="140" cy="128" rx="86" ry="7" fill="#1e3a8a" opacity="0.10" />
      {/* kitoblar */}
      <rect x="74" y="102" width="134" height="20" rx="4" fill="#1e40af" />
      <rect x="80" y="106" width="124" height="6" rx="2" fill="#e0ecff" />
      <rect x="84" y="82" width="118" height="20" rx="4" fill="#3b82f6" />
      <rect x="90" y="86" width="108" height="6" rx="2" fill="#f1f6ff" />
      <rect x="92" y="64" width="104" height="18" rx="4" fill="#1d4ed8" />
      <rect x="98" y="68" width="94" height="5" rx="2" fill="#e0ecff" />
      {/* diplom */}
      <rect x="196" y="110" width="44" height="12" rx="6" fill="#ffffff" stroke="#cbd5e1" />
      <rect x="214" y="108" width="6" height="16" rx="1" fill="#ef4444" />
      {/* qalpoq */}
      <path d="M112 50 L112 64 Q144 78 176 64 L176 50 L144 60 Z" fill="#1e3a8a" />
      <path d="M144 22 L206 42 L144 62 L82 42 Z" fill="#1e40af" />
      <path d="M144 22 L206 42 L144 50 L82 42 Z" fill="#2563eb" opacity="0.55" />
      <circle cx="144" cy="42" r="3.5" fill="#fbbf24" />
      <path d="M144 42 Q170 46 192 46 L192 70" stroke="#fbbf24" strokeWidth="2.2" fill="none" />
      <rect x="188" y="68" width="8" height="12" rx="2" fill="#f59e0b" />
      {/* uchqunlar */}
      <circle cx="70" cy="30" r="3" fill="#bfdbfe" />
      <circle cx="232" cy="92" r="2.5" fill="#93c5fd" />
      <path d="M100 14 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill="#93c5fd" />
    </svg>
  )
}
