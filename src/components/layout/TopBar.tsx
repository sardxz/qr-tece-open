"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";

const TOP_NAV_ITEMS = [
  { href: "/home", label: "início" },
  { href: "/perfil", label: "perfil" },
  { href: "/amigos", label: "amigos", compactHidden: true },
  { href: "/depos/recebidos", label: "depos", compactHidden: true },
  { href: "/comunidades", label: "comunidades" },
  { href: "/configuracoes", label: "configurações" },
];

const MOBILE_MENU_ITEMS = [
  { href: "/home", label: "início" },
  { href: "/perfil", label: "perfil" },
  { href: "/amigos", label: "amigos" },
  { href: "/configuracoes", label: "configurações" },
];

const LIGHT_BG = "#1aacbb";
const DARK_BG = "#0d0f14";

export default function TopBar({ username, isAdmin }: { username: string; isAdmin?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const topbarBg = isDark ? DARK_BG : LIGHT_BG;
  const textColor = isDark ? "#d0daf0" : "#ffffff";
  const topbarBorder = isDark ? "1px solid rgba(255,255,255,0.07)" : "none";
  const linkActiveStyle = isDark
    ? { background: "rgba(255,255,255,.08)", color: "#d0daf0" }
    : { background: "rgba(255,255,255,.25)", color: "#ffffff" };

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  function handleSearch(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      const q = (e.target as HTMLInputElement).value.trim();
      if (q) router.push(`/busca?q=${encodeURIComponent(q)}`);
    }
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <>
      {/* ── Desktop (> 900px) ── */}
      <header
        className="app-topbar max-[900px]:hidden flex min-h-[110px] items-center gap-8 px-8 max-[1280px]:gap-4"
        style={{ background: topbarBg, borderBottom: topbarBorder }}
      >
        <Link href="/home" className="topbar-brand w-[230px] leading-none" style={{ color: textColor }}>
          <strong className="block text-[42px] font-black tracking-[-2px]">qr.tecê?</strong>
          <span className="mt-1 block text-[15px] font-bold">conexões, sem ego</span>
        </Link>

        <nav className="topbar-nav flex gap-[18px] max-[760px]:order-3 max-[760px]:w-full max-[760px]:overflow-x-auto">
          {TOP_NAV_ITEMS.map((item) => {
            const href = item.href === "/perfil" ? `/perfil/${username}` : item.href;
            const isActive =
              item.href === "/perfil"
                ? pathname.startsWith("/perfil")
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={href}
                className={`topbar-nav-link rounded-xl px-[25px] py-[17px] font-black no-underline transition-transform hover:-translate-y-0.5${item.compactHidden ? " topbar-compact-hidden" : ""}`}
                style={isActive ? linkActiveStyle : { background: "transparent", color: textColor }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <input
          className="topbar-search ml-auto h-[58px] w-[460px] rounded-[14px] border-0 px-[22px] text-[15px] outline-none tece-shadow max-[1280px]:w-[200px] max-[1280px]:flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.9)", color: "#172033" }}
          placeholder="buscar pessoas ou comunidades"
          aria-label="buscar pessoas ou comunidades"
          onKeyDown={handleSearch}
        />

        <div className="topbar-actions flex items-center gap-7 font-black max-[1280px]:hidden" style={{ color: textColor }}>
          {isAdmin && (
            <Link
              href="/admin"
              className="rounded-lg px-3 py-1.5 text-sm font-black no-underline"
              style={{ background: "rgba(245,158,11,.25)", color: "#fbbf24" }}
            >
              admin
            </Link>
          )}
          <Link href="/home" style={{ color: textColor }}>ajuda</Link>
          <button type="button" onClick={handleLogout} className="cursor-pointer border-0 bg-transparent p-0 font-black" style={{ color: textColor }}>
            sair
          </button>
        </div>
      </header>

      {/* ── Mobile (≤ 900px) ── */}
      <header
        className="hidden max-[900px]:block px-4 pt-4 pb-3"
        style={{ background: topbarBg, borderBottom: topbarBorder }}
      >
        <div className="flex items-center justify-between mb-3">
          <Link href="/home" className="leading-none" style={{ color: textColor }}>
            <strong className="block text-[30px] font-black tracking-[-1px]">qr.tecê?</strong>
          </Link>

          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Menu"
              className="flex flex-col justify-center gap-[5px] rounded-lg p-2"
            >
              <span className="block h-[2.5px] w-6 rounded-full" style={{ background: textColor }} />
              <span className="block h-[2.5px] w-6 rounded-full" style={{ background: textColor }} />
              <span className="block h-[2.5px] w-6 rounded-full" style={{ background: textColor }} />
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-xl border shadow-lg"
                style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
              >
                {MOBILE_MENU_ITEMS.map((item) => {
                  const href = item.href === "/perfil" ? `/perfil/${username}` : item.href;
                  return (
                    <Link
                      key={item.href}
                      href={href}
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-3 text-sm font-black no-underline"
                      style={{ color: "var(--color-text)" }}
                    >
                      {item.label}
                    </Link>
                  );
                })}
                <div className="mx-4 my-1 h-px" style={{ background: "var(--color-border)" }} />
                <Link
                  href="/home"
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-3 text-sm font-black no-underline"
                  style={{ color: "var(--color-text)" }}
                >
                  ajuda
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="block w-full px-4 py-3 text-left text-sm font-black border-0 bg-transparent cursor-pointer"
                  style={{ color: "var(--color-text)" }}
                >
                  sair
                </button>
              </div>
            )}
          </div>
        </div>

        <input
          className="w-full h-[46px] rounded-[12px] border-0 px-4 text-[15px] outline-none tece-shadow"
          style={{ background: "#ffffff", color: "#172033" }}
          placeholder="buscar pessoas ou comunidades"
          aria-label="buscar pessoas ou comunidades"
          onKeyDown={handleSearch}
        />
      </header>
    </>
  );
}
