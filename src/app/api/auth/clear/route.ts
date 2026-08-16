import { type NextRequest, NextResponse } from "next/server";
import { clearAuthCookie } from "@/lib/auth";

export async function GET(request: NextRequest) {
  await clearAuthCookie();
  return NextResponse.redirect(new URL("/", request.url));
}
