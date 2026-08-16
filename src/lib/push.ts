import { prisma } from "./prisma";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_BATCH_SIZE = 100;

export type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

type ExpoTicket = {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
};

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Envia o mesmo push para vários usuários de uma vez.
 * Busca todos os tokens numa única query e envia em lotes de 100 (limite do Expo),
 * então uma comunidade grande vira poucas requisições em vez de uma por membro.
 * Falha silenciosamente — nunca propaga erro (push é best-effort).
 * Remove tokens reportados como DeviceNotRegistered pelo Expo.
 */
export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<void> {
  if (userIds.length === 0) return;

  const tokens = await prisma.pushToken.findMany({
    where: { userId: { in: userIds } },
    select: { token: true },
  });

  if (tokens.length === 0) return;

  const invalidTokens: string[] = [];

  for (const batch of chunk(tokens, EXPO_BATCH_SIZE)) {
    const messages = batch.map((t) => ({
      to: t.token,
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
      sound: "default" as const,
      priority: "high" as const,
      channelId: "default",
    }));

    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(messages),
      });

      if (!res.ok) {
        console.error("[push] Expo API retornou erro:", res.status, await res.text().catch(() => ""));
        continue;
      }

      const result = (await res.json().catch(() => null)) as { data?: ExpoTicket[] } | null;
      if (!result?.data) continue;

      result.data.forEach((ticket, i) => {
        if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
          const token = batch[i]?.token;
          if (token) invalidTokens.push(token);
        }
      });
    } catch (err) {
      console.error("[push] erro ao enviar:", err);
    }
  }

  if (invalidTokens.length > 0) {
    await prisma.pushToken.deleteMany({ where: { token: { in: invalidTokens } } });
  }
}

/**
 * Envia push notification para todos os devices registrados de um único user.
 * Mantido por conveniência — delega para sendPushToUsers.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  await sendPushToUsers([userId], payload);
}
