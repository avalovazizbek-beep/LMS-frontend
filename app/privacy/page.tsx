import { PublicDoc, Section, MailLink } from "@/components/public/PublicDoc"

export const metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy of the SamISI (SIES) Distance Learning System, including the Zoom integration",
}

const UPDATED_EN = "Last updated: September 26, 2026"
const UPDATED_UZ = "Oxirgi yangilanish: 2026-yil 26-sentyabr"

function English() {
  return (
    <>
      <Section title="1. Who we are">
        <p>
          This Privacy Policy applies to the Distance Learning System at lms.sies.uz (the &quot;System&quot;), operated by
          Samarkand Institute of Economics and Service (&quot;SamISI&quot;, &quot;SIES&quot;, &quot;we&quot;). The System is used only by
          the institute&apos;s students, teachers and staff.
        </p>
      </Section>

      <Section title="2. What data we collect">
        <p><b>Profile data.</b> Users sign in through HEMIS, the national higher-education information system. At sign-in we receive the user&apos;s name, login, group or position and similar profile fields from HEMIS.</p>
        <p><b>Zoom integration data.</b> Only verified teachers/staff can, by their own choice, connect a Zoom account. When they do, we receive and store: the OAuth access token and refresh token, the Zoom user ID and account ID, and the email address of the connected Zoom account. Students cannot connect Zoom.</p>
        <p><b>Meeting data.</b> When a teacher creates a class meeting with Zoom, we store the meeting topic, time, the Zoom meeting ID, the join link and password returned by Zoom, and the host start link.</p>
        <p>We request only the Zoom permissions needed for this: reading the connected user&apos;s basic profile (to show which account is connected) and creating meetings for that user.</p>
      </Section>

      <Section title="3. How we use the data">
        <p>Zoom data is used only to create class meetings in the teacher&apos;s own Zoom account and to show students the join link for their group&apos;s class. We do not use it for advertising, profiling or any other purpose.</p>
      </Section>

      <Section title="4. How the data is stored and protected">
        <p>Zoom access and refresh tokens and host start links are encrypted on our server with AES-256-GCM and are never stored in plain text. They are used only by our own backend, only on behalf of the teacher who connected the account. All traffic to the System uses HTTPS (TLS 1.2 or higher).</p>
      </Section>

      <Section title="5. Sharing">
        <p>Zoom data is sent only to Zoom&apos;s own API (api.zoom.us) to create meetings. We do not sell or share it with any other third party.</p>
      </Section>

      <Section title="6. Retention and deletion">
        <p><b>Disconnecting in the System.</b> A teacher can click &quot;Disconnect Zoom&quot; on the Profile page at any time. We then revoke the token at Zoom (which also removes the app from their Zoom account) and immediately delete the tokens, Zoom user ID, account ID, email and stored host start links.</p>
        <p><b>Removing the app in Zoom.</b> If the app is removed from the Zoom App Marketplace, Zoom notifies us (the &quot;app deauthorized&quot; event) and we immediately delete the same data automatically.</p>
        <p>Join links of classes that were already scheduled stay visible to that group&apos;s students so that classes are not interrupted. To have them deleted too, contact us (section 8).</p>
      </Section>

      <Section title="7. Your rights">
        <p>Any user can ask what data we hold about them and ask for it to be corrected or deleted by contacting us.</p>
      </Section>

      <Section title="8. Contact">
        <p>Privacy questions and requests: <MailLink /></p>
      </Section>
    </>
  )
}

