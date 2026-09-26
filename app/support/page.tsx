import Link from "next/link"
import { PublicDoc, Section, MailLink } from "@/components/public/PublicDoc"

export const metadata = {
  title: "Support",
  description: "Support for the SamISI (SIES) Distance Learning System and its Zoom integration",
}

function English() {
  return (
    <>
      <Section title="Contact support">
        <p>Signed-in users (students and teachers) can open a support request in the &quot;Support requests&quot; section of the System and follow the reply there.</p>
        <p>If you cannot sign in (including Zoom reviewers), contact us by email.</p>
      </Section>

      <Section title="Email support">
        <p><MailLink /></p>
        <p>Working hours: Monday–Friday, 09:00–18:00 (Tashkent time, UTC+5).</p>
        <p>First response time: usually within 1 business day, at most 2 business days.</p>
      </Section>

      <Section title="Documentation">
        <p>
          How to add, use and remove the Zoom app:{" "}
          <Link href="/docs" style={{ color: "#0e58a8" }}>lms.sies.uz/docs</Link>
        </p>
        <p>
          Privacy Policy: <Link href="/privacy" style={{ color: "#0e58a8" }}>lms.sies.uz/privacy</Link> · Terms of Use:{" "}
          <Link href="/terms" style={{ color: "#0e58a8" }}>lms.sies.uz/terms</Link>
        </p>
      </Section>
    </>
  )
}

function Uzbek() {
  return (
    <>
      <Section title="Murojaat yuborish">
        <p>Tizimga kirgan foydalanuvchilar (talaba va o&apos;qituvchilar) &quot;Murojaatlar&quot; bo&apos;limida so&apos;rov ochib, javobni shu yerda kuzatishi mumkin.</p>
        <p>Tizimga kira olmayotgan bo&apos;lsangiz (Zoom sharhlovchilari ham), email orqali murojaat qiling.</p>
      </Section>

      <Section title="Email orqali yordam">
        <p><MailLink /></p>
        <p>Ish vaqti: Dushanba–Juma, 09:00–18:00 (Toshkent vaqti, UTC+5).</p>
        <p>Birinchi javob muddati: odatda 1 ish kuni ichida, ko&apos;pi bilan 2 ish kuni.</p>
      </Section>

      <Section title="Qo'llanmalar">
        <p>
          Zoom ilovasini ulash, ishlatish va olib tashlash:{" "}
          <Link href="/docs" style={{ color: "#0e58a8" }}>lms.sies.uz/docs</Link>
        </p>
        <p>
          Maxfiylik siyosati: <Link href="/privacy" style={{ color: "#0e58a8" }}>lms.sies.uz/privacy</Link> · Foydalanish shartlari:{" "}
          <Link href="/terms" style={{ color: "#0e58a8" }}>lms.sies.uz/terms</Link>
        </p>
      </Section>
    </>
  )
}

export default function SupportPage() {
  return (
    <PublicDoc
      titleEn="Support"
      titleUz="Qo'llab-quvvatlash"
      subtitleEn="Help with the Zoom integration and the rest of the System"
      subtitleUz="Zoom integratsiyasi va Tizimning boshqa qismlari bo'yicha yordam"
      en={<English />}
      uz={<Uzbek />}
    />
  )
}
