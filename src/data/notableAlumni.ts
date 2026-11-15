export type NotableAlum = {
  name: string;
  role: string;
  /** Graduation year, when known. */
  batch?: string;
  /** Department or branch, when known. */
  dept?: string;
  /** Portrait in /public. Cards without one show the person's initials. */
  photo?: string;
  /** A short summary, shown on the Notable Alumni page. */
  bio?: string;
};

// Real BMSCE alumni. Names, roles, batches and bios are as given by the
// alumni association; nothing is quoted on anyone's behalf.
export const notableAlumni: NotableAlum[] = [
  { name: "Sujith Somasundar", role: "Former India cricketer", batch: "1994", photo: "/sujith-somasundar.jpg" },
  { name: "Naren", role: "CEO, Nandu Foods", batch: "1995", photo: "/naren.jpg" },
  { name: "Sunil Rao", role: "MD, Roblox India", batch: "1996", photo: "/sunil-rao.jpg" },
  { name: "Dinesh Gundu Rao", role: "Member of the Karnataka Legislative Assembly", batch: "1992", photo: "/dinesh-gundu-rao.jpg" },
  { name: "Lathika Pai", role: "Microsoft", batch: "1990", photo: "/lathika-pai.jpg" },
  {
    name: "Bhawana Kanth",
    role: "Indian Air Force fighter pilot",
    dept: "Medical Electronics",
    batch: "2014",
    bio: "One of India's first three women fighter pilots, commissioned in 2016. The first woman cleared for daytime combat missions on the MiG-21 Bison (2019), she later flew the Su-30 MKI and became the first woman to complete the Fighter Combat Leader course.",
  },
  {
    name: "Nikhil Chinapa",
    role: "DJ, VJ, host and festival curator",
    dept: "Architecture",
    bio: "Long associated with MTV India, including Roadies and Splitsvilla. He helped popularise EDM in India and was involved early with the Sunburn Festival.",
  },
  {
    name: "Sanchari Vijay",
    role: "Actor, National Film Award winner (1983–2021)",
    dept: "ISE",
    bio: "Kannada film and stage actor who won the National Film Award for Best Actor for Naanu Avanalla... Avalu, playing a transgender character. He also won state and Filmfare Critics awards and was active in theatre with Sanchari Theatre.",
  },
  {
    name: "Vasant Honavar",
    role: "Huck Chair in Biomedical Data Sciences and AI, Penn State",
    dept: "Electronics & Communication",
    batch: "1982",
    bio: "AI, machine learning, data science, bioinformatics and causal inference researcher. An AAAS Fellow who has led major AI research labs and centres.",
  },
  {
    name: "Narayan Subramaniam & Niraj Rajmohan",
    role: "Co-founders of Ultraviolette (CEO and CTO)",
    bio: "From college engineering projects to building electric motorcycles together.",
  },
  {
    name: "K.N. Vasudeva Adiga",
    role: "Founder, Vasudev Adiga's and Paakashala",
    dept: "Electronics",
    batch: "1984",
    bio: "After a short stint in industry and a denied US visa for higher studies, he drew on his family's restaurant background to build a multi-outlet chain of Udupi-style vegetarian restaurants and catering, and later launched Paakashala.",
  },
  {
    name: "Vikram Shenoy",
    role: "Managing Director, Deloitte Digital",
    dept: "Computer Science",
    bio: "Early co-founder of the test-prep platform Magoosh. Now India Offering Leader for Advertising, Marketing and Commerce at Deloitte Digital.",
  },
];

/** "BK" for "Bhawana Kanth"; "NS & NR" for a joint card. */
export function initialsOf(name: string): string {
  return name
    .split("&")
    .map((part) =>
      part
        .replace(/\./g, " ")
        .split(/\s+/)
        .filter(Boolean)
        .filter((w, i, all) => i === 0 || i === all.length - 1)
        .map((w) => w[0]!.toUpperCase())
        .join("")
    )
    .join(" & ");
}
