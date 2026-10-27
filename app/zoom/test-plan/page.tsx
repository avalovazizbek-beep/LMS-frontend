import Link from "next/link"
import type { ReactNode } from "react"
import { PublicDoc, Section, Step, MailLink } from "@/components/public/PublicDoc"

/* Zoom Marketplace tekshiruvchilari uchun test rejasi (Zoom talabi: inglizcha,
   avtorizatsiyadan boshlab har bir scope va foydalanuvchi ko'radigan har bir
   funksiya bo'yicha qadamma-qadam). Login-parol bu yerda YO'Q — u ilova
   topshirig'idagi "Test account" maydonida beriladi. */

export const metadata = {
  title: "Zoom integration — test plan",
  description: "Step-by-step test plan for Zoom Marketplace reviewers of the SIES LMS Zoom integration",
  robots: { index: false, follow: false },
}

const link = { color: "#0e58a8" }

function Code({ children }: { children: ReactNode }) {
  return (
    <code className="rounded px-1 py-0.5 text-[12px]" style={{ backgroundColor: "#e8f0fb", color: "#012970" }}>
      {children}
    </code>
  )
}

function Expect({ children }: { children: ReactNode }) {
  return (
    <p className="ml-9 text-[13px]" style={{ color: "#15803d" }}>
      <b>Expected:</b> {children}
    </p>
  )
}

function TestCase({ id, title, scope, children }: { id: string; title: string; scope?: string; children: ReactNode }) {
  return (
    <div className="rounded-[10px] bg-white p-4 space-y-3" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
      <p className="font-semibold" style={{ color: "#012970" }}>
        {id}. {title}
        {scope && <span className="ml-2 text-xs font-normal" style={{ color: "#7293b9" }}>Scope: {scope}</span>}
      </p>
      {children}
    </div>
  )
}

const cell = "px-3 py-2 align-top text-left"
const cellStyle = { borderTop: "1px solid rgba(1,41,112,0.1)" }

