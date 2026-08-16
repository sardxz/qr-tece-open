import { formatLongDate } from "@/lib/utils";
import type { TimelineEvent } from "@/types";

type Props = {
  events: TimelineEvent[];
};

export default function ProfileTimeline({ events }: Props) {
  return (
    <section className="card min-w-0 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className="grid h-7 w-7 place-items-center rounded-md text-[14px]"
            style={{ background: "rgba(49,213,222,.12)", color: "var(--color-tece-500)" }}
          >
            ◷
          </span>
          <h2 className="text-sm font-semibold" style={{ color: "var(--color-text-muted)" }}>
            sua história no tecê
          </h2>
        </div>
        <button
          type="button"
          className="text-xs font-semibold transition-opacity hover:opacity-80"
          style={{ color: "var(--color-tece-500)" }}
        >
          ver todas as memórias
        </button>
      </div>

      {events.length === 0 ? (
        <div
          className="rounded-xl border px-4 py-6 text-center text-sm"
          style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)", background: "rgba(7, 16, 34, 0.12)" }}
        >
          nenhuma memória registrada ainda.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {events.slice(0, 5).map((event, index) => (
            <div key={event.id} className="flex min-w-0 gap-3">
              <div className="flex flex-col items-center">
                <div
                  className="grid h-10 w-10 place-items-center rounded-lg text-base"
                  style={{
                    background: event.iconBg ?? "rgba(49,213,222,.12)",
                    color: event.iconColor ?? "var(--color-tece-500)",
                  }}
                >
                  {event.icon}
                </div>
                {index < Math.min(events.length, 5) - 1 && (
                  <div
                    className="mt-2 w-px flex-1"
                    style={{ background: "rgba(255,255,255,0.08)", minHeight: "28px" }}
                  />
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-2 border-b pb-4 last:border-b-0 last:pb-0 min-[560px]:flex-row min-[560px]:items-start min-[560px]:justify-between min-[560px]:gap-3" style={{ borderColor: "var(--color-border)" }}>
                <p className="min-w-0 text-sm leading-relaxed" style={{ color: "var(--color-text)" }}>
                  {event.description}
                </p>
                <span className="text-xs font-medium min-[560px]:shrink-0 min-[560px]:whitespace-nowrap" style={{ color: "var(--color-text-muted)" }}>
                  {formatLongDate(event.date)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
