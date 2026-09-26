/**
 * O'zbek lotin -> kirill transliteratsiyasi.
 *
 * Lug'atdagi "uz" matnlari shu funksiya orqali avtomatik kirillga
 * o'giriladi — shu sabab yangi kalit qo'shilganda kirill varianti alohida
 * yozilishi SHART EMAS. Qoida bilan chiqmaydigan so'zlar (ruscha o'zlashma:
 * "funksiya" -> "функция", "profil" -> "профиль") pastdagi istisnolar
 * ro'yxatiga qo'shiladi; butun ibora noto'g'ri chiqsa — lug'at yozuviga
 * `uzc: "..."` qo'lda beriladi (translations.ts).
 *
 * O'zgarmay qoladiganlar: {param} o'rinbosarlari, URL/e-mail/domenlar,
 * qisqartmalar (HEMIS, GPA, PDF), brendlar (Zoom, Google, Face ID) va
 * o'zbek lotinida uchramaydigan harf (c, w) bor inglizcha so'zlar.
 */

// o' / g' va tutuq belgisi uchun uchraydigan barcha apostrof ko'rinishlari
const APOS = "'ʻʼ‘’`"
const APOS_RE = new RegExp(`[${APOS}]`)

// Lotin yozuvida qoladigan brend va texnik atamalar (katta-kichik harf
// farqlanadi: "Meeting" brend, lekin boshqa so'z ichida emas). Ulardan
// keyin kelgan o'zbekcha qo'shimcha kirillga o'giriladi: "Zoomga" -> "Zoomга".
const KEEP_PREFIXES = [
  "Face ID", "FaceID", "Zoom", "Google", "Meeting", "Meet", "YouTube", "Youtube",
  "Telegram", "Excel", "Word", "PowerPoint", "Microsoft", "Chrome", "Safari",
  "Firefox", "Android", "Windows", "Linux", "Apple", "Moodle",
  "email", "Email", "e-mail", "E-mail", "online", "offline", "Online", "Offline",
  "Realtime", "realtime", "Join", "join", "refresh", "Hemis", "SamISI", "Samisi",
  "meeting", "Teams", "Enter", "Url",
].sort((a, b) => b.length - a.length)

// Butun so'z sifatida almashtiriladigan istisnolar (kichik harfda).
const EXACT: Record<string, string> = {
  profil: "профиль", parol: "пароль", rol: "роль", model: "модель",
  modul: "модуль", stil: "стиль", detal: "деталь", kalendar: "календарь",
  yanvar: "январь", fevral: "февраль", aprel: "апрель", iyun: "июнь",
  iyul: "июль", sentabr: "сентябрь", oktabr: "октябрь", noyabr: "ноябрь",
  dekabr: "декабрь", tabel: "табель", portfel: "портфель",
  avtomobil: "автомобиль", panel: "панель",
  // "Yakuniy nazorat" qisqartmasi — harfma-harf "ЙН" bo'lib qolmasin
  yn: "ян",
}

// Lotinda qoladigan qisqartmalar. Ro'yxatda bo'lmagan KATTA harfli so'z
// o'zbekcha deb hisoblanadi: "TALABA" -> "ТАЛАБА", "JN/ON/YN" -> "ЖН/ОН/ЯН".
const ACRONYMS = new Set([
  "HEMIS", "GPA", "ID", "PDF", "PPT", "PPTX", "DOC", "DOCX", "XLS", "XLSX", "CSV",
  "TXT", "ZIP", "RAR", "AVI", "MOV", "MP", "MP3", "MP4", "PNG", "JPG", "JPEG",
  "API", "AI", "LMS", "MCQ", "OK", "PIN", "GB", "MB", "KB", "DD", "MM", "YYYY",
  "HH", "URL", "IT", "SIES", "QR", "UZ", "RU", "EN", "HTML", "IP", "USB", "SMS",
  "OTP", "CSE", "KEY", "CX", "GR", "PC", "UTC", "GMT", "OAUTH", "JWT", "IOS",
])

