"use client";

import { useEffect, useState } from "react";

/**
 * For readers outside India: the same moment on their own clock, after the
 * IST time. House style (Brand Guidelines, p. 22): "6:30 pm IST / 9:00 am EDT".
 * Renders nothing for a reader whose clock already matches IST.
 */
export default function SecondZone({ iso }: { iso: string }) {
  const [text, setText] = useState("");
  useEffect(() => {
    const d = new Date(iso);
    const clock = (zone?: string) => new Intl.DateTimeFormat("en-US", { timeZone: zone, hour: "numeric", minute: "2-digit", hour12: true, timeZoneName: "short" }).formatToParts(d);
    const read = (parts: Intl.DateTimeFormatPart[], type: string) => parts.find((p) => p.type === type)?.value ?? "";
    const here = clock();
    const india = clock("Asia/Kolkata");
    const same = ["hour", "minute", "dayPeriod"].every((t) => read(here, t) === read(india, t));
    if (!same) setText(` / ${read(here, "hour")}:${read(here, "minute")} ${read(here, "dayPeriod").toLowerCase()} ${read(here, "timeZoneName")}`);
  }, [iso]);
  return text ? <span>{text}</span> : null;
}
