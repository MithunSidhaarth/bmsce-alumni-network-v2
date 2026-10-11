// How a department is written on the college ID card. Anything not listed
// here is printed in full.
const SHORT: Record<string, string> = {
  "Artificial Intelligence & Machine Learning": "AIML",
  "Computer Science": "CSE",
  "Information Science": "ISE",
  "Electronics & Communication (ECE)": "ECE",
  "Electrical & Electronics": "EEE",
  "Electronics & Instrumentation": "EIE",
  "Industrial Engineering & Management": "IEM",
};

/** "Dept. of CSE", or null when the branch is unknown. */
export function deptLine(branch: string | null | undefined): string | null {
  return branch && branch !== "Other" ? `Dept. of ${SHORT[branch] ?? branch}` : null;
}

/** The line under the department, and what the barcode carries. */
export function idLines(p: { id: string; usn: string | null; graduation_year: number | null; user_type: string }) {
  return {
    idLine: p.usn ?? (p.graduation_year ? `${p.user_type === "student" ? "CLASS" : "BATCH"} OF ${p.graduation_year}` : "ALUMNI NETWORK"),
    code: p.usn ?? `BMS-${p.id.slice(0, 8)}`,
  };
}
