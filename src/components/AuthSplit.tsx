import type { ReactNode } from "react";
import Aurora from "./Aurora";

// Shell shared by /login and /join.
//  • Desktop: form left, full-bleed dark brand panel right.
//  • Phone: a dark hero band (mobileHero) with the form as a rounded sheet
//    sliding up over it — same brand feel instead of a plain white form.
export default function AuthSplit({
  children,
  panel,
  mobileHero,
}: {
  children: ReactNode;
  panel: ReactNode;
  mobileHero: ReactNode;
}) {
  return (
    <div className="lg:grid lg:min-h-[calc(100vh-88px)] lg:grid-cols-2">
      <div className="relative overflow-hidden bg-brand-ink px-6 pb-16 pt-10 text-ivory sm:px-10 lg:hidden">
        <Aurora variant="dark" />
        <div className="relative mx-auto max-w-md">{mobileHero}</div>
      </div>

      <div className="relative -mt-7 rounded-t-[2rem] bg-ivory px-6 pb-14 pt-9 sm:px-10 lg:mt-0 lg:flex lg:flex-col lg:justify-center lg:rounded-none lg:bg-transparent lg:py-28">
        <div className="mx-auto w-full max-w-md">{children}</div>
      </div>

      <aside className="relative hidden overflow-hidden bg-brand-ink text-ivory lg:block">
        <Aurora variant="dark" />
        <div className="relative flex h-full flex-col justify-center px-14 py-24 xl:px-24">
          {panel}
        </div>
      </aside>
    </div>
  );
}
