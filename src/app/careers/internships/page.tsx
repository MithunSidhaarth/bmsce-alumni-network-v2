import type { Metadata } from "next";
import CareersList from "../CareersList";

export const metadata: Metadata = {
  title: "Internships — BMSCE Alumni Network",
  description:
    "Internships posted by BMS alumni and students — a foot in the door where someone can vouch for you.",
};

export const dynamic = "force-dynamic";

export default function InternshipsPage() {
  return (
    <CareersList
      initialType="internship"
      heading="A foot in the door."
      intro="Internships posted by members of the network. Apply in a click — your profile is already on file."
    />
  );
}
