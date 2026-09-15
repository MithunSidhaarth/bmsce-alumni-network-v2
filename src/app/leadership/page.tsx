import type { Metadata } from "next";
import ComingSoon from "@/components/ComingSoon";

export const metadata: Metadata = {
  title: "Leadership — BMSCE Alumni Network",
  description:
    "The people behind the BMSCE Alumni Network — details coming soon.",
};

export default function LeadershipPage() {
  return (
    <ComingSoon
      eyebrow="Leadership"
      title="The people behind it."
      body="Details of the alumni association's office bearers and committee will be published here once confirmed. We're not listing anyone until we can do it accurately and with their consent."
      contactPrompt="Need to reach the alumni association directly, or interested in serving on the committee? Get in touch with the alumni office."
      contactSubject="Alumni association leadership"
    />
  );
}