function Uzbek() {
  return (
    <>
      <Section title="1. Biz kimmiz">
        <p>
          Ushbu Maxfiylik siyosati Samarqand Iqtisodiyot va Servis Instituti (&quot;SamISI&quot;, &quot;SIES&quot;, &quot;biz&quot;)
          tomonidan boshqariladigan Masofaviy Ta&apos;lim Tizimi (lms.sies.uz, &quot;Tizim&quot;) uchun amal qiladi. Tizimdan
          faqat institut talabalari, o&apos;qituvchilari va xodimlari foydalanadi.
        </p>
      </Section>

      <Section title="2. Qanday ma'lumotlar yig'iladi">
        <p><b>Profil ma&apos;lumotlari.</b> Tizimga HEMIS orqali kiriladi. Kirishda HEMIS&apos;dan ism-familiya, login, guruh yoki lavozim kabi profil ma&apos;lumotlari olinadi.</p>
        <p><b>Zoom integratsiyasi.</b> Faqat tasdiqlangan o&apos;qituvchi/xodimlar o&apos;z xohishi bilan Zoom hisobini ulashi mumkin. Ulanganda OAuth access va refresh token, Zoom user ID va account ID hamda ulangan Zoom hisobining email manzili saqlanadi. Talabalar Zoom ulay olmaydi.</p>
        <p><b>Meeting ma&apos;lumotlari.</b> O&apos;qituvchi Zoom orqali dars yaratganda meeting mavzusi, vaqti, Zoom meeting ID, Zoom qaytargan join havolasi va paroli hamda host (boshlash) havolasi saqlanadi.</p>
        <p>Zoom&apos;dan faqat shu uchun kerakli ruxsatlar so&apos;raladi: ulangan foydalanuvchining asosiy profilini o&apos;qish (qaysi hisob ulanganini ko&apos;rsatish uchun) va uning nomidan meeting yaratish.</p>
      </Section>

      <Section title="3. Ma'lumotlar nima uchun ishlatiladi">
        <p>Zoom ma&apos;lumotlari faqat o&apos;qituvchining o&apos;z Zoom hisobida dars yaratish va guruh talabalariga join havolasini ko&apos;rsatish uchun ishlatiladi. Reklama yoki boshqa maqsadlarda ishlatilmaydi.</p>
      </Section>

      <Section title="4. Saqlash va himoya">
        <p>Zoom tokenlari va host havolalari serverda AES-256-GCM bilan shifrlangan holda saqlanadi, ochiq matnda hech qayerda saqlanmaydi. Ular faqat Tizimning o&apos;z backend&apos;i orqali, faqat hisobni ulagan o&apos;qituvchi nomidan ishlatiladi. Tizim bilan barcha aloqa HTTPS (TLS 1.2 va undan yuqori) orqali.</p>
      </Section>

      <Section title="5. Ma'lumotlarni uzatish">
        <p>Zoom ma&apos;lumotlari faqat meeting yaratish uchun Zoom&apos;ning o&apos;z API&apos;siga (api.zoom.us) yuboriladi. Boshqa hech qanday uchinchi tomonga sotilmaydi yoki berilmaydi.</p>
      </Section>

      <Section title="6. Saqlash muddati va o'chirish">
        <p><b>Tizimda uzish.</b> O&apos;qituvchi Profil sahifasidagi &quot;Zoomni uzish&quot; tugmasini istalgan vaqtda bosishi mumkin. Shunda token Zoom&apos;da bekor qilinadi (ilova Zoom hisobidan ham o&apos;chadi) va tokenlar, Zoom user ID, account ID, email hamda saqlangan host havolalari darhol o&apos;chiriladi.</p>
        <p><b>Zoom tomonidan olib tashlash.</b> Ilova Zoom App Marketplace&apos;dan olib tashlansa, Zoom bizga xabar beradi (&quot;app deauthorized&quot;) va xuddi shu ma&apos;lumotlar darhol avtomatik o&apos;chiriladi.</p>
        <p>Allaqachon rejalashtirilgan darslarning join havolalari dars uzilmasligi uchun guruh talabalariga ko&apos;rinib qoladi. Ularni ham o&apos;chirish uchun biz bilan bog&apos;laning (8-bo&apos;lim).</p>
      </Section>

      <Section title="7. Foydalanuvchi huquqlari">
        <p>Har bir foydalanuvchi o&apos;zi haqida qanday ma&apos;lumot saqlanayotganini so&apos;rashi, uni tuzatish yoki o&apos;chirishni talab qilishi mumkin.</p>
      </Section>

      <Section title="8. Aloqa">
        <p>Maxfiylik bo&apos;yicha savol va so&apos;rovlar: <MailLink /></p>
      </Section>
    </>
  )
}

export default function PrivacyPolicyPage() {
  return (
    <PublicDoc
      titleEn="Privacy Policy"
      titleUz="Maxfiylik siyosati"
      subtitleEn={UPDATED_EN}
      subtitleUz={UPDATED_UZ}
      en={<English />}
      uz={<Uzbek />}
    />
  )
}
