"use client";

import { useEffect, useState } from "react";

function timeLeft(target: number) {
  const diff = Math.max(0, target - Date.now());
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1000);
  return { days, hours, minutes, seconds, done: diff === 0 };
}

// Live-ticking countdown to an event — the centerpiece of the member
// homepage's featured tile. Ticks every second; cheap (one timer, four
// number updates, no re-render of anything else on the page).
export default function EventCountdown({ dateIso }: { dateIso: string }) {
  const target = new Date(dateIso).getTime();
  const [t, setT] = useState(() => timeLeft(target));

  useEffect(() => {
    const id = setInterval(() => setT(timeLeft(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  const units: { value: number; label: string }[] = [
    { value: t.days, label: "days" },
    { value: t.hours, label: "hrs" },
    { value: t.minutes, label: "min" },
    { value: t.seconds, label: "sec" },
  ];

  return (
    <div className="flex items-end gap-4 sm:gap-6">
      {units.map((u) => (
        <div key={u.label} className="flex flex-col items-center">
          <span className="font-display text-4xl tabular-nums text-ivory sm:text-5xl">
            {String(u.value).padStart(2, "0")}
          </span>
          <span className="mt-1 font-sans text-[10px] font-medium uppercase tracking-[0.16em] text-ivory/55">
            {u.label}
          </span>
        </div>
      ))}
    </div>
  );
}
