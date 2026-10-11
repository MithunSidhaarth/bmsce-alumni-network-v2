import Link from "next/link";
import CampusMap from "../campus/CampusMap";
import Icon from "../Icon";

/** The campus map on the public home page: it draws itself as it scrolls into view. */
export default function CampusTeaser() {
  return (
    <section aria-labelledby="campus-title" className="overflow-hidden py-20 md:py-28">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 md:px-10 lg:grid-cols-[0.75fr_1.25fr] lg:items-center">
        <div>
          <p className="label-mono text-tangerine">Find your way around</p>
          <h2 id="campus-title" className="mt-4 font-display text-[clamp(2.4rem,6.5vw,4.6rem)] font-extrabold leading-[0.92] tracking-[-0.04em]">
            You still know <span className="serif-accent hl">the way</span>.
          </h2>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-ink/75">
            The campus, drawn from memory. Every building opens a part of the Network: start at the main gate, or go
            straight to the canteen.
          </p>
          <Link href="/campus" className="btn mt-7">
            Open the full map <Icon name="arrow" className="h-4 w-4" />
          </Link>
          <p className="label-mono mt-5 text-ink/70 md:hidden">Drag the map sideways to see all of it</p>
        </div>
        <div className="sheet relative min-w-0 rotate-[0.8deg] p-2.5 sm:p-4">
          <span className="tape" aria-hidden="true" />
          <CampusMap />
        </div>
      </div>
    </section>
  );
}