function English() {
  return (
    <>
      <Section title="1. App summary">
        <p>
          SIES LMS is the distance learning system of Samarkand Institute of Economics and Service (lms.sies.uz). The Zoom
          integration lets a <b>teacher</b> connect their own Zoom account and create class meetings in it from the LMS
          Meeting page. Students of the class group then see the Zoom join link in the LMS. The app has no in-client
          (Zoom Apps SDK) surface; everything happens on lms.sies.uz.
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>App name: <b>SIES LMS v1.1</b> (General app, Admin-managed). Authorization uses the <b>Production</b> Client ID with OAuth 2.0 authorization code + PKCE (S256).</li>
          <li>Landing page (&quot;Visit Site to Add&quot;): <Link href="/zoom" style={link}>https://lms.sies.uz/zoom</Link></li>
          <li>OAuth redirect URL: <Code>https://lms.sies.uz/api/integrations/zoom/callback</Code></li>
          <li>Event (deauthorization) endpoint: <Code>https://lms.sies.uz/api/integrations/zoom/webhook</Code> — event <Code>app_deauthorized</Code>, signature verified with the Secret Token (<Code>x-zm-signature</Code>).</li>
        </ul>
      </Section>

      <Section title="2. What you need">
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <b>LMS test account</b> — username and password are in the app submission (&quot;Test account&quot; field /
            review notes). Sign in at <Link href="/zoom/review-login" style={link}>https://lms.sies.uz/zoom/review-login</Link>.
            Real users sign in through HEMIS, the national university system, which outside reviewers cannot access; this
            separate test teacher account exists only for the review.
          </li>
          <li>
            <b>A Zoom account of your own</b> (any reviewer test account). Because the app is Admin-managed, authorize it
            with the account owner or an admin.
          </li>
          <li>A desktop browser (Chrome, Edge or Firefox). The LMS opens in English after the test-account sign-in; the language can be changed with the globe icon in the header.</li>
        </ul>
        <p>
          The test account is isolated: it can open only the <b>Profile</b> and <b>Meeting</b> pages, it has one sandbox
          class group &quot;ZOOM-M-TEST (Zoom review sandbox)&quot; with no students, and every other LMS API returns 403
          for it.
        </p>
      </Section>

      <Section title="3. Scopes and where each one is used">
        <p>The app requests exactly two Admin-level scopes. No Master/sub-account scopes and no optional scopes are requested.</p>
        <div className="overflow-x-auto rounded-[10px] bg-white" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          <table className="w-full text-[13px]">
            <thead style={{ backgroundColor: "#eef4ff", color: "#012970" }}>
              <tr>
                <th className={cell}>Scope</th>
                <th className={cell}>Zoom API call</th>
                <th className={cell}>Where the user sees it</th>
                <th className={cell}>Test case</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className={cell} style={cellStyle}><Code>user:read:user:admin</Code></td>
                <td className={cell} style={cellStyle}><Code>GET /v2/users/me</Code></td>
                <td className={cell} style={cellStyle}>
                  Right after authorization: identifies the connected Zoom user (id, account id, email). On every opening
                  of the Profile page (at most once a minute): refreshes the email and detects a revoked token.
                  Profile shows &quot;Connected (your Zoom email)&quot;.
                </td>
                <td className={cell} style={cellStyle}>TC-3, TC-4</td>
              </tr>
              <tr>
                <td className={cell} style={cellStyle}><Code>meeting:write:meeting:admin</Code></td>
                <td className={cell} style={cellStyle}><Code>POST /v2/users/me/meetings</Code></td>
                <td className={cell} style={cellStyle}>
                  Meeting page → &quot;New meeting&quot; with &quot;Also create a Zoom meeting&quot; ticked: a scheduled
                  meeting is created in the teacher&apos;s own Zoom account; its join and start links are shown on the class card.
                </td>
                <td className={cell} style={cellStyle}>TC-5, TC-6</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Why Admin-level: the app is Admin-managed, so Zoom offers <Code>:admin</Code> scopes for it. The app only ever
          acts on the authorizing user (<Code>users/me</Code>); it never reads or changes other users of the account, and
          it does not use any Master-account API.
        </p>
        <p>
          OAuth endpoints used (no scope needed): <Code>POST https://zoom.us/oauth/token</Code> (code exchange and
          refresh) and <Code>POST https://zoom.us/oauth/revoke</Code> (on disconnect).
        </p>
      </Section>

      <Section title="4. Test cases">
        <div className="space-y-4">
          <TestCase id="TC-1" title="Landing page and sign-in">
            <Step n={1}>Open <Link href="/zoom" style={link}>https://lms.sies.uz/zoom</Link> (the &quot;Visit Site to Add&quot; landing page). It explains who can add the app (teachers and staff, 18+), how to add it and links to the Privacy Policy, Terms and Support.</Step>
            <Step n={2}>Click the &quot;test account sign-in&quot; link under the button, or open <Link href="/zoom/review-login" style={link}>/zoom/review-login</Link> directly.</Step>
            <Step n={3}>Enter the test username and password and click &quot;Sign in&quot;.</Step>
            <Expect>You land on the Profile page. The header shows &quot;Zoom Reviewer (test teacher)&quot;; the menu shows only Profile and Meeting.</Expect>
          </TestCase>

          <TestCase id="TC-2" title="Age and role confirmation (age gate)">
            <Step n={1}>On the Profile page, find the &quot;Integrations&quot; card. Zoom shows &quot;Not connected&quot;.</Step>
            <Step n={2}>Note that &quot;Connect Zoom account&quot; is disabled.</Step>
            <Step n={3}>Tick &quot;I confirm that I am over 18 and own a HEMIS-verified teacher/staff account at this institution…&quot;.</Step>
            <Expect>The button becomes active. The server also refuses to start the connection without this confirmation (<Code>ageConfirmed=1</Code>) and refuses any student account.</Expect>
          </TestCase>

          <TestCase id="TC-3" title="Authorize the app (OAuth)" scope="user:read:user:admin">
            <Step n={1}>Click &quot;Connect Zoom account&quot;.</Step>
            <Step n={2}>You are sent to <Code>https://zoom.us/oauth/authorize</Code> with the Production Client ID, <Code>code_challenge_method=S256</Code> and a signed <Code>state</Code>. Sign in with your Zoom account if asked.</Step>
            <Step n={3}>Zoom&apos;s consent page lists the two permissions (view your user information; create meetings). Click &quot;Allow&quot;.</Step>
            <Step n={4}>You are returned to the LMS Profile page.</Step>
            <Expect>A green &quot;Zoom account connected&quot; banner and the status &quot;Connected (your Zoom email)&quot;. The email comes from <Code>GET /v2/users/me</Code>. Reloading the Profile page re-checks the connection with the same call.</Expect>
            <p className="ml-9 text-[13px]"><b>Negative check:</b> start again, click &quot;Decline&quot; on Zoom&apos;s page. Expected: a red banner &quot;Permission was not granted in Zoom — the connection was cancelled&quot;; nothing is stored.</p>
          </TestCase>

          <TestCase id="TC-4" title="Connection survives token expiry" scope="user:read:user:admin">
            <Step n={1}>Come back to the Profile page more than one hour after TC-3 (the access token lives one hour).</Step>
            <Expect>Still &quot;Connected&quot;: the LMS refreshes the token with the refresh token and calls <Code>GET /v2/users/me</Code> again. If the token was revoked in Zoom, the status changes to &quot;Reconnect required&quot; or &quot;Not connected&quot;.</Expect>
          </TestCase>

          <TestCase id="TC-5" title="Create a class meeting with Zoom" scope="meeting:write:meeting:admin">
            <Step n={1}>Open &quot;Meeting&quot; in the left menu and click &quot;New meeting&quot;.</Step>
            <Step n={2}>Fill in Title (e.g. &quot;Zoom review test&quot;), Subject name (any text), a date in the future, start and end time.</Step>
            <Step n={3}>Under Groups tick &quot;ZOOM-M-TEST (Zoom review sandbox)&quot;.</Step>
            <Step n={4}>Tick &quot;Also create a Zoom meeting&quot; and click &quot;Create meeting&quot;.</Step>
            <Expect>The class appears in the list with a &quot;Start Zoom&quot; button. In your Zoom web portal (zoom.us → Meetings → Upcoming) the meeting exists with the same topic, date, time and duration (time zone Asia/Tashkent). It is created by <Code>POST /v2/users/me/meetings</Code>.</Expect>
            <p className="ml-9 text-[13px]">
              If Zoom refuses the request, the LMS class is still saved and the card shows &quot;Zoom — retry&quot;, which
              repeats the same call. If Zoom is not connected, the form shows &quot;Your Zoom account is not connected&quot;
              and does not call Zoom.
            </p>
          </TestCase>

          <TestCase id="TC-6" title="Start the meeting as host">
            <Step n={1}>On the class card click &quot;Start Zoom&quot;.</Step>
            <Expect>The meeting opens in the Zoom client or browser with you as the host. Students of the group would see a &quot;Join Zoom&quot; button with the join link instead (the host start link is never shown to them).</Expect>
          </TestCase>

          <TestCase id="TC-7" title="Disconnect in the LMS (removes the app)">
            <Step n={1}>Open Profile → &quot;Integrations&quot; and click &quot;Disconnect Zoom&quot;, then confirm.</Step>
            <Expect>Status &quot;Not connected&quot;. The LMS revokes the token at Zoom (<Code>POST /oauth/revoke</Code>), so the app also disappears from Zoom App Marketplace → Manage → Added Apps. Tokens, Zoom user id, account id, email and stored host start links are deleted at once. Creating a Zoom meeting now shows &quot;Your Zoom account is not connected&quot;.</Expect>
          </TestCase>

          <TestCase id="TC-8" title="Remove the app in Zoom (deauthorization event)">
            <Step n={1}>Connect again (TC-2 and TC-3).</Step>
            <Step n={2}>Go to marketplace.zoom.us → Manage → Added Apps, find &quot;SIES LMS v1.1&quot; and click &quot;Remove&quot;.</Step>
            <Step n={3}>Reload the LMS Profile page.</Step>
            <Expect>Zoom sends <Code>app_deauthorized</Code> to the event endpoint; the LMS verifies the signature and deletes the same data as in TC-7. The Profile shows &quot;Not connected&quot;.</Expect>
          </TestCase>

          <TestCase id="TC-9" title="Sign out">
            <Step n={1}>Open the menu under your name in the top-right corner and choose &quot;Log out&quot;.</Step>
            <Expect>You return to the test-account sign-in page. After 30 minutes without activity the LMS signs out automatically in the same way.</Expect>
          </TestCase>
        </div>
      </Section>

      <Section title="5. Data handling">
        <ul className="list-disc pl-5 space-y-1">
          <li>Stored per teacher: Zoom user id, account id, email, access and refresh tokens (AES-256-GCM encrypted), token expiry, granted scope and the time of the 18+ confirmation.</li>
          <li>Stored per class: Zoom meeting id, join link, passcode and the host start link (encrypted; shown only to the teacher who created it).</li>
          <li>Deleted on disconnect (TC-7) and on the <Code>app_deauthorized</Code> event (TC-8). Zoom data is not sold or shared with third parties.</li>
          <li>All traffic uses HTTPS. Full details: <Link href="/privacy" style={link}>Privacy Policy</Link> · <Link href="/terms" style={link}>Terms of Use</Link> · <Link href="/docs" style={link}>Documentation</Link> · <Link href="/support" style={link}>Support</Link>.</li>
        </ul>
      </Section>

      <Section title="6. Contact">
        <p>
          Questions during the review: <MailLink /> (Asia/Tashkent, UTC+5).
        </p>
      </Section>
    </>
  )
}

export default function ZoomTestPlanPage() {
  return (
    <PublicDoc
      titleEn="Zoom integration — test plan"
      subtitleEn="For Zoom Marketplace reviewers · SIES LMS v1.1"
      en={<English />}
    />
  )
}
