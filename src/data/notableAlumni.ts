export type NotableAlum = {
  name: string;
  role: string;
  /** Graduation year, when known. */
  batch?: string;
  /** Department or branch, when known. */
  dept?: string;
  /** Portrait in /public. Alumni without one are not shown yet. */
  photo?: string;
  /** A short summary, shown on the Notable Alumni page. */
  bio?: string;
  /** Attribution the photo's licence asks for. */
  photoCredit?: string;
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
    photo: "/bhawana-kanth.jpg",
    photoCredit: "Photo: Ministry of Defence (PIB), GODL-India",
    bio: "One of India's first three women fighter pilots, commissioned in 2016. The first woman cleared for daytime combat missions on the MiG-21 Bison (2019), she later flew the Su-30 MKI and became the first woman to complete the Fighter Combat Leader course.",
  },
  {
    name: "Nikhil Chinapa",
    role: "DJ, VJ, host and festival curator",
    dept: "Architecture",
    photo: "/nikhil-chinapa.jpg",
    photoCredit: "Photo: Bollywood Hungama, CC BY 3.0",
    bio: "Long associated with MTV India, including Roadies and Splitsvilla. He helped popularise EDM in India and co-founded the Sunburn Festival in 2007.",
  },
  {
    name: "Sanchari Vijay",
    role: "Actor, National Film Award winner (1983–2021)",
    photo: "/sanchari-vijay.jpg",
    photoCredit: "Photo: Pavanaja, CC BY-SA 4.0",
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
    bio: "Rivals for the top rank at school, then friends at BMSCE, where the two won most of the city's engineering contests together. Today they build electric motorcycles.",
  },
  {
    name: "Vasudeva Adiga",
    role: "Founder, Vasudev Adiga's and Paakashala",
    dept: "Electronics",
    batch: "1984",
    bio: "Denied a US visa for a master's, he worked in industry for a while, then drew on his family's restaurant roots (his mother founded Brahmin's Coffee Bar) to start Adiga's in Basavanagudi in 1993. He grew it to about 30 outlets, sold the brand in 2017 and went on to launch Paakashala.",
  },
  {
    name: "Vikram Shenoy",
    role: "Managing Director, Deloitte Digital",
    dept: "Computer Science",
    bio: "One of the four founders of the test-prep platform Magoosh (2009). Now India Offering Leader for Advertising, Marketing and Commerce at Deloitte Digital.",
  },
];

