import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Eyebrow from "@/components/Eyebrow";
import Reveal from "@/components/Reveal";

export const metadata: Metadata = {
  title: "Privacy Policy — BMSCE Alumni Network",
  description:
    "How the BMSCE Alumni Network collects, uses, shares, secures, and retains your information — and the rights you have over your data.",
};

const HEADING = "mt-12 font-display text-2xl text-ink md:text-3xl";
const BODY = "mt-4 font-sans text-base leading-relaxed text-ink/70";
const LIST =
  "mt-4 flex flex-col gap-3 font-sans text-base leading-relaxed text-ink/70";

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span aria-hidden="true" className="mt-2.5 h-px w-3 shrink-0 bg-gold" />
      <span>{children}</span>
    </li>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="font-medium text-ink">{children}</span>;
}

const EMAIL = "bmscealumni@bmsce.ac.in";

export default function PrivacyPage() {
  return (
    <>
      <Nav />
      <main>
        <section id="top">
          <div className="mx-auto max-w-3xl px-6 pb-24 pt-20 md:px-10 md:pt-28">
            <Reveal>
              <Eyebrow>Privacy</Eyebrow>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="mt-6 font-display text-[clamp(2.25rem,6vw,3.75rem)] leading-[1.03] tracking-tight text-ink">
                Privacy Policy
              </h1>
            </Reveal>
            <Reveal delay={140}>
              <p className="mt-5 font-sans text-[11px] font-medium uppercase tracking-[0.2em] text-ink/45">
                Last updated: July 31, 2026
              </p>
            </Reveal>

            <Reveal delay={200}>
              <div className="mt-10 border-t border-gold/30 pt-10">
                <p className={BODY.replace("mt-4", "")}>
                  BMSCE Alumni Network (&ldquo;we,&rdquo; &ldquo;us,&rdquo;
                  &ldquo;our&rdquo;) operates this website to connect alumni of
                  BMS College of Engineering with each other, current students,
                  and the wider alumni community. This policy explains what
                  information we collect, why, and how it&rsquo;s handled.
                </p>

                <h2 className={HEADING}>Information We Collect</h2>
                <p className={BODY}>
                  When you create an account or use this site, we may collect:
                </p>
                <ul className={LIST}>
                  <Bullet>
                    <Label>Account information:</Label> your name, email address,
                    and profile photo (from Google or LinkedIn sign-in, or
                    provided directly)
                  </Bullet>
                  <Bullet>
                    <Label>Profile details:</Label> current city, year of
                    graduation, branch/degree, current company and job title, a
                    short bio, and your LinkedIn profile URL
                  </Bullet>
                  <Bullet>
                    <Label>Mentorship activity:</Label> whether you&rsquo;ve
                    opted in as a mentor or mentee, your areas of expertise or
                    interests, and messages exchanged through mentorship requests
                  </Bullet>
                  <Bullet>
                    <Label>Career activity:</Label> job/internship postings and
                    applications, including uploaded resumes and phone numbers
                    where provided
                  </Bullet>
                  <Bullet>
                    <Label>Usage information:</Label> basic activity on the site,
                    such as event RSVPs
                  </Bullet>
                  <Bullet>
                    <Label>Cookies and similar technologies:</Label> we use
                    cookies and local storage to maintain your login session,
                    remember preferences, and support core site functionality. We
                    do not use cookies for advertising or cross-site tracking.
                  </Bullet>
                </ul>

                <h2 className={HEADING}>How We Use This Information</h2>
                <p className={BODY}>We use the information above to:</p>
                <ul className={LIST}>
                  <Bullet>
                    Verify that you are a genuine BMS alumnus or current student
                    before granting access to the directory and other member
                    features
                  </Bullet>
                  <Bullet>
                    Display your profile to other verified members in the
                    Directory (only after admin verification)
                  </Bullet>
                  <Bullet>
                    Facilitate mentorship matching and job/internship
                    applications between alumni and students
                  </Bullet>
                  <Bullet>
                    Share relevant events, newsletters, and community updates
                  </Bullet>
                  <Bullet>
                    Maintain the security and integrity of the platform
                  </Bullet>
                  <Bullet>
                    Fulfill our legitimate interest in operating a functioning
                    alumni network, and where required by applicable law, based on
                    your consent
                  </Bullet>
                </ul>

                <h2 className={HEADING}>Verification</h2>
                <p className={BODY}>
                  Verification may involve reviewing your graduation details,
                  institutional email address, or other information reasonably
                  necessary to confirm your affiliation with BMS College of
                  Engineering before granting full access to member features.
                </p>

                <h2 className={HEADING}>Children&rsquo;s Privacy</h2>
                <p className={BODY}>
                  This platform is intended for individuals aged 18 or older. We
                  do not knowingly collect personal information from children
                  under 18. If we become aware that we have inadvertently
                  collected such information, we will take steps to delete it.
                </p>

                <h2 className={HEADING}>How We Share Information</h2>
                <p className={BODY}>
                  We do not sell your personal information. Your profile is
                  visible only to other verified, signed-in members of the
                  network — not to the public or third parties — unless you
                  choose to make specific information public (e.g., in the
                  Directory).
                </p>
                <p className={BODY}>
                  We use Supabase to host our database and manage authentication;
                  Supabase acts as our data processor and stores your account and
                  application data securely on our behalf. Google and LinkedIn are
                  used solely as sign-in providers and only receive the standard
                  information required to authenticate you (typically your name,
                  email, and profile photo).
                </p>
                <p className={BODY}>
                  Information submitted as part of a job or internship application
                  (including your resume, cover note, and phone number) is shared
                  only with the specific organization or alumnus who posted that
                  opportunity — not with the wider network.
                </p>

                <h2 className={HEADING}>International Users</h2>
                <p className={BODY}>
                  Alumni may access this service from anywhere in the world. Your
                  information may be stored and processed on servers located
                  outside your country of residence, including in jurisdictions
                  with different data protection laws than your own.
                </p>

                <h2 className={HEADING}>Security Measures</h2>
                <p className={BODY}>
                  We implement reasonable technical and organizational safeguards
                  to protect your information, including encrypted connections
                  (HTTPS), secure authentication, row-level database access
                  controls, and restricted administrative access. However, no
                  internet-based service can guarantee absolute security, and we
                  cannot fully eliminate all risk.
                </p>

                <h2 className={HEADING}>Your Rights</h2>
                <p className={BODY}>
                  Depending on your location, you may have the right to access,
                  correct, or delete your personal data, withdraw from mentorship
                  participation, and request an export of your information. You can
                  exercise most of these directly from your profile settings, or
                  by contacting us at the email below.
                </p>

                <h2 className={HEADING}>Data Retention</h2>
                <p className={BODY}>
                  We retain your information for as long as your account is
                  active. If you delete your account, we will remove your personal
                  data within a reasonable time, except where retention is
                  required for legal or security reasons.
                </p>

                <h2 className={HEADING}>Contact</h2>
                <p className={BODY}>
                  If you have questions about this policy or your data, contact us
                  at:{" "}
                  <a
                    href={`mailto:${EMAIL}?subject=Privacy%20enquiry`}
                    className="text-oxblood underline decoration-accent underline-offset-4 transition-colors hover:text-maroon"
                  >
                    {EMAIL}
                  </a>
                  . We aim to respond to privacy-related requests within 30 days.
                </p>
                <p className="mt-8 border-t border-gold/25 pt-8 font-sans text-sm leading-relaxed text-ink/55">
                  We will post any updates to this Privacy Policy on this page and
                  revise the &ldquo;Last updated&rdquo; date above. Your continued
                  use of the website after such updates indicates your acceptance
                  of the revised policy.
                </p>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
