import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "tece-token";

const PROTECTED = [
  "/home",
  "/perfil",
  "/editar-perfil",
  "/comunidades",
  "/depos",
  "/configuracoes",
  "/amigos",
  "/busca",
];
const ADMIN_ONLY = ["/admin"];
const AUTH_ONLY = ["/login", "/cadastro"];

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET não configurado");
  return new TextEncoder().encode(secret);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;

  const isProtected = PROTECTED.some((r) => pathname.startsWith(r));
  const isAdminOnly = ADMIN_ONLY.some((r) => pathname.startsWith(r));
  const isAuthOnly = AUTH_ONLY.some((r) => pathname.startsWith(r));

  if (!token) {
    if (isProtected || isAdminOnly) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  try {
    const { payload } = await jwtVerify(token, getSecret());

    if (isAdminOnly && payload.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/home", request.url));
    }

    if (isAuthOnly) {
      return NextResponse.redirect(new URL("/home", request.url));
    }

    return NextResponse.next();
  } catch {
    const response = isProtected || isAdminOnly
      ? NextResponse.redirect(new URL("/login", request.url))
      : NextResponse.next();

    response.cookies.delete(COOKIE_NAME);
    return response;
  }
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|icons|images).*)",
  ],
};
