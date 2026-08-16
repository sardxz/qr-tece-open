import Link from "next/link";

type FriendItem = {
  id: string;
  username: string;
  profileImageUrl?: string | null;
  gender?: string | null;
  friendsSince: string;
};

type Props = {
  username: string;
  friends: FriendItem[];
  isOwnProfile: boolean;
};

function formatFriendsSince(dateString: string) {
  return new Date(dateString).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

function FriendAvatar({ username, profileImageUrl, gender }: Omit<FriendItem, "id" | "friendsSince">) {
  if (profileImageUrl) {
    return (
      <img
        src={profileImageUrl}
        alt={username}
        className="h-16 w-16 rounded-full object-cover"
        style={{ border: `2px solid ${gender === "M" ? "var(--color-tece-pink)" : "var(--color-tece-cyan)"}` }}
      />
    );
  }

  return (
    <div
      className="grid h-16 w-16 place-items-center rounded-full text-xl font-bold"
      style={{
        background: gender === "M" ? "rgba(253,101,160,.18)" : "rgba(49,213,222,.18)",
        color: gender === "M" ? "var(--color-tece-pink)" : "var(--color-tece-blue)",
      }}
    >
      {username[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

export default function ProfileTopFriends({ username, friends, isOwnProfile }: Props) {
  return (
    <section className="card min-w-0 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className="grid h-7 w-7 place-items-center rounded-md text-[14px]"
            style={{ background: "rgba(49,213,222,.12)", color: "var(--color-tece-500)" }}
          >
            ♡
          </span>
          <h2 className="text-sm font-semibold" style={{ color: "var(--color-text-muted)" }}>
            top amigos
          </h2>
        </div>
        {isOwnProfile && (
          <button
            type="button"
            className="text-xs font-semibold transition-opacity hover:opacity-80"
            style={{ color: "var(--color-tece-500)" }}
          >
            editar
          </button>
        )}
      </div>

      {friends.length === 0 ? (
        <div
          className="rounded-xl border px-4 py-6 text-sm text-center"
          style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)", background: "rgba(7, 16, 34, 0.12)" }}
        >
          ainda não há amigos em destaque.
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-x-3 gap-y-4">
          {friends.slice(0, 8).map((friend) => (
            <Link
              key={friend.id}
              href={`/perfil/${friend.username}`}
              className="group flex flex-col items-center text-center transition-opacity hover:opacity-85"
              title={`amigos desde ${formatFriendsSince(friend.friendsSince)}`}
            >
              <FriendAvatar
                username={friend.username}
                profileImageUrl={friend.profileImageUrl}
                gender={friend.gender}
              />
              <span className="mt-2 max-w-full truncate text-[11px] font-medium" style={{ color: "var(--color-text)" }}>
                @{friend.username}
              </span>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--color-border)" }}>
        <Link
          href={`/perfil/${username}/amigos`}
          className="block w-full rounded-xl border px-3 py-2.5 text-center text-sm font-medium transition-opacity hover:opacity-80"
          style={{ borderColor: "var(--color-border)", color: "var(--color-tece-500)" }}
        >
          ver todos os amigos
        </Link>
      </div>
    </section>
  );
}
