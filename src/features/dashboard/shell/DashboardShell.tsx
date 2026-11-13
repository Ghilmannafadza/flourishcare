import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { ChevronRight, ExternalLink, LogOut, Menu, Search, X, PenLine } from "lucide-react";
import { Logo } from "@/components/Logo";
import type { Profile, UserRole } from "@/types/database";
import { pathOf, type NavPage, type NavProduct } from "./nav";
import { CommandMenu } from "./CommandMenu";

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super Admin",
  admin_cabang: "Admin Operasional",
  psikolog: "Psikolog",
  terapis: "Terapis",
  karyawan: "Karyawan",
};

/**
 * Tata letak dashboard mengikuti pola Supabase Studio:
 *  ┌──────────── top bar: logo › breadcrumb ……… Cari (Ctrl K) · Lihat situs · akun ┐
 *  │ rail │ menu produk │ konten halaman                                          │
 *  └──────┴─────────────┴─────────────────────────────────────────────────────────┘
 * - Rail ikon di kiri melebar saat di-hover untuk menampilkan label.
 * - Menu produk hanya muncul bila produk punya lebih dari satu halaman.
 * - Di HP: tombol menu membuka laci berisi seluruh navigasi.
 */
export function DashboardShell({
  nav,
  product,
  page,
  profile,
  role,
  onLogout,
  children,
}: {
  nav: NavProduct[];
  product: NavProduct;
  page: NavPage;
  profile: Profile | null;
  role: UserRole | null;
  onLogout: () => void;
  children: React.ReactNode;
}) {
  const [drawer, setDrawer] = useState(false);
  const [cmd, setCmd] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmd((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    document.title = `${page.label}${product.slug !== "beranda" && product.label !== page.label ? ` | ${product.label}` : ""} | Dashboard FlourishCare`;
    setDrawer(false);
  }, [page, product]);

  const top = nav.filter((p) => !p.bottom);
  const bottom = nav.filter((p) => p.bottom);
  const showProductMenu = product.pages.length > 1;

  return (
    <div className="h-screen flex flex-col bg-background text-text-primary">
      {/* ===== Top bar ===== */}
      <header className="h-14 shrink-0 bg-white border-b border-black/10 flex items-center gap-2 px-3 md:px-4 z-40">
        <button className="md:hidden p-2 -ml-1 rounded-lg hover:bg-black/5" onClick={() => setDrawer(true)} aria-label="Buka menu">
          <Menu size={20} />
        </button>
        <Link to="/dashboard" className="shrink-0 flex items-center" aria-label="Beranda dashboard">
          <Logo className="h-11 w-auto" />
        </Link>
        <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1.5 text-sm min-w-0 ml-2">
          <span className="text-text-secondary/60">/</span>
          <Link to="/dashboard" className="text-text-secondary hover:text-text-primary truncate">Klinik Mitra Diani</Link>
          {product.slug !== "beranda" && (
            <>
              <ChevronRight size={14} className="text-text-secondary/50 shrink-0" />
              <Link to={pathOf(product, product.pages[0])} className="text-text-secondary hover:text-text-primary truncate">
                {product.label}
              </Link>
              {page.label !== product.label && (
                <>
                  <ChevronRight size={14} className="text-text-secondary/50 shrink-0" />
                  <span className="font-medium truncate">{page.label}</span>
                </>
              )}
            </>
          )}
        </nav>
        <div className="flex-1" />
        <button
          onClick={() => setCmd(true)}
          className="hidden sm:flex items-center gap-2 h-9 pl-3 pr-2 rounded-lg border border-black/10 bg-background text-sm text-text-secondary hover:border-primary/40 w-48"
        >
          <Search size={14} />
          <span className="flex-1 text-left whitespace-nowrap">Cari…</span>
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-black/10 bg-white">Ctrl K</kbd>
        </button>
        <button onClick={() => setCmd(true)} className="sm:hidden p-2 rounded-lg hover:bg-black/5" aria-label="Cari">
          <Search size={18} />
        </button>
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden lg:inline-flex items-center gap-1 h-9 px-3 rounded-lg text-sm text-text-secondary hover:bg-black/5"
        >
          Lihat situs <ExternalLink size={13} />
        </a>
        <UserMenu profile={profile} role={role} onLogout={onLogout} />
      </header>

      <div className="flex flex-1 min-h-0">
        {/* ===== Rail ikon (desktop) ===== */}
        <div className="hidden md:block w-14 shrink-0 relative z-30">
          <aside className="group absolute inset-y-0 left-0 w-14 hover:w-56 bg-white border-r border-black/10 flex flex-col py-2 transition-[width] duration-200 overflow-hidden hover:shadow-warm-lg">
            <RailList items={top} active={product.slug} />
            <div className="flex-1" />
            <div className="border-t border-black/5 pt-2">
              <RailList items={bottom} active={product.slug} />
            </div>
          </aside>
        </div>

        {/* ===== Menu produk ===== */}
        {showProductMenu && (
          <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-black/10 bg-white/60 overflow-y-auto">
            <div className="h-12 flex items-center px-4 border-b border-black/5">
              <p className="font-heading font-semibold">{product.label}</p>
            </div>
            <ProductMenu product={product} active={page.key} />
          </aside>
        )}

        {/* ===== Konten ===== */}
        <main className="flex-1 min-w-0 overflow-y-auto" id="main">
          {children}
        </main>
      </div>

      {/* ===== Laci navigasi (HP) ===== */}
      {drawer && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white flex flex-col">
            <div className="h-14 flex items-center justify-between px-4 border-b border-black/10">
              <Logo className="h-9 w-auto" />
              <button onClick={() => setDrawer(false)} className="p-2 rounded-lg hover:bg-black/5" aria-label="Tutup menu">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              {nav.map((p) => (
                <div key={p.slug} className="mb-1">
                  {p.pages.length > 1 ? (
                    <>
                      <p className="px-4 pt-3 pb-1 text-[11px] uppercase tracking-wider text-text-secondary font-semibold flex items-center gap-2">
                        <p.icon size={13} /> {p.label}
                      </p>
                      <ProductMenu product={p} active={page.key} compact />
                    </>
                  ) : (
                    <NavLink
                      to={pathOf(p, p.pages[0])}
                      end
                      className={({ isActive }) =>
                        `mx-2 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${isActive ? "bg-primary/10 text-primary font-semibold" : "text-text-primary hover:bg-black/5"}`
                      }
                    >
                      <p.icon size={18} /> {p.label}
                    </NavLink>
                  )}
                </div>
              ))}
            </div>
            <button onClick={onLogout} className="m-3 flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-red hover:bg-red/10">
              <LogOut size={16} /> Keluar
            </button>
          </aside>
        </div>
      )}

      <CommandMenu open={cmd} onClose={() => setCmd(false)} nav={nav} role={role} />
    </div>
  );
}

