import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import NotableAlumni from "@/components/v2/landing/NotableAlumni";

export const metadata: Metadata = {
  title: "Notable Alumni: BMSCE Alumni Network",
  description: "BMSCE alumni making their mark, from cricket to public life to industry.",
};

export default function NotableAlumniPage() {
  return (
    <>
      <Nav />
      <main>
        <NotableAlumni heading="h1" />
      </main>
      <Footer />
    </>
  );
}
