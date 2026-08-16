"use client";

import { useEffect } from "react";

const BASE_TITLE = "qr.tecê? - conexões, sem ego";

export default function TabTitleUpdater({ count }: { count: number }) {
  useEffect(() => {
    const target = count > 0 ? `(${count}) ${BASE_TITLE}` : BASE_TITLE;

    const updateTitle = () => {
      if (document.title !== target) document.title = target;
    };

    updateTitle();

    const titleEl = document.querySelector("title");
    if (!titleEl) return;

    const observer = new MutationObserver(updateTitle);
    observer.observe(titleEl, { childList: true, characterData: true, subtree: true });

    return () => observer.disconnect();
  }, [count]);

  return null;
}
