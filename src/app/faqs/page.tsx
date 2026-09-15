import type { Metadata } from "next";
import ComingSoon from "@/components/ComingSoon";

export const metadata: Metadata = {
  title: "FAQs — BMSCE Alumni Network",
  description:
    "Frequently asked questions about the BMS alumni network — coming soon.",
};

export default function FaqsPage() {
  return (
    <ComingSoon
      eyebrow="FAQs"
      title="Questions, answered soon."
      body="We're gathering the questions alumni actually ask before we publish anything here — about joining, verification, the directory, mentorship, and events. Rather than guess at them, we'd like to hear yours first."
      contactPrompt="Got a question about the network? Send it over — it may well end up on this page, answered."
      contactSubject="Question about the BMSCE Alumni Network"
    />
  );
}
