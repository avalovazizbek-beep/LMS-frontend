export const metadata = {
  title: "Maxfiylik siyosati",
  description: "SamISI (SIES) Masofaviy Ta'lim Tizimi maxfiylik siyosati",
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

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: "#f6f9ff" }}>
      <div className="mx-auto max-w-3xl px-5 py-14">
        <p className="text-xs uppercase tracking-wide mb-2" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          SamISI (SIES) Masofaviy Ta&apos;lim Tizimi
        </p>
        <h1 className="text-3xl font-bold mb-1" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
          Maxfiylik siyosati
        </h1>
        <p className="text-xs mb-10" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          Oxirgi yangilanish: 2026-yil sentyabr
        </p>

        <Section title="1. Kompaniya">
          <p>
            Ushbu Maxfiylik siyosati Samarqand Iqtisodiyot va Servis Instituti (&quot;SamISI&quot;, &quot;SIES&quot;, &quot;biz&quot;)
            tomonidan boshqariladigan Masofaviy Ta&apos;lim Tizimi (lms.sies.uz, keyingi o&apos;rinlarda &quot;Tizim&quot;)
            uchun amal qiladi. Tizim institutning talabalari, o&apos;qituvchilari va xodimlari uchun mo&apos;ljallangan.
          </p>
        </Section>

        <Section title="2. Qanday ma'lumotlar yig'iladi">
          <p><b>Profil ma&apos;lumotlari</b> — Tizimga kirish HEMIS (Oliy ta&apos;lim boshqaruv axborot tizimi) orqali amalga oshiriladi. Kirishda HEMIS&apos;dan ism-familiya, login, guruh/lavozim kabi profil ma&apos;lumotlari olinadi.</p>
          <p><b>Zoom integratsiyasi</b> — faqat o&apos;qituvchi/xodim roli tasdiqlangan foydalanuvchilar, o&apos;z xohishi bilan, o&apos;z Zoom hisobini Tizimga ulashi mumkin. Ulanganda Zoom&apos;dan OAuth access va refresh token hamda ulangan Zoom hisobining email manzili olinadi. Talabalar bu ruxsatga umuman kira olmaydi.</p>
          <p><b>Meeting ma&apos;lumotlari</b> — o&apos;qituvchi Zoom orqali dars (meeting) yaratganda, meeting sarlavhasi, vaqti va Zoom&apos;ning o&apos;zi qaytargan join havolasi Tizim bazasida saqlanadi.</p>
        </Section>

        <Section title="3. Ma'lumotlar qanday saqlanadi va himoyalanadi">
          <p>Zoom access va refresh tokenlar serverda AES-256-GCM algoritmi bilan shifrlangan holda saqlanadi — ochiq (shifrlanmagan) matn holida hech qayerda saqlanmaydi. Tokenlarga faqat shu o&apos;qituvchining o&apos;zi nomidan, Tizimning o&apos;z backend serveri orqali murojaat qilinadi.</p>
        </Section>

        <Section title="4. Ma'lumotlar kim bilan bo'lishiladi">
          <p>Zoom orqali olingan ma&apos;lumotlar faqat Zoom meeting yaratish funksiyasini ishga tushirish uchun, Zoom&apos;ning o&apos;z API&apos;siga (api.zoom.us) yuboriladi. Boshqa hech qanday uchinchi tomon kompaniya yoki reklama xizmatiga ma&apos;lumot uzatilmaydi yoki sotilmaydi.</p>
        </Section>

        <Section title="5. Saqlash muddati va ulanishni uzish">
          <p>O&apos;qituvchi istalgan vaqtda Profil sahifasidagi &quot;Zoomni uzish&quot; tugmasi orqali ulanishni bekor qilishi mumkin — shundan so&apos;ng Zoom token darhol &quot;bekor qilingan&quot; deb belgilanadi va Tizim tomonidan qayta ishlatilmaydi. Avval yaratilgan meeting havolalari (o&apos;quv jarayoni uzluksizligi uchun) saqlanib qoladi.</p>
        </Section>

        <Section title="6. Foydalanuvchi huquqlari">
          <p>Har qanday foydalanuvchi o&apos;ziga tegishli ma&apos;lumotlar haqida so&apos;rov yuborishi, ularni o&apos;chirishni yoki tuzatishni so&apos;rashi mumkin — quyidagi aloqa manzili orqali.</p>
        </Section>

        <Section title="7. Aloqa">
          <p>
            Maxfiylik bilan bog&apos;liq savollar uchun:{" "}
            <a href="mailto:azizbekavalov132@gmail.com" style={{ color: "#0e58a8" }}>azizbekavalov132@gmail.com</a>
          </p>
        </Section>
      </div>
    </main>
  )
}
