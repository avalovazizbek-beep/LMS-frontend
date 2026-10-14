import { PublicDoc, Section, MailLink } from "@/components/public/PublicDoc"

export const metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy of the SamISI (SIES) Distance Learning System, including the Zoom integration",
}

const UPDATED_EN = "Last updated: October 14, 2026"
const UPDATED_UZ = "Oxirgi yangilanish: 2026-yil 14-oktyabr"

const list = "list-disc pl-5 space-y-1"

function English() {
  return (
    <>
      <Section title="1. Who we are">
        <p>
          This Privacy Policy applies to the Distance Learning System at lms.sies.uz (the &quot;System&quot;), operated by
          Samarkand Institute of Economics and Service (&quot;SamISI&quot;, &quot;SIES&quot;, &quot;we&quot;), Samarkand, Uzbekistan.
          Samarkand Institute of Economics and Service is the controller of the personal data described here. The System is
          used only by the institute&apos;s students, teachers and staff.
        </p>
      </Section>

      <Section title="2. What data we collect">
        <p><b>Profile data.</b> Users sign in through HEMIS, the national higher-education information system. At sign-in we receive the user&apos;s name, login, group or position and similar profile fields from HEMIS.</p>
        <p><b>Study data.</b> Data created while using the System: attendance, test, exam and assignment results, files users upload, participation in online classes, and class recordings that teachers save to the System.</p>
        <p><b>Face ID data.</b> For online exams and attendance checks, a student registers their face once. The browser turns the camera image into a numeric face template, and only this template is sent and stored. We do not store photos or video of the face. During an exam we record only the outcome of the check (for example, the type of a rule violation), not images.</p>
        <p><b>Zoom integration data.</b> Only verified teachers/staff can, by their own choice, connect a Zoom account. When they do, we receive and store: the OAuth access token and refresh token, the Zoom user ID and account ID, and the email address of the connected Zoom account. Students cannot connect Zoom.</p>
        <p><b>Meeting data.</b> When a teacher creates a class meeting with Zoom, we store the meeting topic, time, the Zoom meeting ID, the join link and password returned by Zoom, and the host start link.</p>
        <p>We request only the Zoom permissions needed for this: reading the connected user&apos;s basic profile (to show which account is connected) and creating meetings for that user.</p>
        <p><b>Technical data.</b> A sign-in token and the chosen interface language are kept in the user&apos;s browser. Our server keeps standard logs (IP address, time, requested address) for security and troubleshooting.</p>
      </Section>

      <Section title="3. How we use the data and on what basis">
        <p>We process personal data in accordance with the Law of the Republic of Uzbekistan &quot;On Personal Data&quot; and only to run the institute&apos;s education: giving access to courses, recording attendance and grades, holding online classes and exams, and keeping exams fair.</p>
        <p>Connecting a Zoom account is optional and is based on the teacher&apos;s consent, which can be withdrawn at any time by disconnecting (section 6). Zoom data is used only to create class meetings in the teacher&apos;s own Zoom account and to show students the join link for their group&apos;s class. We do not use any personal data for advertising, profiling or any other purpose.</p>
      </Section>

      <Section title="4. How the data is stored and protected">
        <p>Data is stored on the institute&apos;s own servers in Uzbekistan. Zoom access and refresh tokens and host start links are encrypted with AES-256-GCM and are never stored in plain text. They are used only by our own backend, only on behalf of the teacher who connected the account. All traffic to the System is encrypted with HTTPS. Access to personal data inside the System is limited by role: students see only their own data, and teachers and administrators see only what their duties require.</p>
      </Section>

      <Section title="5. Sharing">
        <p>We do not sell personal data. We share it only:</p>
        <ul className={list}>
          <li>with Zoom (api.zoom.us), to create meetings for a teacher who connected their Zoom account;</li>
          <li>with authorized institute staff (teachers, deans, administrators) as their duties require;</li>
          <li>with state authorities when the law of the Republic of Uzbekistan requires it.</li>
        </ul>
      </Section>

      <Section title="6. Retention and deletion">
        <p><b>Disconnecting in the System.</b> A teacher can click &quot;Disconnect Zoom&quot; on the Profile page at any time. We then revoke the token at Zoom (which also removes the app from their Zoom account) and immediately delete the tokens, Zoom user ID, account ID, email and stored host start links.</p>
        <p><b>Removing the app in Zoom.</b> If the app is removed from the Zoom App Marketplace, Zoom notifies us (the &quot;app deauthorized&quot; event) and we immediately delete the same data automatically.</p>
        <p>Join links of classes that were already scheduled stay visible to that group&apos;s students so that classes are not interrupted. To have them deleted too, contact us (section 10).</p>
        <p><b>Other data.</b> Profile and study data are kept while the person studies or works at the institute, and afterwards only as long as education record-keeping rules require. A Face ID template is kept until it is reset or the account is removed.</p>
      </Section>

      <Section title="7. Children">
        <p>Some students may be under 18. Their data is processed only for the institute&apos;s educational purposes described above. Students, including those under 18, cannot connect or authorize the Zoom integration; only teachers and staff aged 18 or over can.</p>
      </Section>

      <Section title="8. Your rights">
        <p>Under the Law of the Republic of Uzbekistan &quot;On Personal Data&quot;, every user has the right to:</p>
        <ul className={list}>
          <li><b>access</b>: know whether we process their data and receive a copy of it;</li>
          <li><b>correction</b>: have inaccurate or incomplete data corrected;</li>
          <li><b>deletion and restriction</b>: have data deleted or its processing restricted when it is no longer needed or is processed unlawfully;</li>
          <li><b>withdraw consent</b> at any time, for example by disconnecting Zoom, without affecting earlier processing;</li>
          <li><b>object</b> to processing of their data;</li>
          <li><b>complain</b> to the authorized state body for personal data of the Republic of Uzbekistan or to a court.</li>
        </ul>
      </Section>

      <Section title="9. How to exercise your rights">
        <p>Send a request to <MailLink />. Include your full name, your HEMIS login and your group or department, and say which right you want to use and for what data. We may ask you to confirm your identity before acting on the request.</p>
        <p>We answer within 30 days, free of charge. Teachers can also disconnect Zoom and delete their Zoom data themselves at any time on the Profile page.</p>
      </Section>

      <Section title="10. Contact and changes">
        <p>Privacy questions and requests: <MailLink /></p>
        <p>If we change this policy, we update the date at the top of this page.</p>
      </Section>
    </>
  )
}

