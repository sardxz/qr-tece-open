"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  friendshipId: string;
  mode: "respond" | "unfriend";
};

export default function FriendActions({ friendshipId, mode }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function act(action: "accept" | "reject" | "delete") {
    setLoading(true);
    try {
      if (action === "accept" || action === "reject") {
        await fetch(`/api/friends/${friendshipId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
      } else {
        await fetch(`/api/friends/${friendshipId}`, { method: "DELETE" });
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (mode === "respond") {
    return (
      <div className="flex gap-2 flex-wrap justify-end">
        <button
          onClick={() => act("accept")}
          disabled={loading}
          className="btn-primary text-xs px-3 py-1.5"
        >
          aceitar
        </button>
        <button
          onClick={() => act("reject")}
          disabled={loading}
          className="btn-secondary text-xs px-3 py-1.5"
        >
          recusar
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => act("delete")}
      disabled={loading}
      className="btn-secondary text-xs px-3 py-1.5"
    >
      desfazer amizade
    </button>
  );
}
