import { z } from "zod";

const stripHtml = (v: string) => v.replace(/<[^>]*>/g, "").trim();
const textField = (max: number, msg: string) =>
  z.string().max(max, msg).transform(stripHtml);

export const loginSchema = z.object({
  email: z.string().trim().email("E-mail inválido"),
  password: z.string().min(1, "Senha obrigatória"),
});

export const cadastroSchema = z.object({
  inviteCode: z
    .string()
    .trim()
    .min(1, "Código de convite obrigatório")
    .max(32, "Código inválido"),
  email: z.string().trim().email("E-mail inválido"),
  username: z
    .string()
    .trim()
    .min(3, "Username deve ter pelo menos 3 caracteres")
    .max(30, "Username deve ter no máximo 30 caracteres")
    .regex(
      /^[a-z0-9_]+$/,
      "Username pode conter apenas letras minúsculas, números e _"
    ),
  gender: z.enum(["H", "M"], { error: "Selecione o gênero" }),
  password: z
    .string()
    .min(8, "Senha deve ter pelo menos 8 caracteres")
    .max(100, "Senha muito longa"),
  termsAccepted: z.literal(true, {
    error: "Você precisa aceitar os termos para continuar",
  }),
});

export const editProfileSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username deve ter pelo menos 3 caracteres")
    .max(20, "Username deve ter no máximo 20 caracteres")
    .regex(/^[a-z0-9_]+$/, "Username pode conter apenas letras minúsculas, números e _"),
  gender: z.enum(["H", "M"], { error: "Selecione o gênero" }),
  bio: textField(300, "Bio deve ter no máximo 300 caracteres").optional(),
  city: z.string().trim().max(80, "Cidade muito longa").optional(),
  state: z.string().trim().max(2, "Use a sigla do estado (ex: SP)").optional(),
  birthYear: z
    .number()
    .int()
    .min(1900)
    .max(new Date().getFullYear())
    .optional()
    .nullable(),
  profilePhrase: textField(140, "Frase deve ter no máximo 140 caracteres").optional(),
});

export const createPostSchema = z.object({
  content: textField(1000, "Post muito longo"),
  communityId: z.string().optional(),
  replyToId: z.string().optional(),
  imageUrl: z.string().startsWith("/uploads/posts/", "URL de imagem inválida").optional().nullable(),
}).refine(
  (data) => data.content.length > 0 || !!data.imageUrl,
  { message: "Post não pode ser vazio" }
);

export const createDepoSchema = z.object({
  content: textField(500, "Depo deve ter no máximo 500 caracteres").pipe(
    z.string().min(10, "Depo deve ter pelo menos 10 caracteres")
  ),
  recipientUsername: z.string().trim(),
});

export const createCommunitySchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Nome deve ter pelo menos 3 caracteres")
    .max(80, "Nome muito longo"),
  slug: z
    .string()
    .trim()
    .min(3, "Slug deve ter pelo menos 3 caracteres")
    .max(60, "Slug muito longo")
    .regex(/^[a-z0-9-]+$/, "Slug pode conter apenas letras, números e hífens"),
  description: textField(500, "Descrição muito longa").optional(),
  coverImageUrl: z.string().min(1, "A capa é obrigatória"),
  isPrivate: z.boolean().optional().default(false),
  rules: textField(2000, "Regras muito longas").optional(),
  maxMembers: z.number().int().min(2).max(500).optional().nullable(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CadastroInput = z.infer<typeof cadastroSchema>;
export type EditProfileInput = z.infer<typeof editProfileSchema>;
export type CreatePostInput = z.infer<typeof createPostSchema>;
export type CreateDepoInput = z.infer<typeof createDepoSchema>;
export type CreateCommunityInput = z.infer<typeof createCommunitySchema>;
