"use client";

import { useEffect } from "react";
import ErrorScreen from "@/components/ErrorScreen";
import { reportError } from "@/lib/reportError";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error);
  }, [error]);
  return <ErrorScreen reset={reset} />;
}
