import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ThemeToggle from "@/components/ThemeToggle";
import EditProfileForm from "@/components/profile/EditProfileForm";
import ChangePasswordForm from "@/components/profile/ChangePasswordForm";
import SessionActionsCard from "@/components/profile/SessionActionsCard";
import DeleteAccountCard from "@/components/profile/DeleteAccountCard";
import InviteCard from "@/components/profile/InviteCard";

export default async function ConfiguracoesPage() {
  const session = await getSession();
  if (!session) redirect("/");

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      username: true,
      gender: true,
      bio: true,
      city: true,
      state: true,
      birthYear: true,
      profilePhrase: true,
      profileImageUrl: true,
      role: true,
      invitedBy: {
        select: {
          gender: true,
        },
      },
    },
  });

  if (!user) redirect("/login");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="m-0 text-[32px] font-black leading-tight" style={{ color: "var(--color-text)" }}>
          configurações
        </h1>
        <p className="mt-1 text-[17px] font-bold" style={{ color: "var(--color-text-muted)" }}>
          personalize sua experiência no tecê
        </p>
      </div>

      <div className="card p-6 flex flex-col gap-5">
        <h2 className="text-base font-black m-0" style={{ color: "var(--color-text)" }}>
          aparência
        </h2>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold m-0" style={{ color: "var(--color-text)" }}>tema</p>
            <p className="text-xs mt-0.5 m-0" style={{ color: "var(--color-text-muted)" }}>
              alterne entre o modo claro e escuro
            </p>
          </div>
          <ThemeToggle />
        </div>
      </div>

      <div className="card p-6 flex flex-col gap-5">
        <h2 className="text-base font-black m-0" style={{ color: "var(--color-text)" }}>
          editar perfil
        </h2>
        <EditProfileForm user={user} />
      </div>

      <div className="card p-6 flex flex-col gap-5">
        <div>
          <h2 className="text-base font-black m-0" style={{ color: "var(--color-text)" }}>
            alterar senha
          </h2>
          <p className="text-xs mt-1 m-0" style={{ color: "var(--color-text-muted)" }}>
            use uma senha forte com letras, números e símbolos
          </p>
        </div>
        <ChangePasswordForm />
      </div>

      <InviteCard invitedByGender={user.invitedBy?.gender ?? null} />
      <div className="card p-6 flex flex-col gap-6">
        <div>
          <h2 className="m-0 text-base font-black" style={{ color: "var(--color-text)" }}>
            zona perigosa
          </h2>
          <p className="mt-1 mb-0 text-sm font-bold" style={{ color: "var(--color-text-muted)" }}>
            sessão atual, saída da conta e ações irreversíveis
          </p>
        </div>

        <div className="border-t pt-6" style={{ borderColor: "var(--color-border)" }}>
          <SessionActionsCard isAdmin={user.role === "ADMIN"} embedded />
        </div>

        <div className="border-t pt-6" style={{ borderColor: "var(--color-border)" }}>
          <DeleteAccountCard embedded />
        </div>
      </div>
    </div>
  );
}
