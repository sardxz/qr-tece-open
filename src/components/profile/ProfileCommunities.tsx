import Link from "next/link";

type CommunityItem = {
  id: string;
  name: string;
  slug: string;
};

type Props = {
  username: string;
  communities: CommunityItem[];
};

export default function ProfileCommunities({ username, communities }: Props) {
  return (
    <section className="card min-w-0 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className="grid h-7 w-7 place-items-center rounded-md text-[14px]"
            style={{ background: "rgba(49,213,222,.12)", color: "var(--color-tece-500)" }}
          >
            ◎
          </span>
          <h2 className="text-sm font-semibold" style={{ color: "var(--color-text-muted)" }}>
            comunidades ({communities.length})
          </h2>
        </div>
        <Link
          href={`/perfil/${username}/comunidades`}
          className="text-xs font-semibold transition-opacity hover:opacity-80"
          style={{ color: "var(--color-tece-500)" }}
        >
          ver todas
        </Link>
      </div>

      {communities.length === 0 ? (
        <div
          className="rounded-xl border px-4 py-6 text-center text-sm"
          style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)", background: "rgba(7, 16, 34, 0.12)" }}
        >
          nenhuma comunidade por enquanto.
        </div>
      ) : (
        <div className="flex max-h-[330px] flex-col gap-3 overflow-y-auto pr-1">
          {communities.map((community) => (
            <Link
              key={community.id}
              href={`/comunidades/${community.slug}`}
              className="rounded-xl border px-4 py-3 transition-opacity hover:opacity-85"
              style={{ borderColor: "var(--color-border)", background: "rgba(7, 16, 34, 0.18)" }}
            >
              <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                {community.name}
              </p>
              <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
                #{community.slug}
              </p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
