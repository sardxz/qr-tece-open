"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ResetActivityCounter() {
  const router = useRouter();

  useEffect(() => {
    fetch("/api/activity/reset", { method: "POST" }).then(() => {
      router.refresh();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
