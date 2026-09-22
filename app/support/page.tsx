import Link from "next/link"

export const metadata = {
  title: "Qo'llab-quvvatlash",
  description: "SamISI (SIES) Masofaviy Ta'lim Tizimi qo'llab-quvvatlash xizmati",
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

export default function SupportPage() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: "#f6f9ff" }}>
      <div className="mx-auto max-w-3xl px-5 py-14">
        <p className="text-xs uppercase tracking-wide mb-2" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          SamISI (SIES) Masofaviy Ta&apos;lim Tizimi
        </p>
        <h1 className="text-3xl font-bold mb-1" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
          Qo&apos;llab-quvvatlash
        </h1>
        <p className="text-xs mb-10" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          Zoom integratsiyasi va Tizimning boshqa qismlari bo&apos;yicha yordam
        </p>

        <Section title="Murojaat yuborish">
          <p>
            Tizimga kirgan foydalanuvchilar (talaba/o&apos;qituvchi) &quot;Murojaatlar&quot; bo&apos;limi orqali to&apos;g&apos;ridan-to&apos;g&apos;ri
            support so&apos;rovi (ticket) ochishi va javobni shu yerda kuzatishi mumkin.
          </p>
          <p>
            Tizimga hali kira olmayotganlar (shu jumladan Zoom sharhlovchilari) uchun — pastdagi email orqali murojaat qiling.
          </p>
        </Section>

        <Section title="Email orqali qo'llab-quvvatlash">
          <p>
            <a href="mailto:azizbekavalov132@gmail.com" style={{ color: "#0e58a8" }}>azizbekavalov132@gmail.com</a>
          </p>
          <p>Ish vaqti: Dushanba–Juma, 09:00–18:00 (Toshkent vaqti).</p>
          <p>Birinchi javob berish muddati (SLA): odatda 1 ish kuni ichida, eng ko&apos;pi bilan 2 ish kuni ichida.</p>
        </Section>

        <Section title="Bilimlar bazasi">
          <p>
            Ilovani qanday ulash, ishlatish va olib tashlash bo&apos;yicha qo&apos;llanma:{" "}
            <Link href="/docs" style={{ color: "#0e58a8" }}>lms.sies.uz/docs</Link>
          </p>
        </Section>
      </div>
    </main>
  )
}
