import Link from "next/link"
import { PublicDoc, Section, Step } from "@/components/public/PublicDoc"
import { ZoomAddButton } from "@/components/public/ZoomAddButton"

/* Zoom Marketplace'dagi "Visit Site to Add" tugmasi shu sahifaga olib keladi
   (Direct landing URL). Ilova faqat shu yerdan, HEMIS xodim login'i va
   18+ tasdig'idan keyin ulanadi — Zoom EDU age-gate talabi. */

export const metadata = {
  title: "Add Zoom integration",
  description: "Add the Zoom integration of the SamISI (SIES) Distance Learning System — for verified teachers and staff aged 18 or over",
}

const link = { color: "#0e58a8" }

function English() {
  return (
    <>
      <Section title="Who can add this app">
        <p>
          The Zoom integration can be added only by <b>teachers and staff</b> of Samarkand Institute of Economics and
          Service who are <b>18 years of age or older</b>.
        </p>
        <p>
          The System has no public sign-up. Sign-in is possible only through HEMIS, the national higher-education
          information system, with an account issued by the institute. Only employee accounts can open the Zoom
          connection page; students cannot connect Zoom, and the server rejects any connection attempt from a student
          account.
        </p>
        <p>Before connecting, every teacher must also confirm that they are 18 or older. The connection cannot start without this confirmation.</p>
      </Section>

      <Section title="How to add">
        <div className="space-y-3">
          <Step n={1}>Click the button below and sign in through HEMIS with your <b>employee</b> account.</Step>
          <Step n={2}>You are taken to your Profile page, &quot;Integrations&quot; card.</Step>
          <Step n={3}>Confirm that you are 18 or older and a verified teacher/staff member.</Step>
          <Step n={4}>Click &quot;Connect Zoom account&quot; and approve the permissions on Zoom&apos;s page.</Step>
        </div>
        <div className="pt-4">
          <ZoomAddButton label="Sign in to add Zoom" />
        </div>
      </Section>

      <Section title="What the app does">
        <p>Teachers create class meetings in their own Zoom account directly from the System, and students of the group see the join link on the Meeting page.</p>
        <p>
          <Link href="/docs" style={link}>Documentation</Link> · <Link href="/privacy" style={link}>Privacy Policy</Link> ·{" "}
          <Link href="/terms" style={link}>Terms of Use</Link> · <Link href="/support" style={link}>Support</Link>
        </p>
      </Section>
    </>
  )
}

function Uzbek() {
  return (
    <>
      <Section title="Ilovani kim qo'sha oladi">
        <p>
          Zoom integratsiyasini faqat Samarqand Iqtisodiyot va Servis Institutining <b>18 yoshdan katta o&apos;qituvchi va
          xodimlari</b> qo&apos;sha oladi.
        </p>
        <p>
          Tizimda ochiq ro&apos;yxatdan o&apos;tish yo&apos;q. Kirish faqat HEMIS orqali, institut bergan hisob bilan amalga oshiriladi.
          Zoom ulash sahifasini faqat xodim hisoblari ocha oladi; talabalar Zoom ulay olmaydi va server talaba hisobidan
          kelgan har qanday ulanish urinishini rad etadi.
        </p>
        <p>Ulashdan oldin har bir o&apos;qituvchi 18 yoshdan kattaligini tasdiqlashi shart — tasdiqsiz ulanish boshlanmaydi.</p>
      </Section>

      <Section title="Qanday qo'shiladi">
        <div className="space-y-3">
          <Step n={1}>Quyidagi tugmani bosib, HEMIS orqali <b>xodim</b> hisobingiz bilan kiring.</Step>
          <Step n={2}>Profil sahifangizdagi &quot;Integratsiyalar&quot; kartasiga o&apos;tasiz.</Step>
          <Step n={3}>18 yoshdan kattaligingiz va tasdiqlangan o&apos;qituvchi/xodim ekaningizni tasdiqlang.</Step>
          <Step n={4}>&quot;Zoom account&apos;ni ulash&quot;ni bosing va Zoom sahifasida ruxsatlarni tasdiqlang.</Step>
        </div>
        <div className="pt-4">
          <ZoomAddButton label="Kirish va Zoom'ni qo'shish" />
        </div>
      </Section>

      <Section title="Ilova nima qiladi">
        <p>O&apos;qituvchi Tizimning o&apos;zidan o&apos;z Zoom hisobida dars yaratadi, guruh talabalari esa Meeting sahifasida join havolasini ko&apos;radi.</p>
        <p>
          <Link href="/docs" style={link}>Qo&apos;llanma</Link> · <Link href="/privacy" style={link}>Maxfiylik siyosati</Link> ·{" "}
          <Link href="/terms" style={link}>Foydalanish shartlari</Link> · <Link href="/support" style={link}>Yordam</Link>
        </p>
      </Section>
    </>
  )
}

export default function ZoomLandingPage() {
  return (
    <PublicDoc
      titleEn="Add the Zoom integration"
      titleUz="Zoom integratsiyasini qo'shish"
      subtitleEn="For verified SamISI teachers and staff, 18 or older"
      subtitleUz="Faqat SamISI'ning tasdiqlangan, 18 yoshdan katta o'qituvchi va xodimlari uchun"
      en={<English />}
      uz={<Uzbek />}
    />
  )
}
