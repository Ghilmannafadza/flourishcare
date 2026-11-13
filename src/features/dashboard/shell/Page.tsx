import type { PageWidth } from "./nav";

// Kerangka halaman ala Supabase Studio: lebar kontainer menyesuaikan isi
// (small = formulir/pengaturan, default = daftar/tabel, full = kalender/laporan padat),
// judul + deskripsi singkat, dan area aksi di kanan.

const WIDTH: Record<PageWidth, string> = {
  small: "max-w-4xl",
  default: "max-w-6xl",
  full: "max-w-none",
};

export function PageContainer({ width = "default", children }: { width?: PageWidth; children: React.ReactNode }) {
  return <div className={`${WIDTH[width]} mx-auto w-full px-4 md:px-8 py-6 md:py-8`}>{children}</div>;
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
}: {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex items-start justify-between gap-4 flex-wrap mb-6">
      <div className="flex items-start gap-3 min-w-0">
        {Icon && (
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
            <Icon size={18} />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="font-heading font-bold text-xl md:text-2xl leading-tight">{title}</h1>
          {description && <p className="text-sm text-text-secondary mt-1 max-w-2xl">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </header>
  );
}
