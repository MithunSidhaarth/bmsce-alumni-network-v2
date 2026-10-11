import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Eyebrow from "@/components/Eyebrow";
import Reveal from "@/components/Reveal";

export const metadata: Metadata = {
  title: "FAQs: BMSCE Alumni Network",
  description:
    "Answers to common questions about joining the BMSCE Alumni Network, verification, the directory, chapters, and events.",
};

const FAQS = [
  {
    q: "Who can join the BMSCE Alumni Network?",
    a: "Any graduate of B.M.S. College of Engineering. Current students can also create an account and keep it after graduation.",
  },
  {
    q: "How do I join?",
    a: "Choose “Join the Network”, sign in, and complete your profile. It takes a couple of minutes.",
  },
  {
    q: "Why is my profile “pending verification”?",
    a: "We check that every member is a genuine BMSCE alum or student before opening up member-only areas like the directory and community. Verification is done by the alumni team, so it may take a little while.",
  },
  {
    q: "Who can see my profile?",
    a: "Only other verified, signed-in members. See our Privacy page for the details.",
  },
  {
    q: "How do I find a chapter near me?",
    a: "Open the Chapters page, browse by region, and find your city. Signed-in members can join the global WhatsApp community from that page.",
  },
  {
    q: "My city isn’t listed. Can we start a chapter?",
    a: "Please write to us. We’re always happy to help alumni in a new city get started.",
  },
  {
    q: "How do I find or join an event?",
    a: "Upcoming events are on the Events page, where signed-in members can RSVP.",
  },
  {
    q: "How can I volunteer?",
    a: "We’d love the help. Use the “Join the team” section on the About page to get in touch.",
  },
  {
    q: "Who do I contact with other questions?",
    a: "Email bmscealumni@bmsce.ac.in or call +91 86602 30306.",
  },
];

export default function FaqsPage() {
  return (
    <>
      <Nav />
      <main>
        <section id="top">
          <div className="mx-auto max-w-3xl px-6 pb-24 pt-20 md:px-10 md:pt-28">
            <Reveal>
              <Eyebrow>FAQs</Eyebrow>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="slash mt-6 font-display text-[clamp(2.5rem,7vw,4.5rem)] leading-[1.02] tracking-tight text-ink">
                Frequently asked questions.
              </h1>
            </Reveal>
            <div className="mt-12 flex flex-col gap-3">
              {FAQS.map((f) => (
                <details
                  key={f.q}
                  className="group rounded-2xl border border-gold/40 bg-ivory px-6 py-5"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-lg text-ink">
                    {f.q}
                    <span
                      aria-hidden="true"
                      className="text-accent transition-transform group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-3 font-sans text-base leading-relaxed text-ink/70">
                    {f.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
