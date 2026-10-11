export type NotableAlum = {
  name: string;
  role: string;
  /** Graduation year. */
  batch: string;
  photo: string;
};

// Real BMSCE alumni: name, role and batch as given by the alumni association.
// No quotes or achievements are written on their behalf.
export const notableAlumni: NotableAlum[] = [
  { name: "Sujith Somasundar", role: "Former India cricketer", batch: "1994", photo: "/sujith-somasundar.jpg" },
  { name: "Naren", role: "CEO, Nandu Foods", batch: "1995", photo: "/naren.jpg" },
  { name: "Sunil Rao", role: "MD, Roblox India", batch: "1996", photo: "/sunil-rao.jpg" },
  { name: "Dinesh Gundu Rao", role: "Member of the Karnataka Legislative Assembly", batch: "1992", photo: "/dinesh-gundu-rao.jpg" },
  { name: "Lathika Pai", role: "Microsoft", batch: "1990", photo: "/lathika-pai.jpg" },
];
