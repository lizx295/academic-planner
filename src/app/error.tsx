"use client";

import { useEffect } from "react";

import { ErrorState } from "@/components/ui/ErrorState";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Academic Planner route error", error);
  }, [error]);

  return <ErrorState description={error.message || undefined} digest={error.digest} onRetry={reset} />;
}
