"use client";

import { useActionState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

export type ActionState = { ok?: string; error?: string } | null;
export type FormAction = (prev: ActionState, data: FormData) => Promise<ActionState>;

/**
 * A plain <form> wired to a server action. The action returns a message
 * instead of throwing, so the result shows up next to the button and the
 * page never falls into an error screen over a validation problem.
 */
export default function AdminForm({
  action,
  children,
  className = "",
  hidden,
}: {
  action: FormAction;
  children: ReactNode;
  className?: string;
  /** Hidden fields, as name -> value. */
  hidden?: Record<string, string | number | boolean | null | undefined>;
}) {
  const [state, run] = useActionState(action, null);
  return (
    <form action={run} className={className}>
      {hidden &&
        Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v == null ? "" : String(v)} />)}
      {children}
      {state?.error && (
        <p role="alert" className="mt-2 basis-full text-sm text-pin">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="mt-2 basis-full text-sm text-forest">
          {state.ok}
        </p>
      )}
    </form>
  );
}

export function Submit({
  children,
  className = "btn btn-sm",
  confirm,
  name,
  value,
}: {
  children: ReactNode;
  className?: string;
  /** Ask before submitting (destructive or far-reaching actions). */
  confirm?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      className={className}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {pending ? "Working" : children}
    </button>
  );
}
