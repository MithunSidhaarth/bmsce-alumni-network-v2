// Shown when the member has signed in with (or linked) their LinkedIn
// account. The flag is set by a database trigger on auth.identities and
// cannot be edited from the client.
export default function LinkedInBadge() {
  return (
    <span
      title="Identity confirmed through LinkedIn"
      className="inline-flex w-fit items-center gap-1.5 rounded-full border border-[#0A66C2]/30 bg-[#0A66C2]/5 px-2.5 py-0.5 font-sans text-[10px] font-medium uppercase tracking-[0.12em] text-[#0A66C2]"
    >
      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor" aria-hidden="true">
        <path d="M9.55 17.6 5.4 13.45l1.4-1.4 2.75 2.75 7.65-7.65 1.4 1.4-9.05 9.05Z" />
      </svg>
      LinkedIn verified
    </span>
  );
}