function RailList({ items, active }: { items: NavProduct[]; active: string }) {
  return (
    <ul className="space-y-0.5 px-2">
      {items.map((p) => {
        const on = p.slug === active;
        return (
          <li key={p.slug}>
            <Link
              to={pathOf(p, p.pages[0])}
              title={p.label}
              className={`flex items-center gap-3 h-10 px-[9px] rounded-lg text-sm whitespace-nowrap transition-colors ${
                on ? "bg-primary text-white" : "text-text-secondary hover:bg-primary/10 hover:text-primary"
              }`}
            >
              <p.icon size={20} className="shrink-0" />
              <span className="opacity-0 group-hover:opacity-100 transition-opacity font-medium">{p.label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function ProductMenu({ product, active, compact = false }: { product: NavProduct; active: string; compact?: boolean }) {
  const groups: Array<[string, NavPage[]]> = [];
  product.pages.forEach((pg) => {
    const g = pg.group ?? "";
    const last = groups[groups.length - 1];
    if (last && last[0] === g) last[1].push(pg);
    else groups.push([g, [pg]]);
  });
  return (
    <nav className={compact ? "px-2" : "p-2"}>
      {groups.map(([g, pages]) => (
        <div key={g || "_"} className={compact ? "" : "mb-3"}>
          {g && !compact && <p className="px-3 pt-2 pb-1 text-[11px] uppercase tracking-wider text-text-secondary/80 font-semibold">{g}</p>}
          <ul className="space-y-0.5">
            {pages.map((pg) => (
              <li key={pg.key}>
                <Link
                  to={pathOf(product, pg)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                    pg.key === active ? "bg-primary/10 text-primary font-semibold" : "text-text-primary/80 hover:bg-black/5 hover:text-text-primary"
                  }`}
                >
                  <pg.icon size={15} className="shrink-0 opacity-80" />
                  <span className="truncate">{pg.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function UserMenu({ profile, role, onLogout }: { profile: Profile | null; role: UserRole | null; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  const initials = (profile?.full_name ?? "?").split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-9 h-9 rounded-full bg-primary/15 text-primary font-semibold text-sm flex items-center justify-center hover:ring-2 hover:ring-primary/30"
        aria-label="Menu akun"
      >
        {initials}
      </button>
      {open && (
        <div className="absolute right-0 top-11 w-64 bg-white rounded-xl border border-black/10 shadow-warm-lg py-2 z-50">
          <div className="px-4 py-2 border-b border-black/5">
            <p className="font-semibold text-sm truncate">{profile?.full_name ?? "-"}</p>
            <p className="text-xs text-primary">{role ? ROLE_LABEL[role] ?? role : ""}</p>
          </div>
          <button
            onClick={() => {
              setOpen(false);
              navigate("/dashboard/akun");
            }}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-black/5"
          >
            <PenLine size={15} /> Tanda tangan & kata sandi
          </button>
          <a href="/" target="_blank" rel="noopener noreferrer" className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-black/5">
            <ExternalLink size={15} /> Lihat situs
          </a>
          <button onClick={onLogout} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red hover:bg-red/10">
            <LogOut size={15} /> Keluar
          </button>
        </div>
      )}
    </div>
  );
}