// So'z boshidagi o'zak — qolgan qismi (qo'shimcha) odatdagi qoida bilan
// o'giriladi: "funksiyalar" -> "функция" + "лар".
const STEMS: [string, string][] = ([
  ["kompyuter", "компьютер"], ["obyekt", "объект"], ["ob'yekt", "объект"],
  ["subyekt", "субъект"], ["podyezd", "подъезд"], ["intervyu", "интервью"],
  ["funksional", "функционал"], ["funksiya", "функция"],
  ["stansiya", "станция"], ["distansion", "дистанцион"], ["distansiya", "дистанция"],
  ["konferensiya", "конференция"], ["potensial", "потенциал"],
  ["konsert", "концерт"], ["prinsip", "принцип"], ["litsenziya", "лицензия"],
  ["litsey", "лицей"], ["sentabr", "сентябр"], ["oktabr", "октябр"],
  ["protsess", "процесс"], ["protsedura", "процедура"], ["sikl", "цикл"],
  ["dashboard", "дашборд"], ["fakultet", "факультет"], ["filtr", "фильтр"],
  ["passport", "паспорт"],
] as [string, string][]).sort((a, b) => b[0].length - a[0].length)

const SINGLE: Record<string, string> = {
  a: "а", b: "б", d: "д", e: "е", f: "ф", g: "г", h: "ҳ", i: "и", j: "ж",
  k: "к", l: "л", m: "м", n: "н", o: "о", p: "п", q: "қ", r: "р", s: "с",
  t: "т", u: "у", v: "в", x: "х", y: "й", z: "з", c: "ц", w: "в",
}
// Shu unlilardan keyin "e" -> "э" (poeziya, aeroport, duet); "i"dan keyin
// esa "е" (klient, koeffitsient)
const E_AFTER = new Set(["а", "о", "у", "ў", "э"])

// "-tsiya", "-tsion" kabi ruscha qo'shimchalarda "ts" -> "ц"
// ("o'tsa", "ketsin" kabi o'zbekcha so'zlar esa "тс" bo'lib qoladi).
const TS_TO_TSE = /^ts(iy|io|ient|ent|ikl|ifr|irk)/

function upperFirst(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s
}

function isUpper(ch: string) {
  return ch !== ch.toLowerCase() && ch === ch.toUpperCase()
}

/** Bitta so'zni (faqat harflar + apostroflar) harfma-harf o'giradi. */
function convertLetters(word: string): string {
  let out = ""
  const lower = word.toLowerCase()
  let i = 0
  const allUpper = word.length > 1 && word === word.toUpperCase()
  const emit = (cyr: string, srcStart: number) => {
    const up = isUpper(word[srcStart])
    if (!up) { out += cyr; return }
    // "Sh" -> "Ш", "SH" -> "Ш"; so'z butunlay katta bo'lsa hammasi katta
    out += allUpper ? cyr.toUpperCase() : upperFirst(cyr)
  }
  while (i < word.length) {
    const c = lower[i]
    const n = lower[i + 1] ?? ""
    const n2 = lower[i + 2] ?? ""
    const prev = out.length ? out[out.length - 1].toLowerCase() : ""
    const atStart = i === 0

    if (APOS_RE.test(c)) {
      // o'/g' dan tashqaridagi apostrof — tutuq belgisi (ma'lumot -> маълумот)
      out += i > 0 && i < word.length - 1 ? "ъ" : ""
      i += 1
      continue
    }
    if (c === "o" && APOS_RE.test(n)) { emit("ў", i); i += 2; continue }
    if (c === "g" && APOS_RE.test(n)) { emit("ғ", i); i += 2; continue }
    if (c === "s" && APOS_RE.test(n) && n2 === "h") { emit("с", i); out += isUpper(word[i + 2]) ? "Ҳ" : "ҳ"; i += 3; continue }
    if (c === "s" && n === "h") { emit("ш", i); i += 2; continue }
    if (c === "c" && n === "h") { emit("ч", i); i += 2; continue }
    if (c === "y" && n === "o" && !APOS_RE.test(n2)) { emit("ё", i); i += 2; continue }
    if (c === "y" && n === "u") { emit("ю", i); i += 2; continue }
    if (c === "y" && n === "a") { emit("я", i); i += 2; continue }
    if (c === "y" && n === "e") { emit("е", i); i += 2; continue }
    if (c === "t" && n === "s" && TS_TO_TSE.test(lower.slice(i))) { emit("ц", i); i += 2; continue }
    // "-ksiya" -> "-кция" (reaksiya, kolleksiya, instruksiya, direksiya)
    if (c === "s" && prev === "к" && lower.startsWith("siy", i)) { emit("ц", i); i += 1; continue }
    if (c === "e") {
      // so'z boshida yoki unlidan keyin "э", aks holda "е"
      emit(atStart || E_AFTER.has(prev) || prev === "ъ" ? "э" : "е", i)
      i += 1
      continue
    }
    const single = SINGLE[c]
    if (single) { emit(single, i); i += 1; continue }
    out += word[i]
    i += 1
  }
  return out
}

