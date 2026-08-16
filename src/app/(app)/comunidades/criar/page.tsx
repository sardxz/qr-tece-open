import CriarComunidadeForm from "@/components/communities/CriarComunidadeForm";

export default function CriarComunidadePage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2
          className="text-xl font-bold"
          style={{ color: "var(--color-text)", fontFamily: "var(--font-display)" }}
        >
          criar comunidade
        </h2>
        <p className="text-sm mt-0.5" style={{ color: "var(--color-text-muted)" }}>
          reúna pessoas ao redor de algo em comum
        </p>
      </div>
      <div className="card p-6">
        <CriarComunidadeForm />
      </div>
    </div>
  );
}
