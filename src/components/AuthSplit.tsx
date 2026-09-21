import type { ReactNode } from "react";
import Aurora from "./Aurora";

// Two-column shell shared by /login and /join: form on the left, a dark brand
// panel on the right (hidden on phones, where the form gets the whole screen).
export default function AuthSplit({
  children,
  panel,
}: {
  children: ReactNode;
  panel: ReactNode;
}) {
  return (
    <div className="grid min-h-[calc(100vh-88px)] grid-cols-1 lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-14 md:px-10 md:py-20 lg:py-28">
        <div className="mx-auto w-full max-w-md">{children}</div>
      </div>
      <aside className="relative hidden overflow-hidden bg-oxblood text-ivory lg:block">
        <Aurora variant="dark" />
        <div className="relative flex h-full flex-col justify-center px-14 py-24 xl:px-24">
          {panel}
        </div>
      </aside>
    </div>
  );
}
