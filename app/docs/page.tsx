export const metadata = {
  title: "Zoom integratsiyasi — qo'llanma",
  description: "Zoom integratsiyasini ulash, ishlatish va olib tashlash bo'yicha qo'llanma",
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-semibold mb-3" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
        {title}
      </h2>
      <div className="text-sm leading-relaxed space-y-3" style={{ color: "#33415c", fontFamily: "var(--font-poppins)" }}>
        {children}
      </div>
    </section>
  )
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
        style={{ backgroundColor: "#0e58a8" }}
      >
        {n}
      </span>
      <p>{children}</p>
    </div>
  )
}

export default function DocsPage() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: "#f6f9ff" }}>
      <div className="mx-auto max-w-3xl px-5 py-14">
        <p className="text-xs uppercase tracking-wide mb-2" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          SamISI (SIES) Masofaviy Ta&apos;lim Tizimi
        </p>
        <h1 className="text-3xl font-bold mb-1" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
          Zoom integratsiyasi — qo&apos;llanma
        </h1>
        <p className="text-xs mb-10" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          Ilovani qo&apos;shish, ishlatish va olib tashlash bo&apos;yicha to&apos;liq yo&apos;riqnoma
        </p>

        <Section title="1. Ilovani qo'shish (ulash)">
          <div className="space-y-3">
            <Step n={1}>lms.sies.uz saytiga HEMIS orqali o&apos;qituvchi/xodim sifatida kiring.</Step>
            <Step n={2}>Yuqori o&apos;ng burchakdagi menyudan &quot;Profil&quot; sahifasiga o&apos;ting.</Step>
            <Step n={3}>&quot;Integratsiyalar&quot; kartasida yoshni/rolni tasdiqlash belgisini (checkbox) qo&apos;ying.</Step>
            <Step n={4}>&quot;Zoom account&apos;ni ulash&quot; tugmasini bosing.</Step>
            <Step n={5}>Zoom&apos;ning o&apos;z sahifasida hisobingiz bilan kiring va so&apos;ralgan ruxsatlarni (scope) tasdiqlang (&quot;Allow&quot;).</Step>
            <Step n={6}>Profil sahifasiga avtomatik qaytariladi va &quot;Zoom account muvaffaqiyatli ulandi&quot; xabari ko&apos;rinadi.</Step>
          </div>
          <p className="pt-2">
            <b>Muammolarni bartaraf etish:</b> agar &quot;Ulanmadi&quot; xabari chiqsa, qaytadan &quot;Zoom account&apos;ni ulash&quot;ni bosib urinib
            ko&apos;ring. Agar holat &quot;Qayta ulash kerak&quot; deb ko&apos;rinsa, Zoom tomonidan ruxsat muddati tugagan — xuddi shu
            tugma orqali qayta ulang. Muammo davom etsa, <a href="/support" style={{ color: "#0e58a8" }}>qo&apos;llab-quvvatlash</a> xizmatiga murojaat qiling.
          </p>
        </Section>

        <Section title="2. Foydalanish">
          <p><b>Zoom orqali dars (meeting) yaratish</b> — o&apos;qituvchi uchun.</p>
          <p>Old shart: Zoom hisobi ulangan bo&apos;lishi kerak (1-bo&apos;lim).</p>
          <div className="space-y-3">
            <Step n={1}>Meeting/Jadval bo&apos;limida yangi dars yarating.</Step>
            <Step n={2}>&quot;Zoom meeting ham yaratilsin&quot; belgisini yoqing, sarlavha va vaqtni kiriting.</Step>
            <Step n={3}>Saqlagach, Zoom join havolasi avtomatik yaratiladi va shu darsga biriktiriladi.</Step>
          </div>
          <p className="pt-3"><b>Meetingga qo'shilish</b> — talaba uchun.</p>
          <p>Old shart: guruhga tegishli darsda Zoom meeting yaratilgan bo&apos;lishi kerak.</p>
          <div className="space-y-3">
            <Step n={1}>Meeting/Jadval bo&apos;limida tegishli darsni oching.</Step>
            <Step n={2}>&quot;Zoomga kirish&quot; havolasini bosing — Zoom ilovasi yoki brauzerda meeting ochiladi.</Step>
          </div>
        </Section>

        <Section title="3. Ilovani olib tashlash (ulanishni uzish)">
          <div className="space-y-3">
            <Step n={1}>Profil sahifasidagi &quot;Integratsiyalar&quot; kartasiga o&apos;ting.</Step>
            <Step n={2}>&quot;Zoomni uzish&quot; tugmasini bosing va tasdiqlang.</Step>
          </div>
          <p className="pt-2">
            <b>Bekor qilingandan keyin nima bo&apos;ladi:</b> Tizimda saqlangan Zoom access/refresh token darhol
            bekor qilingan deb belgilanadi va boshqa ishlatilmaydi — Zoom hisobingizga yangi kirish faqat
            qaytadan ulaganingizdan so&apos;ng mumkin bo&apos;ladi. Ilgari yaratilgan meeting havolalari (o&apos;quv
            jarayoni uzluksizligi uchun) tizimda saqlanib qoladi, lekin ular orqali yangi meeting yaratib
            bo&apos;lmaydi. Saqlangan tarixiy ma&apos;lumotlarni to&apos;liq o&apos;chirishni so&apos;rash uchun{" "}
            <a href="/support" style={{ color: "#0e58a8" }}>qo&apos;llab-quvvatlash</a> xizmatiga murojaat qiling.
          </p>
        </Section>
      </div>
    </main>
  )
}
