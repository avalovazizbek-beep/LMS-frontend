import { PublicDoc, Section, Step } from "@/components/public/PublicDoc"

export const metadata = {
  title: "Zoom integration — documentation",
  description: "How to add, use and remove the Zoom integration of the SamISI (SIES) Distance Learning System",
}

const support = <a href="/support" style={{ color: "#0e58a8" }}>support</a>
const supportUz = <a href="/support" style={{ color: "#0e58a8" }}>qo&apos;llab-quvvatlash</a>

function English() {
  return (
    <>
      <Section title="1. Adding the app (connecting Zoom)">
        <div className="space-y-3">
          <Step n={1}>Sign in to lms.sies.uz through HEMIS as a teacher/staff member.</Step>
          <Step n={2}>Open the &quot;Profile&quot; page from the menu in the top-right corner.</Step>
          <Step n={3}>In the &quot;Integrations&quot; card, tick the checkbox confirming that you are over 18 and a verified teacher/staff member.</Step>
          <Step n={4}>Click &quot;Connect Zoom account&quot;.</Step>
          <Step n={5}>Sign in to Zoom on Zoom&apos;s own page and approve the requested permissions (&quot;Allow&quot;).</Step>
          <Step n={6}>You are returned to the Profile page, which shows &quot;Zoom account connected&quot;.</Step>
        </div>
        <p className="pt-2">
          <b>Troubleshooting:</b> if connecting fails, click &quot;Connect Zoom account&quot; again. If the status shows
          &quot;Reconnect required&quot;, Zoom&apos;s authorization has expired — reconnect with the same button. If the problem
          persists, contact {support}.
        </p>
      </Section>

      <Section title="2. Using the app">
        <p><b>Creating a class meeting with Zoom</b> — for teachers. Requires a connected Zoom account (section 1).</p>
        <div className="space-y-3">
          <Step n={1}>Open the Meeting page and click &quot;New meeting&quot;.</Step>
          <Step n={2}>Enter the title, subject, date and time, select your groups and tick &quot;Also create a Zoom meeting&quot;.</Step>
          <Step n={3}>After saving, a Zoom meeting is created in your Zoom account and its join link is attached to the class.</Step>
          <Step n={4}>Click &quot;Start Zoom&quot; on the meeting card to start it as the host.</Step>
        </div>
        <p className="pt-3"><b>Joining a meeting</b> — for students. The class must have a Zoom meeting.</p>
        <div className="space-y-3">
          <Step n={1}>Open the Meeting page and find the class.</Step>
          <Step n={2}>Click &quot;Join Zoom&quot; — the meeting opens in the Zoom app or in the browser.</Step>
        </div>
      </Section>

      <Section title="3. Removing the app">
        <p><b>Option A — in the System:</b></p>
        <div className="space-y-3">
          <Step n={1}>Open the &quot;Integrations&quot; card on the Profile page.</Step>
          <Step n={2}>Click &quot;Disconnect Zoom&quot; and confirm.</Step>
        </div>
        <p className="pt-2"><b>Option B — in Zoom:</b></p>
        <div className="space-y-3">
          <Step n={1}>Sign in at marketplace.zoom.us and open &quot;Manage&quot; → &quot;Added Apps&quot;.</Step>
          <Step n={2}>Find the SamISI LMS app and click &quot;Remove&quot;.</Step>
        </div>
        <p className="pt-2">
          <b>What happens after removal:</b> in both cases your Zoom access and refresh tokens, Zoom user ID, account ID,
          email and stored host start links are deleted from our system immediately (Option A also revokes the token at
          Zoom, which removes the app from your Zoom account). New Zoom meetings cannot be created until you connect
          again. Join links of classes that were already scheduled stay visible to your students so that classes are not
          interrupted; to have them deleted too, contact {support}.
        </p>
      </Section>
    </>
  )
}

