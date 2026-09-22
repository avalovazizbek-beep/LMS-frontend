export const metadata = {
  title: "Foydalanish shartlari",
  description: "SamISI (SIES) Masofaviy Ta'lim Tizimi foydalanish shartlari",
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold mb-2" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
        {title}
      </h2>
      <div className="text-sm leading-relaxed space-y-2" style={{ color: "#33415c", fontFamily: "var(--font-poppins)" }}>
        {children}
      </div>
    </section>
  )
}

export default function TermsOfUsePage() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: "#f6f9ff" }}>
      <div className="mx-auto max-w-3xl px-5 py-14">
        <p className="text-xs uppercase tracking-wide mb-2" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          SamISI (SIES) Masofaviy Ta&apos;lim Tizimi
        </p>
        <h1 className="text-3xl font-bold mb-1" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
          Foydalanish shartlari
        </h1>
        <p className="text-xs mb-10" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          Oxirgi yangilanish: 2026-yil sentyabr
        </p>

        <Section title="1. Umumiy qoidalar">
          <p>
            Ushbu shartlar Samarqand Iqtisodiyot va Servis Instituti (&quot;SamISI&quot;, &quot;SIES&quot;, &quot;biz&quot;) tomonidan
            boshqariladigan Masofaviy Ta&apos;lim Tizimi (lms.sies.uz, &quot;Tizim&quot;)dan foydalanishga tegishli. Tizimga
            kirish yoki undan foydalanish orqali siz ushbu shartlarga rozilik bildirasiz.
          </p>
        </Section>

        <Section title="2. Tizimga kirish">
          <p>
            Tizimga kirish faqat institutning HEMIS (Oliy ta&apos;lim boshqaruv axborot tizimi) hisobiga ega
            talaba va xodimlar uchun mo&apos;ljallangan. Har bir foydalanuvchi o&apos;z hisobi xavfsizligi
            uchun mas&apos;uldir va login/parolni uchinchi shaxslarga bermasligi kerak.
          </p>
        </Section>

        <Section title="3. Zoom integratsiyasi">
          <p>
            Tizim o&apos;qituvchilarga onlayn darslarni Zoom orqali o&apos;tkazish imkonini beradi. O&apos;qituvchi
            o&apos;z Zoom hisobini ixtiyoriy ravishda ulaydi va istalgan vaqtda uzishi mumkin. Zoom orqali
            o&apos;tkaziladigan meetinglar, shuningdek, Zoom&apos;ning o&apos;z Foydalanish shartlariga
            (zoom.us/terms) ham bo&apos;ysunadi.
          </p>
        </Section>

        <Section title="4. Foydalanuvchi majburiyatlari">
          <p>Foydalanuvchi Tizimdan faqat o&apos;quv maqsadlarida, qonunga muvofiq va boshqa foydalanuvchilar huquqlarini buzmagan holda foydalanishi shart. Tizim xavfsizligiga zarar yetkazadigan, ruxsatsiz kirish urinishlari yoki boshqa foydalanuvchi hisobidan foydalanish taqiqlanadi.</p>
        </Section>

        <Section title="5. Kafolatlarning cheklanishi">
          <p>Tizim &quot;bor holicha&quot; taqdim etiladi. Biz Tizimning uzluksiz yoki xatoliksiz ishlashini kafolatlamaymiz, shu jumladan uchinchi tomon xizmatlari (HEMIS, Zoom) tomon yuzaga kelishi mumkin bo&apos;lgan uzilishlar uchun.</p>
        </Section>

        <Section title="6. Shartlarga o'zgartirish kiritish">
          <p>Ushbu shartlar vaqti-vaqti bilan yangilanishi mumkin. Muhim o&apos;zgarishlar haqida Tizim orqali xabar beriladi.</p>
        </Section>

        <Section title="7. Aloqa">
          <p>
            Savollar uchun:{" "}
            <a href="mailto:azizbekavalov132@gmail.com" style={{ color: "#0e58a8" }}>azizbekavalov132@gmail.com</a>
          </p>
        </Section>
      </div>
    </main>
  )
}
