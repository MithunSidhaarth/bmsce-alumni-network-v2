import type { Metadata } from "next";
import ComingSoon from "@/components/ComingSoon";

export const metadata: Metadata = {
  title: "Give Back — BMSCE Alumni Network",
  description:
    "Ways to support BMS College of Engineering and its students — coming soon.",
};

export default function GiveBackPage() {
  return (
    <ComingSoon
      eyebrow="Give back"
      title="Ways to give, coming soon."
      body="We're setting up proper channels for alumni who want to support the college — scholarships, student projects, and chapter initiatives. We'd rather build this carefully than rush it, so there's nothing to sign up for just yet."
      contactPrompt="If you'd like to contribute now, or you have something specific in mind, write to the alumni office and someone will get back to you personally."
      contactSubject="Giving back to BMSCE"
    />
  );
}