function Uzbek() {
  return (
    <>
      <Section title="1. Ilovani qo'shish (Zoom'ni ulash)">
        <div className="space-y-3">
          <Step n={1}>lms.sies.uz saytiga HEMIS orqali o&apos;qituvchi/xodim sifatida kiring.</Step>
          <Step n={2}>Yuqori o&apos;ng burchakdagi menyudan &quot;Profil&quot; sahifasini oching.</Step>
          <Step n={3}>&quot;Integratsiyalar&quot; kartasida 18 yoshdan kattaligingiz va tasdiqlangan o&apos;qituvchi/xodim ekaningizni tasdiqlovchi belgini qo&apos;ying.</Step>
          <Step n={4}>&quot;Zoom account&apos;ni ulash&quot; tugmasini bosing.</Step>
          <Step n={5}>Zoom&apos;ning o&apos;z sahifasida hisobingizga kiring va so&apos;ralgan ruxsatlarni tasdiqlang (&quot;Allow&quot;).</Step>
          <Step n={6}>Profil sahifasiga qaytasiz va &quot;Zoom account muvaffaqiyatli ulandi&quot; xabari chiqadi.</Step>
        </div>
        <p className="pt-2">
          <b>Muammo bo&apos;lsa:</b> ulanmasa, &quot;Zoom account&apos;ni ulash&quot;ni qayta bosing. Holat &quot;Qayta ulash kerak&quot; bo&apos;lsa,
          Zoom ruxsatining muddati tugagan — xuddi shu tugma bilan qayta ulang. Muammo davom etsa, {supportUz} xizmatiga murojaat qiling.
        </p>
      </Section>

      <Section title="2. Foydalanish">
        <p><b>Zoom orqali dars yaratish</b> — o&apos;qituvchi uchun. Zoom hisobi ulangan bo&apos;lishi kerak (1-bo&apos;lim).</p>
        <div className="space-y-3">
          <Step n={1}>Meeting sahifasini ochib, &quot;Yangi meeting&quot;ni bosing.</Step>
          <Step n={2}>Sarlavha, fan, sana va vaqtni kiriting, guruhlarni tanlang va &quot;Zoom meeting ham yaratilsin&quot;ni belgilang.</Step>
          <Step n={3}>Saqlagach, Zoom hisobingizda meeting yaratiladi va uning join havolasi darsga biriktiriladi.</Step>
          <Step n={4}>Meeting kartasidagi &quot;Zoom&apos;ni boshlash&quot; tugmasi bilan uni host sifatida boshlang.</Step>
        </div>
        <p className="pt-3"><b>Darsga qo&apos;shilish</b> — talaba uchun. Darsda Zoom meeting bo&apos;lishi kerak.</p>
        <div className="space-y-3">
          <Step n={1}>Meeting sahifasida darsni toping.</Step>
          <Step n={2}>&quot;Zoomga kirish&quot;ni bosing — meeting Zoom ilovasida yoki brauzerda ochiladi.</Step>
        </div>
      </Section>

      <Section title="3. Ilovani olib tashlash">
        <p><b>A usul — Tizimda:</b></p>
        <div className="space-y-3">
          <Step n={1}>Profil sahifasidagi &quot;Integratsiyalar&quot; kartasini oching.</Step>
          <Step n={2}>&quot;Zoomni uzish&quot;ni bosing va tasdiqlang.</Step>
        </div>
        <p className="pt-2"><b>B usul — Zoom&apos;da:</b></p>
        <div className="space-y-3">
          <Step n={1}>marketplace.zoom.us ga kirib, &quot;Manage&quot; → &quot;Added Apps&quot; bo&apos;limini oching.</Step>
          <Step n={2}>SamISI LMS ilovasini topib, &quot;Remove&quot;ni bosing.</Step>
        </div>
        <p className="pt-2">
          <b>Olib tashlangandan keyin:</b> ikkala holatda ham Zoom access/refresh tokenlaringiz, Zoom user ID, account ID,
          email va saqlangan host havolalari tizimimizdan darhol o&apos;chiriladi (A usulda token Zoom&apos;da ham bekor qilinadi
          va ilova Zoom hisobingizdan o&apos;chadi). Qayta ulamaguningizcha yangi Zoom meeting yaratib bo&apos;lmaydi. Allaqachon
          rejalashtirilgan darslarning join havolalari dars uzilmasligi uchun talabalarga ko&apos;rinib qoladi; ularni ham
          o&apos;chirish uchun {supportUz} xizmatiga murojaat qiling.
        </p>
      </Section>
    </>
  )
}

export default function DocsPage() {
  return (
    <PublicDoc
      titleEn="Zoom integration — documentation"
      titleUz="Zoom integratsiyasi — qo'llanma"
      subtitleEn="How to add, use and remove the app"
      subtitleUz="Ilovani qo'shish, ishlatish va olib tashlash bo'yicha yo'riqnoma"
      en={<English />}
      uz={<Uzbek />}
    />
  )
}