function Uzbek() {
  return (
    <>
      <Section title="1. Biz kimmiz">
        <p>
          Ushbu Maxfiylik siyosati Samarqand Iqtisodiyot va Servis Instituti (&quot;SamISI&quot;, &quot;SIES&quot;, &quot;biz&quot;, Samarqand,
          O&apos;zbekiston) tomonidan boshqariladigan Masofaviy Ta&apos;lim Tizimi (lms.sies.uz, &quot;Tizim&quot;) uchun amal qiladi. Bu yerda
          tasvirlangan shaxsga doir ma&apos;lumotlarning operatori — Samarqand Iqtisodiyot va Servis Instituti. Tizimdan faqat institut
          talabalari, o&apos;qituvchilari va xodimlari foydalanadi.
        </p>
      </Section>

      <Section title="2. Qanday ma'lumotlar yig'iladi">
        <p><b>Profil ma&apos;lumotlari.</b> Tizimga HEMIS orqali kiriladi. Kirishda HEMIS&apos;dan ism-familiya, login, guruh yoki lavozim kabi profil ma&apos;lumotlari olinadi.</p>
        <p><b>O&apos;qish ma&apos;lumotlari.</b> Tizimdan foydalanishda hosil bo&apos;ladigan ma&apos;lumotlar: davomat, test, imtihon va topshiriq natijalari, foydalanuvchi yuklagan fayllar, onlayn darslarda qatnashish va o&apos;qituvchilar Tizimga saqlagan dars yozuvlari.</p>
        <p><b>Face ID ma&apos;lumotlari.</b> Onlayn imtihon va davomat tekshiruvi uchun talaba yuzini bir marta ro&apos;yxatdan o&apos;tkazadi. Brauzer kamera tasvirini raqamli yuz shabloniga aylantiradi va faqat shu shablon yuboriladi va saqlanadi. Yuz rasmi yoki videosi saqlanmaydi. Imtihon paytida faqat tekshiruv natijasi (masalan, qoidabuzarlik turi) yoziladi, tasvir emas.</p>
        <p><b>Zoom integratsiyasi.</b> Faqat tasdiqlangan o&apos;qituvchi/xodimlar o&apos;z xohishi bilan Zoom hisobini ulashi mumkin. Ulanganda OAuth access va refresh token, Zoom user ID va account ID hamda ulangan Zoom hisobining email manzili saqlanadi. Talabalar Zoom ulay olmaydi.</p>
        <p><b>Meeting ma&apos;lumotlari.</b> O&apos;qituvchi Zoom orqali dars yaratganda meeting mavzusi, vaqti, Zoom meeting ID, Zoom qaytargan join havolasi va paroli hamda host (boshlash) havolasi saqlanadi.</p>
        <p>Zoom&apos;dan faqat shu uchun kerakli ruxsatlar so&apos;raladi: ulangan foydalanuvchining asosiy profilini o&apos;qish (qaysi hisob ulanganini ko&apos;rsatish uchun) va uning nomidan meeting yaratish.</p>
        <p><b>Texnik ma&apos;lumotlar.</b> Kirish tokeni va tanlangan interfeys tili foydalanuvchi brauzerida saqlanadi. Serverimiz xavfsizlik va nosozliklarni aniqlash uchun odatiy jurnallarni (IP manzil, vaqt, so&apos;ralgan manzil) yuritadi.</p>
      </Section>

      <Section title="3. Ma'lumotlar nima uchun va qanday asosda ishlatiladi">
        <p>Shaxsga doir ma&apos;lumotlar O&apos;zbekiston Respublikasining &quot;Shaxsga doir ma&apos;lumotlar to&apos;g&apos;risida&quot;gi Qonuniga muvofiq va faqat institutning ta&apos;lim faoliyati uchun ishlatiladi: kurslarga kirish, davomat va baholarni yuritish, onlayn dars va imtihonlarni o&apos;tkazish, imtihonlarning halolligini ta&apos;minlash.</p>
        <p>Zoom hisobini ulash ixtiyoriy va o&apos;qituvchining roziligiga asoslanadi; rozilikni istalgan vaqtda Zoom&apos;ni uzib qaytarib olish mumkin (6-bo&apos;lim). Zoom ma&apos;lumotlari faqat o&apos;qituvchining o&apos;z Zoom hisobida dars yaratish va guruh talabalariga join havolasini ko&apos;rsatish uchun ishlatiladi. Hech qanday shaxsiy ma&apos;lumot reklama, profillash yoki boshqa maqsadlarda ishlatilmaydi.</p>
      </Section>

      <Section title="4. Saqlash va himoya">
        <p>Ma&apos;lumotlar institutning O&apos;zbekistondagi o&apos;z serverlarida saqlanadi. Zoom tokenlari va host havolalari AES-256-GCM bilan shifrlangan holda saqlanadi, ochiq matnda hech qayerda saqlanmaydi. Ular faqat Tizimning o&apos;z backend&apos;i orqali, faqat hisobni ulagan o&apos;qituvchi nomidan ishlatiladi. Tizim bilan barcha aloqa HTTPS orqali shifrlanadi. Tizim ichida ma&apos;lumotlarga kirish rol bo&apos;yicha cheklangan: talaba faqat o&apos;z ma&apos;lumotlarini, o&apos;qituvchi va ma&apos;murlar esa faqat vazifasi uchun keraklisini ko&apos;radi.</p>
      </Section>

      <Section title="5. Ma'lumotlarni uzatish">
        <p>Shaxsiy ma&apos;lumotlar sotilmaydi. Ular faqat quyidagilarga beriladi:</p>
        <ul className={list}>
          <li>Zoom&apos;ga (api.zoom.us) — Zoom hisobini ulagan o&apos;qituvchi uchun meeting yaratishda;</li>
          <li>institutning vakolatli xodimlariga (o&apos;qituvchi, dekanat, ma&apos;murlar) — vazifasi talab qilgan darajada;</li>
          <li>davlat organlariga — O&apos;zbekiston Respublikasi qonunchiligi talab qilgan hollarda.</li>
        </ul>
      </Section>

      <Section title="6. Saqlash muddati va o'chirish">
        <p><b>Tizimda uzish.</b> O&apos;qituvchi Profil sahifasidagi &quot;Zoomni uzish&quot; tugmasini istalgan vaqtda bosishi mumkin. Shunda token Zoom&apos;da bekor qilinadi (ilova Zoom hisobidan ham o&apos;chadi) va tokenlar, Zoom user ID, account ID, email hamda saqlangan host havolalari darhol o&apos;chiriladi.</p>
        <p><b>Zoom tomonidan olib tashlash.</b> Ilova Zoom App Marketplace&apos;dan olib tashlansa, Zoom bizga xabar beradi (&quot;app deauthorized&quot;) va xuddi shu ma&apos;lumotlar darhol avtomatik o&apos;chiriladi.</p>
        <p>Allaqachon rejalashtirilgan darslarning join havolalari dars uzilmasligi uchun guruh talabalariga ko&apos;rinib qoladi. Ularni ham o&apos;chirish uchun biz bilan bog&apos;laning (10-bo&apos;lim).</p>
        <p><b>Boshqa ma&apos;lumotlar.</b> Profil va o&apos;qish ma&apos;lumotlari shaxs institutda o&apos;qishi yoki ishlashi davomida, keyin esa faqat ta&apos;lim hujjatlarini yuritish qoidalari talab qilgan muddatda saqlanadi. Face ID shabloni u qayta o&apos;rnatilguncha yoki hisob o&apos;chirilguncha saqlanadi.</p>
      </Section>

      <Section title="7. Voyaga yetmaganlar">
        <p>Ayrim talabalar 18 yoshga to&apos;lmagan bo&apos;lishi mumkin. Ularning ma&apos;lumotlari faqat yuqorida ko&apos;rsatilgan ta&apos;lim maqsadlarida ishlatiladi. Talabalar, jumladan 18 yoshga to&apos;lmaganlar, Zoom integratsiyasini ulay olmaydi — buni faqat 18 yoshdan katta o&apos;qituvchi va xodimlar qila oladi.</p>
      </Section>

      <Section title="8. Foydalanuvchi huquqlari">
        <p>O&apos;zbekiston Respublikasining &quot;Shaxsga doir ma&apos;lumotlar to&apos;g&apos;risida&quot;gi Qonuniga ko&apos;ra har bir foydalanuvchi quyidagi huquqlarga ega:</p>
        <ul className={list}>
          <li><b>bilish</b>: ma&apos;lumotlari ishlanayotganini bilish va ularning nusxasini olish;</li>
          <li><b>tuzatish</b>: noto&apos;g&apos;ri yoki to&apos;liq bo&apos;lmagan ma&apos;lumotlarni tuzattirish;</li>
          <li><b>o&apos;chirish va cheklash</b>: ma&apos;lumot endi kerak bo&apos;lmasa yoki qonunga zid ishlanayotgan bo&apos;lsa, uni o&apos;chirtirish yoki ishlanishini cheklatish;</li>
          <li><b>rozilikni qaytarib olish</b>: istalgan vaqtda, masalan Zoom&apos;ni uzish orqali (avvalgi ishlov bunga ta&apos;sir qilmaydi);</li>
          <li><b>e&apos;tiroz bildirish</b>: ma&apos;lumotlari ishlanishiga qarshi chiqish;</li>
          <li><b>shikoyat qilish</b>: O&apos;zbekiston Respublikasining shaxsga doir ma&apos;lumotlar bo&apos;yicha vakolatli davlat organiga yoki sudga.</li>
        </ul>
      </Section>

      <Section title="9. Huquqlardan qanday foydalaniladi">
        <p><MailLink /> manziliga so&apos;rov yuboring. Unda ism-familiyangiz, HEMIS loginingiz va guruh yoki bo&apos;limingizni, qaysi huquqdan va qaysi ma&apos;lumot bo&apos;yicha foydalanmoqchi ekaningizni yozing. So&apos;rovni bajarishdan oldin shaxsingizni tasdiqlashni so&apos;rashimiz mumkin.</p>
        <p>So&apos;rovga 30 kun ichida, bepul javob beramiz. O&apos;qituvchilar Zoom&apos;ni uzish va Zoom ma&apos;lumotlarini o&apos;chirishni istalgan vaqtda Profil sahifasida o&apos;zlari ham qila oladi.</p>
      </Section>

      <Section title="10. Aloqa va o'zgarishlar">
        <p>Maxfiylik bo&apos;yicha savol va so&apos;rovlar: <MailLink /></p>
        <p>Siyosat o&apos;zgarsa, sahifa boshidagi sana yangilanadi.</p>
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
