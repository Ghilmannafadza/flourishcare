import { useEffect, useState } from "react";
import { User2, Mail, Phone, Baby } from "lucide-react";
import { fetchPatientChildren, type PatientChild } from "@/features/patient/queries";
import { useAuth } from "@/providers/AuthProvider";
import { EmptyState, LoadingBlock } from "@/features/dashboard/common";

export function PatientProfile() {
  const { session } = useAuth();
  const [children, setChildren] = useState<PatientChild[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchPatientChildren();
        if (!cancelled) setChildren(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const wa = session?.user.user_metadata?.whatsapp ?? "-";
  const email = session?.user.email ?? "-";

  if (loading) return <LoadingBlock />;

  return (
    <div className="space-y-5">
      {/* Data Orang Tua */}
      <section className="bg-white rounded-3xl border border-black/5 p-5 shadow-warm-sm">
        <h3 className="font-heading font-bold flex items-center gap-2 mb-4">
          <User2 size={18} className="text-primary" /> Data Orang Tua
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoRow icon={Mail} label="Email" value={email} />
          <InfoRow icon={Phone} label="WhatsApp" value={wa} />
        </div>
        <p className="text-xs text-text-secondary mt-4">
          Untuk mengubah data, hubungi admin klinik.
        </p>
      </section>

      {/* Data Anak */}
      <section>
        <h3 className="font-heading font-bold flex items-center gap-2 mb-3">
          <Baby size={18} className="text-primary" /> Data Anak
        </h3>
        {children.length === 0 ? (
          <EmptyState
            title="Belum ada data anak"
            description="Data anak akan dibuat otomatis saat Anda membuat booking pertama."
            icon={Baby}
          />
        ) : (
          <div className="space-y-3">
            {children.map((c) => (
              <div key={c.id} className="bg-white rounded-3xl border border-black/5 p-5 shadow-warm-sm">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="font-heading font-bold text-lg">{c.full_name}</p>
                    {c.rm_number && (
                      <p className="text-xs text-primary font-mono">{c.rm_number}</p>
                    )}
                  </div>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                    {c.gender === "L" ? "Laki-laki" : "Perempuan"}
                  </span>
                </div>
                <p className="text-sm text-text-secondary">
                  Lahir: {new Date(c.dob).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}
                </p>
                {c.primary_condition && (
                  <p className="text-sm text-text-secondary mt-1">Program: {c.primary_condition}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof User2; label: string; value: string }) {
  return (
    <div className="bg-background rounded-2xl border border-black/5 p-4">
      <div className="flex items-center gap-2 text-xs text-text-secondary uppercase tracking-wider mb-1">
        <Icon size={12} className="text-primary" />
        {label}
      </div>
      <p className="text-sm font-semibold break-all">{value}</p>
    </div>
  );
}
