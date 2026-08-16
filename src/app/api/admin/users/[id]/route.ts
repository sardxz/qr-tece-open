import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { applyEvent } from "@/lib/reputation";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { id } = await params;

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, deletedAt: true },
  });
  if (!target) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  if (target.role === "ADMIN") return NextResponse.json({ error: "Não é possível excluir admins" }, { status: 403 });
  if (target.deletedAt) return NextResponse.json({ error: "Usuário já excluído" }, { status: 409 });

  // Coleta IDs dos posts do usuário para apagar dependências em cascata manual
  const userPosts = await prisma.post.findMany({
    where: { authorId: id },
    select: { id: true },
  });
  const postIds = userPosts.map((p) => p.id);

  await prisma.$transaction([
    // Likes do usuário e em posts do usuário
    prisma.like.deleteMany({ where: { userId: id } }),
    prisma.like.deleteMany({ where: { postId: { in: postIds } } }),

    // Comentários do usuário e em posts do usuário
    prisma.comment.deleteMany({ where: { authorId: id } }),
    prisma.comment.deleteMany({ where: { postId: { in: postIds } } }),

    // Replies de outros apontando para posts do usuário (orphan, não excluir)
    prisma.post.updateMany({ where: { replyToId: { in: postIds } }, data: { replyToId: null } }),

    // Posts do usuário
    prisma.post.deleteMany({ where: { authorId: id } }),

    // Depos enviados e recebidos
    prisma.depo.deleteMany({ where: { OR: [{ authorId: id }, { recipientId: id }] } }),

    // Amizades
    prisma.friendship.deleteMany({ where: { OR: [{ requesterId: id }, { receiverId: id }] } }),

    // Memberships de comunidades
    prisma.communityMember.deleteMany({ where: { userId: id } }),

    // Showcase
    prisma.showcaseItem.deleteMany({ where: { userId: id } }),

    // Top friends
    prisma.topFriend.deleteMany({ where: { OR: [{ userId: id }, { friendId: id }] } }),

    // Reputação
    prisma.reputationEvent.deleteMany({ where: { userId: id } }),

    // Tokens de reset de senha
    prisma.passwordResetToken.deleteMany({ where: { userId: id } }),

    // Eventos de uso
    prisma.userEvent.deleteMany({ where: { userId: id } }),

    // Push tokens (cascade já resolveria ao deletar o user, mas aqui anonimizamos)
    prisma.pushToken.deleteMany({ where: { userId: id } }),

    // UpdateLikes
    prisma.updateLike.deleteMany({ where: { userId: id } }),

    // Convites criados pelo usuário
    prisma.invite.deleteMany({ where: { createdById: id } }),

    // Libera o convite que o usuário usou para entrar (pertence ao padrinho)
    prisma.invite.updateMany({
      where: { usedById: id },
      data: { usedById: null, usedAt: null },
    }),

    // Anonimiza e marca como excluído
    prisma.user.update({
      where: { id },
      data: {
        email: `deleted_${id}@qrtece.invalid`,
        username: `excluido_${id.slice(-8)}`,
        passwordHash: "DELETED",
        bio: null,
        city: null,
        state: null,
        birthYear: null,
        profilePhrase: null,
        profileImageUrl: null,
        profileCoverUrl: null,
        statusText: null,
        manualStatus: null,
        reputationScore: 0,
        isActive: false,
        isMuted: false,
        deletedAt: new Date(),
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }

  const { isActive, isMuted } = body as { isActive?: boolean; isMuted?: boolean };

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, isActive: true, isMuted: true, invitedById: true },
  });
  if (!target) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  if (target.role === "ADMIN") return NextResponse.json({ error: "Não é possível modificar admins" }, { status: 403 });

  const newIsActive = isActive ?? target.isActive;
  const newIsMuted  = isMuted  ?? target.isMuted;

  let user: { id: string; isActive: boolean; isMuted: boolean };

  if (isActive === false && target.isActive === true) {
    // Exclusão: anonimiza todos os dados além de desativar
    const suffix = randomBytes(8).toString("hex");
    user = await prisma.user.update({
      where: { id },
      data: {
        isActive: false,
        isMuted: newIsMuted,
        email: `excluido_${suffix}@tece.deletado`,
        username: `excluido_${suffix}`,
        passwordHash: `DELETED_${randomBytes(32).toString("hex")}`,
        bio: null,
        city: null,
        state: null,
        birthYear: null,
        profilePhrase: null,
        profileImageUrl: null,
      },
      select: { id: true, isActive: true, isMuted: true },
    });
  } else {
    user = await prisma.user.update({
      where: { id },
      data: { isActive: newIsActive, isMuted: newIsMuted },
      select: { id: true, isActive: true, isMuted: true },
    });
  }

  // Eventos de reputação — só dispara em mudanças reais
  if (isActive === false && target.isActive === true) {
    // Ban: penaliza o próprio usuário e o padrinho
    await applyEvent(id, -500, "ban_self");
    if (target.invitedById) {
      await applyEvent(target.invitedById, -150, "ban_affiliate", id);
    }
  }

  if (isMuted === true && target.isMuted === false) {
    // Mute: penaliza o próprio usuário e o padrinho
    await applyEvent(id, -200, "mute_self");
    if (target.invitedById) {
      await applyEvent(target.invitedById, -80, "mute_affiliate", id);
    }
  }

  return NextResponse.json({ user });
}
