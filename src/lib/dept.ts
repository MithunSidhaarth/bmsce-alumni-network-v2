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

/** The degrees a member can pick. Must match the check on profiles.degree. */
export const DEGREES = ["BE", "BArch", "BTech", "ME", "MTech", "MBA", "MCA", "MSc", "PhD"] as const;

/**
 * A member's class, in the house style (Brand Guidelines, p. 22):
 * "BE ECE '04" when they have given their degree, otherwise "Class of 2004".
 */
export function classOf(p: { degree?: string | null; branch?: string | null; graduation_year?: number | null }): string | null {
  if (!p.graduation_year) return null;
  if (!p.degree) return `Class of ${p.graduation_year}`;
  const branch = p.branch && p.branch !== "Other" ? (SHORT[p.branch] ?? p.branch) : null;
  // An apostrophe, not an opening quote, before the two-digit year.
  return [p.degree, branch, `’${String(p.graduation_year).slice(-2)}`].filter(Boolean).join(" ");
}

/** "Dept. of CSE", or null when the branch is unknown. */
export function deptLine(branch: string | null | undefined): string | null {
  return branch && branch !== "Other" ? `Dept. of ${SHORT[branch] ?? branch}` : null;
}

/** The line under the department, and what the barcode carries. */
export function idLines(p: { id: string; usn: string | null; graduation_year: number | null; user_type: string }) {
  return {
    idLine: p.usn ?? (p.graduation_year ? `CLASS OF ${p.graduation_year}` : "ALUMNI NETWORK"),
    code: p.usn ?? `BMS-${p.id.slice(0, 8)}`,
  };
}
