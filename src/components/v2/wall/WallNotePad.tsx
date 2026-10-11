"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { pinNote } from "@/app/posts/actions";
import { Draggable, gsap } from "@/lib/gsap";
import { motionOK } from "@/lib/motion";
import Icon from "../Icon";

const COLOURS = ["#fff3a8", "#ffd9c7", "#e2dbff", "#e3f5ab"];
const MAX = 240;

type Mode = "pad" | "edit" | "sent";

/**
 * A pad of sticky notes in the corner of The Wall. Peel one off, drag it
 * anywhere over the board and let go: it sticks there and you write on it.
 * Posting it creates a real post. A member's note waits for an admin before
 * everyone sees it; an admin's own note is pinned straight away.
 *
 * On touch screens, tapping the pad opens the same note.
 */
export default function WallNotePad({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter();
  const note = useRef<HTMLDivElement | null>(null);
  const drag = useRef<Draggable | null>(null);
  const field = useRef<HTMLTextAreaElement | null>(null);
  const [mode, setMode] = useState<Mode>("pad");
  const [canDrag, setCanDrag] = useState(false);
  const [text, setText] = useState("");
  const [colour, setColour] = useState(0);
  const [outcome, setOutcome] = useState<"published" | "pending" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    const el = note.current;
    if (!el || !motionOK() || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    setCanDrag(true);
    const [d] = Draggable.create(el, {
      type: "x,y",
      zIndexBoost: false,
      onPress() {
        gsap.to(el, { scale: 1.08, duration: 0.2 });
      },
      onDrag(this: Draggable) {
        gsap.to(el, { rotation: gsap.utils.clamp(-14, 14, this.deltaX * 0.9), duration: 0.2, overwrite: "auto" });
      },
      onRelease(this: Draggable) {
        // Far enough from the pad counts as "thrown onto the wall".
        if (Math.hypot(this.x, this.y) > 110) {
          gsap.to(el, { scale: 1, rotation: gsap.utils.random(-4, 4), duration: 0.5, ease: "back.out(2.6)" });
          this.disable();
          setMode("edit");
        } else {
          gsap.to(el, { x: 0, y: 0, scale: 1, rotation: 0, duration: 0.7, ease: "elastic.out(1, 0.5)" });
        }
      },
      onClick() {
        this.disable();
        setMode("edit");
      },
    });
    drag.current = d;
    return () => {
      d.kill();
    };
  }, []);

  useEffect(() => {
    if (mode === "edit") field.current?.focus();
  }, [mode]);

  const reset = () => {
    setMode("pad");
    setText("");
    setError(null);
    setOutcome(null);
    setColour((c) => (c + 1) % COLOURS.length);
    drag.current?.enable();
    if (note.current) gsap.to(note.current, { x: 0, y: 0, rotation: 0, scale: 1, duration: 0.5, ease: "power3.out" });
  };

  const submit = () => {
    setError(null);
    start(async () => {
      try {
        const result = await pinNote(text);
        setOutcome(result);
        setMode("sent");
        if (result === "published") router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "That note could not be pinned.");
      }
    });
  };

  return (
    <div className="fixed bottom-[calc(var(--tabbar)+1rem)] right-4 z-30 md:bottom-6 md:right-6">
      {/* The rest of the pad, underneath the note you are holding. */}
      {/* Pad-sized even while the lifted note is open and larger. */}
      <span className="stickynote absolute bottom-0 right-0 h-[5.5rem] w-44 rotate-[5deg]" style={{ ["--note" as string]: COLOURS[(colour + 1) % COLOURS.length] }} aria-hidden="true" />
      <span className="stickynote absolute bottom-0 right-0 h-[5.5rem] w-44 -rotate-[3deg]" style={{ ["--note" as string]: COLOURS[(colour + 2) % COLOURS.length] }} aria-hidden="true" />

      <div
        ref={note}
        role={mode === "pad" ? "button" : undefined}
        tabIndex={mode === "pad" ? 0 : undefined}
        aria-label={mode === "pad" ? "Leave a note on the wall" : undefined}
        onClick={() => mode === "pad" && !canDrag && setMode("edit")}
        onKeyDown={(e) => {
          if (mode === "pad" && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            drag.current?.disable();
            setMode("edit");
          }
        }}
        className={`stickynote relative will-change-transform ${mode === "pad" ? "w-44 cursor-grab px-4 pb-4 pt-5 active:cursor-grabbing" : "w-[min(18rem,calc(100vw-2rem))] px-4 pb-4 pt-5"}`}
        style={{ ["--note" as string]: COLOURS[colour] }}
      >
        {mode === "pad" && (
          <>
            <p className="hand text-[1.7rem] leading-none text-ink">Leave a note</p>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-ink/65">
              <Icon name="pin" className="h-3.5 w-3.5" />
              {canDrag ? "Drag me onto the wall" : "Tap to write"}
            </p>
          </>
        )}

        {mode === "edit" && (
          <>
            <label htmlFor="wall-note" className="label-mono text-ink/60">
              Your note
            </label>
            <textarea
              id="wall-note"
              ref={field}
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX))}
              rows={4}
              placeholder="A memory, a hello, a thank you"
              className="hand mt-1 w-full resize-none border-0 bg-transparent text-[1.5rem] leading-[1.15] text-ink placeholder:text-ink/40 focus:outline-none"
            />
            <div className="mt-1 flex items-center gap-2">
              <button type="button" onClick={submit} disabled={pending || text.trim().length < 3} className="btn btn-sm">
                {pending ? "Pinning" : "Pin it"}
              </button>
              <button type="button" onClick={reset} disabled={pending} className="text-xs font-semibold text-ink/65 underline underline-offset-2">
                Take it back
              </button>
              <span className="ml-auto font-mono text-[0.6875rem] text-ink/50">{MAX - text.length}</span>
            </div>
            <p className="mt-2 text-[0.6875rem] leading-snug text-ink/60">
              {isAdmin ? "Posted under your name and pinned for everyone." : "Posted under your name. An admin approves notes before everyone sees them."}
            </p>
            {error && (
              <p role="alert" className="mt-1 text-xs text-pin">
                {error}
              </p>
            )}
          </>
        )}

        {mode === "sent" && (
          <>
            <span className="pin" aria-hidden="true" />
            <p className="hand whitespace-pre-wrap break-words text-[1.5rem] leading-[1.15] text-ink">{text}</p>
            <p role="status" className="mt-3">
              <span className="stamp text-forest">{outcome === "published" ? "Pinned" : "Waiting for approval"}</span>
            </p>
            <button type="button" onClick={reset} className="mt-3 text-xs font-semibold text-ink/70 underline underline-offset-2">
              Leave another
            </button>
          </>
        )}
      </div>
    </div>
  );
}
