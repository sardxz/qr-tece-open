"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function MarkMentionsSeen() {
  const router = useRouter();
  useEffect(() => {
    router.refresh();
  }, [router]);
  return null;
}
