import type { Metadata } from "next";
import CareersList from "../CareersList";

export const metadata: Metadata = {
  title: "Jobs — BMSCE Alumni Network",
  description:
    "Roles shared by BMS alumni and students — browse openings and apply.",
};

export const dynamic = "force-dynamic";

export default function JobsPage() {
  return (
    <CareersList
      initialType="job"
      heading="Openings, shared by us."
      intro="Roles posted by members of the network. Apply in a click — your profile is already on file."
    />
  );
}
