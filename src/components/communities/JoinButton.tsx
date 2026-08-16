"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  slug: string;
  initialMember: boolean;
  isOwner: boolean;
};

export default function JoinButton({ slug, initialMember, isOwner }: Props) {
  const router = useRouter();
  const [member, setMember] = useState(initialMember);
  const [loading, setLoading] = useState(false);

  if (isOwner) return null;

  async function toggle() {
    setLoading(true);
    try {
      const res = await fetch(`/api/communities/${slug}/join`, {
        method: member ? "DELETE" : "POST",
      });
      if (!res.ok) return;
      setMember(!member);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={member ? "btn-secondary text-sm" : "btn-primary text-sm"}
    >
      {loading ? "…" : member ? "sair" : "entrar"}
    </button>
  );
}