function keepCase(src: string, cyr: string): string {
  if (src.length > 1 && src === src.toUpperCase()) return cyr.toUpperCase()
  return isUpper(src[0]) ? upperFirst(cyr) : cyr
}

function convertWord(word: string): string {
  if (!/[A-Za-z]/.test(word)) return word
  // Qisqartmalar (HEMIS, GPA, PDF, JN/ON1) va CamelCase (YouTube, SamISI)
  // Qisqartma + qo'shimcha: "HEMIS'dan", "ID'ni", "LMS'ning"
  const acr = word.match(new RegExp(`^([A-Z0-9]{2,})([${APOS}])(.+)$`))
  if (acr && ACRONYMS.has(acr[1])) return acr[1] + acr[2] + convertWord(acr[3])
  if (word.length > 1 && word === word.toUpperCase() && ACRONYMS.has(word)) return word
  if (/[a-z][A-Z]/.test(word)) return word
  // Brend + o'zbekcha qo'shimcha: "Zoomga", "Google'ga"
  for (const p of KEEP_PREFIXES) {
    if (word.startsWith(p)) {
      const rest = word.slice(p.length)
      if (!rest) return word
      if (APOS_RE.test(rest[0])) return p + rest[0] + convertWord(rest.slice(1))
      return p + convertWord(rest)
    }
  }
  const lower = word.toLowerCase()
  // Lotin o'zbek imlosida "c" (ch'dan tashqari) va "w" yo'q — bu inglizcha so'z
  if (/c(?!h)|w/.test(lower)) return word
  const exact = EXACT[lower]
  if (exact) return keepCase(word, exact)
  for (const [stem, cyr] of STEMS) {
    if (lower.startsWith(stem)) {
      const rest = word.slice(stem.length)
      return keepCase(word, cyr) + (rest ? convertLetters(rest) : "")
    }
  }
  return convertLetters(word)
}

// {param}, URL, e-mail, domen, fayl kengaytmasi — o'zgarmaydi
const PROTECTED_RE = /(\{[A-Za-z0-9_]+\}|https?:\/\/\S+|www\.\S+|[\w.+-]+@[\w-]+\.[\w.]+|\b[\w-]+\.(?:uz|com|org|net|be|ru|io|txt|pdf|png|jpg|docx?|xlsx?|pptx?|zip)\b|(?:^|[\s(])\.[a-z]{2,4}\b)/g
const WORD_RE = new RegExp(`(Face ID|Data Access|[A-Za-z${APOS}]+(?:-[A-Za-z]+)*)`, "g")

export function toCyrillic(text: string): string {
  if (!text || !/[A-Za-z]/.test(text)) return text
  return text
    .split(PROTECTED_RE)
    .map((part, idx) => {
      // split() da qavsli guruh toq indekslarda qaytadi — ular himoyalangan
      if (idx % 2 === 1) return part
      return part.replace(WORD_RE, (w) => {
        // So'z chetidagi apostroflar — tirnoq vazifasida ('Saqlash')
        const lead = w.match(new RegExp(`^[${APOS}]+`))?.[0] ?? ""
        const trail = w.slice(lead.length).match(new RegExp(`[${APOS}]+$`))?.[0] ?? ""
        let core = w.slice(lead.length, w.length - trail.length)
        // "o'" / "g'" so'z oxirida: trail'ni qaytarib qo'shamiz
        let t = trail
        if (t && /[oOgG]$/.test(core) && !core.endsWith("'")) { core += t[0]; t = t.slice(1) }
        const converted = core.includes("-") && !KEEP_PREFIXES.some(p => core.startsWith(p))
          ? core.split("-").map(convertWord).join("-")
          : convertWord(core)
        return lead + converted + t
      })
    })
    .join("")
}
