import { PublicDoc, Section, MailLink } from "@/components/public/PublicDoc"

export const metadata = {
  title: "Terms of Use",
  description: "Terms of Use of the SamISI (SIES) Distance Learning System",
}

function English() {
  return (
    <>
      <Section title="1. General">
        <p>
          These terms govern the use of the Distance Learning System at lms.sies.uz (the &quot;System&quot;), operated by
          Samarkand Institute of Economics and Service (&quot;SamISI&quot;, &quot;SIES&quot;, &quot;we&quot;). By signing in to or using
          the System you agree to these terms.
        </p>
      </Section>

      <Section title="2. Access">
        <p>The System is only for the institute&apos;s students and staff who have a HEMIS account. Each user is responsible for the security of their own account and must not share their login with anyone.</p>
      </Section>

      <Section title="3. Zoom integration">
        <p>Teachers can run online classes through Zoom. Connecting a Zoom account is optional and can be undone at any time on the Profile page or by removing the app in the Zoom App Marketplace. Meetings held on Zoom are also subject to Zoom&apos;s own Terms of Service (zoom.us/terms). How we handle Zoom data is described in our <a href="/privacy" style={{ color: "#0e58a8" }}>Privacy Policy</a>.</p>
      </Section>

      <Section title="4. User obligations">
        <p>Use the System only for study and teaching, lawfully, and without violating other users&apos; rights. Attempts to gain unauthorized access, to harm the System&apos;s security, or to use another person&apos;s account are prohibited.</p>
      </Section>

      <Section title="5. Disclaimer">
        <p>The System is provided &quot;as is&quot;. We do not guarantee uninterrupted or error-free operation, including interruptions caused by third-party services such as HEMIS or Zoom.</p>
      </Section>

      <Section title="6. Changes">
        <p>These terms may be updated from time to time. Important changes are announced in the System.</p>
      </Section>

      <Section title="7. Contact">
        <p>Questions: <MailLink /></p>
      </Section>
    </>
  )
}

function Uzbek() {
  return (
    <>
      <Section title="1. Umumiy qoidalar">
        <p>
          Ushbu shartlar Samarqand Iqtisodiyot va Servis Instituti (&quot;SamISI&quot;, &quot;SIES&quot;, &quot;biz&quot;) tomonidan
          boshqariladigan Masofaviy Ta&apos;lim Tizimi (lms.sies.uz, &quot;Tizim&quot;)dan foydalanishga tegishli. Tizimga kirish
          yoki undan foydalanish orqali siz ushbu shartlarga rozilik bildirasiz.
        </p>
      </Section>

      <Section title="2. Tizimga kirish">
        <p>Tizim faqat HEMIS hisobiga ega institut talabalari va xodimlari uchun. Har bir foydalanuvchi o&apos;z hisobi xavfsizligi uchun javobgar va loginini boshqalarga bermasligi kerak.</p>
      </Section>

      <Section title="3. Zoom integratsiyasi">
        <p>O&apos;qituvchilar onlayn darslarni Zoom orqali o&apos;tkazishi mumkin. Zoom hisobini ulash ixtiyoriy va istalgan vaqtda Profil sahifasida yoki Zoom App Marketplace&apos;da ilovani olib tashlash orqali bekor qilinadi. Zoom&apos;dagi meetinglar Zoom&apos;ning o&apos;z Foydalanish shartlariga (zoom.us/terms) ham bo&apos;ysunadi. Zoom ma&apos;lumotlari bilan qanday ishlashimiz <a href="/privacy" style={{ color: "#0e58a8" }}>Maxfiylik siyosati</a>da yozilgan.</p>
      </Section>

      <Section title="4. Foydalanuvchi majburiyatlari">
        <p>Tizimdan faqat o&apos;quv maqsadlarida, qonunga muvofiq va boshqalarning huquqlarini buzmagan holda foydalaning. Ruxsatsiz kirishga urinish, Tizim xavfsizligiga zarar yetkazish yoki boshqa odamning hisobidan foydalanish taqiqlanadi.</p>
      </Section>

      <Section title="5. Kafolatlarning cheklanishi">
        <p>Tizim &quot;bor holicha&quot; taqdim etiladi. Tizimning uzluksiz yoki xatosiz ishlashi, shu jumladan HEMIS yoki Zoom kabi uchinchi tomon xizmatlaridagi uzilishlar kafolatlanmaydi.</p>
      </Section>

      <Section title="6. O'zgarishlar">
        <p>Shartlar vaqti-vaqti bilan yangilanishi mumkin. Muhim o&apos;zgarishlar haqida Tizimda xabar beriladi.</p>
      </Section>

      <Section title="7. Aloqa">
        <p>Savollar uchun: <MailLink /></p>
      </Section>
    </>
  )
}

export default function TermsOfUsePage() {
  return (
    <PublicDoc
      titleEn="Terms of Use"
      titleUz="Foydalanish shartlari"
      subtitleEn="Last updated: September 26, 2026"
      subtitleUz="Oxirgi yangilanish: 2026-yil 26-sentyabr"
      en={<English />}
      uz={<Uzbek />}
    />
  )
}
