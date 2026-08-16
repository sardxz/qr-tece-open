import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const from = process.env.RESEND_FROM ?? "noreply@qrtece.com.br";
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.qrtece.com.br";

export async function sendPasswordResetEmail(email: string, token: string) {
  const link = `${appUrl}/redefinir-senha?token=${token}`;

  await resend.emails.send({
    from,
    to: email,
    subject: "Redefinição de senha — qr.tecê",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#1e2d2d">
        <h1 style="font-size:24px;font-weight:900;margin:0 0 8px">qr.tecê</h1>
        <p style="color:#6b7280;margin:0 0 24px">Recebemos uma solicitação para redefinir a senha da sua conta.</p>
        <a href="${link}"
           style="display:inline-block;background:#0d9488;color:#fff;font-weight:700;text-decoration:none;padding:12px 24px;border-radius:10px;margin-bottom:24px">
          Redefinir minha senha
        </a>
        <p style="color:#6b7280;font-size:13px;margin:0 0 8px">
          Este link é válido por <strong>1 hora</strong>. Se você não solicitou a redefinição, ignore este e-mail — sua senha continua a mesma.
        </p>
        <p style="color:#9ca3af;font-size:12px;margin:0">
          Se o botão não funcionar, copie e cole este endereço no navegador:<br/>
          <span style="color:#0d9488">${link}</span>
        </p>
      </div>
    `,
  });
}
