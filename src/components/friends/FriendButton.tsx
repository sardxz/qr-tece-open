"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type FriendshipState =
  | { type: "none" }
  | { type: "sent"; id: string }
  | { type: "received"; id: string }
  | { type: "friends"; id: string };

type Props = {
  initialState: FriendshipState;
  receiverUsername: string;
};

export default function FriendButton({ initialState, receiverUsername }: Props) {
  const router = useRouter();
  const [state, setState] = useState<FriendshipState>(initialState);
  const [loading, setLoading] = useState(false);

  async function sendRequest() {
    setLoading(true);
    try {
      const res = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverUsername }),
      });
      const data = await res.json();
      if (res.ok) setState({ type: "sent", id: data.friendship.id });
    } finally {
      setLoading(false);
    }
  }

  async function respond(action: "accept" | "reject") {
    if (state.type !== "received") return;
    setLoading(true);
    try {
      await fetch(`/api/friends/${state.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (action === "accept") setState({ type: "friends", id: state.id });
      else setState({ type: "none" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    if (state.type !== "sent" && state.type !== "friends") return;
    setLoading(true);
    try {
      await fetch(`/api/friends/${state.id}`, { method: "DELETE" });
      setState({ type: "none" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (state.type === "none") {
    return (
      <button onClick={sendRequest} disabled={loading} className="btn-primary text-xs px-3 py-1.5">
        + adicionar amigo
      </button>
    );
  }

  if (state.type === "sent") {
    return (
      <button onClick={remove} disabled={loading} className="btn-secondary text-xs px-3 py-1.5">
        pedido enviado ✓
      </button>
    );
  }

  if (state.type === "received") {
    return (
      <div className="flex gap-2">
        <button onClick={() => respond("accept")} disabled={loading} className="btn-primary text-xs px-3 py-1.5">
          aceitar pedido
        </button>
        <button onClick={() => respond("reject")} disabled={loading} className="btn-secondary text-xs px-3 py-1.5">
          recusar
        </button>
      </div>
    );
  }

  return (
    <button onClick={remove} disabled={loading} className="btn-secondary text-xs px-3 py-1.5">
      amigos ✓
    </button>
  );
}
