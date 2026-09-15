import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Eyebrow from "@/components/Eyebrow";
import Reveal from "@/components/Reveal";

export const metadata: Metadata = {
  title: "Terms & Conditions — BMSCE Alumni Network",
  description:
    "The Terms & Conditions governing use of the BMSCE Alumni Network — eligibility, acceptable use, content, job postings, mentorship, and more.",
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

const EMAIL = "bmscealumni@bmsce.ac.in";

export default function TermsPage() {
  return (
    <>
      <Nav />
      <main>
        <section id="top">
          <div className="mx-auto max-w-3xl px-6 pb-24 pt-20 md:px-10 md:pt-28">
            <Reveal>
              <Eyebrow>Terms</Eyebrow>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="mt-6 font-display text-[clamp(2.25rem,6vw,3.75rem)] leading-[1.03] tracking-tight text-ink">
                Terms &amp; Conditions
              </h1>
            </Reveal>
            <Reveal delay={140}>
              <p className="mt-5 font-sans text-[11px] font-medium uppercase tracking-[0.2em] text-ink/45">
                Last updated: July 29, 2026
              </p>
            </Reveal>

            <Reveal delay={200}>
              <div className="mt-10 border-t border-gold/30 pt-10">
                <p className={BODY.replace("mt-4", "")}>
                  Please read these Terms &amp; Conditions (&ldquo;Terms&rdquo;)
                  carefully before using the BMSCE Alumni Network website (the
                  &ldquo;Service&rdquo;). By creating an account or using the
                  Service, you agree to be bound by these Terms. If you do not
                  agree, do not use the Service.
                </p>

                <h2 className={HEADING}>1. Eligibility</h2>
                <p className={BODY}>
                  The Service is intended for verified alumni and current
                  students of BMS College of Engineering (BMSCE). By
                  registering, you represent that the information you provide
                  (including your name, email, graduation status, and academic
                  details) is accurate and that you are who you claim to be. We
                  reserve the right to verify your eligibility and to reject,
                  suspend, or terminate accounts that cannot be verified or that
                  contain false information.
                </p>

                <h2 className={HEADING}>2. Account Registration &amp; Security</h2>
                <ul className={LIST}>
                  <Bullet>
                    You are responsible for maintaining the confidentiality of
                    your account credentials and for all activity that occurs
                    under your account.
                  </Bullet>
                  <Bullet>
                    You must notify us promptly of any unauthorized use of your
                    account.
                  </Bullet>
                  <Bullet>
                    You may sign in via Google, LinkedIn, or email/password. You
                    are responsible for the security of any third-party account
                    you use to sign in.
                  </Bullet>
                  <Bullet>
                    We reserve the right to suspend or terminate accounts that
                    violate these Terms, that are inactive for an extended
                    period, or that we reasonably believe to be fraudulent.
                  </Bullet>
                </ul>

                <h2 className={HEADING}>3. Verification Process</h2>
                <p className={BODY}>
                  New accounts are reviewed by administrators before gaining full
                  access to member features (including the Directory,
                  Mentorship, and Careers sections). We reserve sole discretion
                  to approve, reject, or later revoke verification status.
                </p>

                <h2 className={HEADING}>4. Acceptable Use</h2>
                <p className={BODY}>You agree not to:</p>
                <ul className={LIST}>
                  <Bullet>
                    Provide false, misleading, or impersonated information about
                    yourself or your affiliation with BMSCE.
                  </Bullet>
                  <Bullet>
                    Use the Service to harass, threaten, defraud, or harm any
                    other user.
                  </Bullet>
                  <Bullet>
                    Post or transmit spam, unauthorized advertising, or malicious
                    content.
                  </Bullet>
                  <Bullet>
                    Attempt to gain unauthorized access to other users&rsquo;
                    accounts, data, or non-public areas of the Service.
                  </Bullet>
                  <Bullet>
                    Scrape, harvest, or export member Directory data for purposes
                    outside your own personal networking use, or share such data
                    with third parties.
                  </Bullet>
                  <Bullet>
                    Post job/internship listings that are fraudulent,
                    discriminatory, or that violate applicable employment law.
                  </Bullet>
                  <Bullet>
                    Upload viruses, malware, or attempt to disrupt the
                    Service&rsquo;s operation.
                  </Bullet>
                </ul>
                <p className={BODY}>
                  We reserve the right to remove content and suspend or terminate
                  accounts that violate this section, at our discretion.
                </p>

                <h2 className={HEADING}>5. User-Generated Content</h2>
                <p className={BODY}>
                  You retain ownership of content you submit (profile
                  information, job postings, mentorship messages, etc.), but by
                  submitting it you grant BMSCE Alumni Network a non-exclusive,
                  worldwide, royalty-free license to display, store, and
                  distribute that content within the Service for its intended
                  purpose (e.g., displaying your profile in the Directory,
                  displaying a job posting to other members).
                </p>
                <p className={BODY}>
                  You are solely responsible for the accuracy and legality of
                  content you submit, including resumes, job listings, and
                  mentorship communications.
                </p>

                <h2 className={HEADING}>6. Job Postings &amp; Applications</h2>
                <p className={BODY}>
                  Job and internship postings are submitted by individual alumni
                  members, not vetted or guaranteed by BMSCE Alumni Network. We
                  are not a party to any employment relationship, offer, or
                  agreement arising from a posting or application made through
                  the Service, and we make no representations about the accuracy
                  or legitimacy of any listing. Exercise your own judgment when
                  applying to or posting opportunities.
                </p>

                <h2 className={HEADING}>7. Mentorship Program</h2>
                <p className={BODY}>
                  Mentorship connections facilitated through the Service are
                  between individual members. BMSCE Alumni Network does not
                  guarantee outcomes, screen mentors/mentees beyond standard
                  account verification, or take responsibility for the conduct of
                  participants in any mentorship relationship formed through the
                  Service.
                </p>

                <h2 className={HEADING}>8. Intellectual Property</h2>
                <p className={BODY}>
                  The Service&rsquo;s design, branding, logo, and underlying
                  software are the property of BMSCE Alumni Network (or its
                  licensors) and may not be copied, reproduced, or used without
                  permission, except as necessary for your normal personal use of
                  the Service.
                </p>

                <h2 className={HEADING}>9. Third-Party Links &amp; Services</h2>
                <p className={BODY}>
                  The Service may contain links to third-party websites (e.g.,
                  LinkedIn profiles, Instagram, external job application pages).
                  We are not responsible for the content, privacy practices, or
                  terms of any third-party site.
                </p>

                <h2 className={HEADING}>10. Disclaimers</h2>
                <p className={BODY}>
                  The Service is provided &ldquo;as is&rdquo; and &ldquo;as
                  available,&rdquo; without warranties of any kind, express or
                  implied. We do not guarantee the Service will be uninterrupted,
                  error-free, or secure at all times. We do not guarantee the
                  accuracy of information provided by other users (including
                  profile details, job postings, or mentorship claims).
                </p>

                <h2 className={HEADING}>11. Limitation of Liability</h2>
                <p className={BODY}>
                  To the maximum extent permitted by law, BMSCE Alumni Network
                  and its administrators shall not be liable for any indirect,
                  incidental, special, or consequential damages arising from your
                  use of the Service, including but not limited to loss of data,
                  loss of employment opportunity, or disputes arising from
                  mentorship or job-posting interactions between users.
                </p>

                <h2 className={HEADING}>12. Termination</h2>
                <p className={BODY}>
                  We may suspend or terminate your access to the Service at any
                  time, with or without notice, for conduct that violates these
                  Terms or is otherwise harmful to the Service or other users.
                  You may delete your account at any time via your profile
                  settings.
                </p>

                <h2 className={HEADING}>13. Changes to These Terms</h2>
                <p className={BODY}>
                  We may update these Terms from time to time. Continued use of
                  the Service after changes are posted constitutes acceptance of
                  the revised Terms. We will update the &ldquo;Last
                  updated&rdquo; date above when changes are made.
                </p>

                <h2 className={HEADING}>14. Governing Law</h2>
                <p className={BODY}>
                  These Terms are governed by the laws of India, without regard
                  to conflict-of-law principles. Any disputes arising from these
                  Terms or use of the Service shall be subject to the
                  jurisdiction of the courts in Bengaluru, Karnataka.
                </p>

                <h2 className={HEADING}>15. Contact</h2>
                <p className={BODY}>
                  Questions about these Terms can be directed to:{" "}
                  <a
                    href={`mailto:${EMAIL}?subject=Terms%20enquiry`}
                    className="text-oxblood underline decoration-accent underline-offset-4 transition-colors hover:text-maroon"
                  >
                    {EMAIL}
                  </a>
                </p>
                <p className="mt-8 border-t border-gold/25 pt-8 font-sans text-sm leading-relaxed text-ink/55">
                  By using the Service, you acknowledge that you have read,
                  understood, and agree to be bound by these Terms &amp;
                  Conditions.
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
