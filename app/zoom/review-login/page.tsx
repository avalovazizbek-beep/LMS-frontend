import Link from "next/link"
import { PublicDoc, Section, MailLink } from "@/components/public/PublicDoc"
import { ZoomReviewLoginForm } from "@/components/public/ZoomReviewLoginForm"

/* Zoom Marketplace tekshiruvchilari uchun alohida kirish sahifasi —
   asosiy /login sahifasi faqat HEMIS OAuth bo'lib qoladi. Login-parol
   ilova topshirig'idagi "Test account" maydonida beriladi. */

export const metadata = {
  title: "Zoom review — test account sign-in",
  description: "Sign-in page for Zoom Marketplace reviewers of the SamISI (SIES) Distance Learning System",
  robots: { index: false, follow: false },
}

const link = { color: "#0e58a8" }

export default function ZoomReviewLoginPage() {
  return (
    <PublicDoc
      titleEn="Zoom review — test account"
      subtitleEn="For Zoom Marketplace reviewers only"
      en={
        <>
          <Section title="Sign in">
            <p>
              Use the username and password given in the app submission (&quot;Test account&quot; field / review notes).
              Regular teachers sign in through HEMIS on the <Link href="/login" style={link}>main sign-in page</Link>.
            </p>
            <div className="pt-2">
              <ZoomReviewLoginForm />
            </div>
          </Section>
          <Section title="About this account">
            <p>
              It is a teacher account that exists only for testing the Zoom integration. It can open the
              <b> Profile</b> page (connect / disconnect Zoom) and the <b>Meeting</b> page (create a class meeting with
              Zoom). It has one sandbox class group, &quot;ZOOM-M-TEST&quot;, with no real students, and it cannot see any
              student or institute data.
            </p>
            <p>
              Step-by-step test plan: <Link href="/zoom/test-plan" style={link}>lms.sies.uz/zoom/test-plan</Link>.
              Questions: <MailLink />.
            </p>
          </Section>
        </>
      }
    />
  )
}
