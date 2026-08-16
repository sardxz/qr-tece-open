import Link from "next/link";

type Section = {
  title: string;
  paragraphs: string[];
};

type Props = {
  eyebrow: string;
  title: string;
  description: string;
  updatedAt: string;
  effectiveDate: string;
  sections: Section[];
};

export default function LegalDocument({ eyebrow, title, description, updatedAt, effectiveDate, sections }: Props) {
  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="text-sm font-black no-underline" style={{ color: "var(--color-tece-600)" }}>
            qr.tecê
          </Link>
          <div className="flex flex-wrap gap-4 text-sm font-bold">
            <Link href="/privacidade" style={{ color: "var(--color-text-muted)" }}>
              privacidade
            </Link>
            <Link href="/termos" style={{ color: "var(--color-text-muted)" }}>
              termos
            </Link>
          </div>
        </div>

        <section className="card p-6 sm:p-8">
          <div className="flex flex-col gap-3 border-b pb-6" style={{ borderColor: "var(--color-border)" }}>
            <p className="m-0 text-xs font-black uppercase tracking-[0.08em]" style={{ color: "var(--color-tece-500)" }}>
              {eyebrow}
            </p>
            <div className="flex flex-col gap-2">
              <h1 className="m-0 text-3xl font-black leading-tight sm:text-4xl" style={{ color: "var(--color-text)" }}>
                {title}
              </h1>
              <p className="m-0 max-w-2xl text-sm leading-6 sm:text-base" style={{ color: "var(--color-text-muted)" }}>
                {description}
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <p className="m-0 text-xs font-bold" style={{ color: "var(--color-text-muted)" }}>
                Última atualização: {updatedAt}
              </p>
              <p className="m-0 text-xs font-bold" style={{ color: "var(--color-text-muted)" }}>
                Vigência: a partir de {effectiveDate}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-8">
            {sections.map((section) => (
              <section key={section.title} className="flex flex-col gap-3">
                <h2 className="m-0 text-lg font-black" style={{ color: "var(--color-text)" }}>
                  {section.title}
                </h2>
                <div className="flex flex-col gap-3">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph} className="m-0 text-sm leading-7 sm:text-[15px]" style={{ color: "var(--color-text-muted)" }}>
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
