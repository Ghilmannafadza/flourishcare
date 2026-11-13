import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { GraduationCap, Award, Loader2, Users, Sparkles, X, Instagram } from "lucide-react";
import { BOOKING_ONLINE_URL } from "@/config/constants";
import { fadeUp, stagger } from "@/lib/motion";
import { supabase } from "@/lib/supabase";
import type { StaffProfile } from "@/types/database";

// Fallback tim yang selalu tampil bila tabel `staff_profiles` di Supabase kosong.
// Foto ada di public/team/*.jpeg
const FALLBACK_TEAM: StaffProfile[] = [
  {
    id: "fallback-achla",
    profile_id: null as unknown as string,
    title: "Achla Himmah, M.Psi., Psikolog",
    slug: "achla-himmah",
    bio: "Psikolog anak yang berfokus pada asesmen tumbuh kembang, konseling keluarga, dan pendampingan orang tua. Achla percaya bahwa setiap anak memiliki potensi unik yang dapat mekar dengan pendekatan hangat, sabar, dan berbasis bukti.",
    photo_url: "/team/achla.jpeg",
    specialties: ["Asesmen Anak", "Konseling Keluarga", "Kesiapan Sekolah", "Parenting"],
    therapy_types: [],
    str_number: null,
    str_expires_at: null,
    is_visible: true,
    display_order: 1,
    created_at: "",
    updated_at: "",
  },
  {
    id: "fallback-roffany",
    profile_id: null as unknown as string,
    title: "Roffany Hasnatu P K, M.Psi., Psikolog",
    slug: "roffany-hasnatu-p-k",
    bio: "Psikolog anak yang berdedikasi mendampingi anak dan orang tua di setiap tahap tumbuh kembang. Roffany berpengalaman dalam asesmen perkembangan, konseling anak, serta membantu keluarga menyusun strategi intervensi yang selaras dengan kebutuhan si kecil.",
    photo_url: "/team/roffany.jpeg",
    specialties: ["Asesmen Perkembangan", "Konseling Anak", "Intervensi Terapi", "Kolaborasi Keluarga"],
    therapy_types: [],
    str_number: null,
    str_expires_at: null,
    is_visible: true,
    display_order: 2,
    created_at: "",
    updated_at: "",
  },
  {
    id: "fallback-putri",
    profile_id: null as unknown as string,
    title: "Putri Solihah, Terapis Anak",
    slug: "putri-solihah",
    bio: "Terapis anak yang berpengalaman dalam berbagai jenis terapi tumbuh kembang. Putri mendampingi anak-anak dalam sesi terapi on-site di Klinik Mitra Diani dengan pendekatan yang hangat dan menyenangkan.",
    photo_url: null,
    specialties: ["Terapi Wicara", "Sensori Integrasi", "Okupasi Terapi"],
    therapy_types: [],
    str_number: null,
    str_expires_at: null,
    is_visible: true,
    display_order: 3,
    created_at: "",
    updated_at: "",
  },
];

export function Team() {
  const [staff, setStaff] = useState<StaffProfile[]>(FALLBACK_TEAM);
  const [loading, setLoading] = useState(true);
  const [cv, setCv] = useState<StaffProfile | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("staff_profiles")
          .select("*")
          .eq("is_visible", true)
          .order("display_order", { ascending: true });
        if (cancelled) return;
        if (!error && data && data.length > 0) {
          setStaff(data as StaffProfile[]);
        } else {
          setStaff(FALLBACK_TEAM);
        }
      } catch {
        if (!cancelled) setStaff(FALLBACK_TEAM);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <section className="relative pt-14 pb-12 md:pt-20 md:pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="blob blob-peach w-[380px] h-[380px] -top-20 -left-20" />
        <div className="blob blob-lavender w-[320px] h-[320px] top-20 right-10" />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <p className="text-primary font-semibold text-sm mb-2 tracking-wider uppercase">Tim Kami</p>
          <h1 className="text-4xl md:text-5xl font-heading font-extrabold mb-4">
            Profesional yang <span className="font-accent text-primary text-6xl md:text-7xl">berdedikasi</span>
          </h1>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto leading-relaxed">
            Kami adalah psikolog anak yang siap mendampingi tumbuh kembang si kecil dengan pendekatan hangat, empatik, dan berbasis bukti klinis.
          </p>
        </div>
      </section>

      <section className="px-4 sm:px-6 lg:px-8 pb-20">
        <div className="max-w-5xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-text-secondary">
              <Loader2 className="animate-spin mr-2" size={20} /> Memuat profil tim…
            </div>
          ) : (
            <motion.div
              className={`grid grid-cols-1 gap-8 md:gap-10 ${staff.length >= 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}
              variants={stagger}
              initial="hidden"
              animate="visible"
            >
              {staff.map((s, idx) => (
                <motion.article
                  key={s.id}
                  variants={fadeUp}
                  style={{ rotate: idx % 2 === 0 ? -1 : 1 }}
                  whileHover={{ rotate: 0, y: -4 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  className="bg-white rounded-[2rem] overflow-hidden border border-black/5 shadow-warm"
                >
                  <div className="aspect-[4/5] bg-black/5">
                    {s.photo_url ? (
                      <img
                        src={s.photo_url}
                        alt={`Foto ${s.title}`}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-text-secondary/40">
                        <Users size={48} />
                      </div>
                    )}
                  </div>
                  <div className="p-6 md:p-7">
                    <p className="text-xs uppercase tracking-wider text-primary font-semibold mb-1">
                      {s.role_label || (s.title.toLowerCase().includes("terapis") || !s.title.toLowerCase().includes("psikolog") ? "Terapis Anak" : "Psikolog Anak")}
                    </p>
                    <h3 className="font-heading font-bold text-2xl mb-2">{s.title}</h3>
                    {s.campus && (
                      <p className="text-xs text-text-secondary mb-2 inline-flex items-center gap-1">
                        <GraduationCap size={12} className="text-primary" /> Lulusan {s.campus}
                      </p>
                    )}
                    {s.str_number && (
                      <p className="text-xs text-text-secondary mb-3 inline-flex items-center gap-1">
                        <Award size={12} className="text-primary" />
                        STR {s.str_number}
                      </p>
                    )}
                    {s.bio && <p className="text-sm text-text-secondary leading-relaxed mb-4">{s.bio}</p>}
                    {s.specialties?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {s.specialties.map((sp) => (
                          <span
                            key={sp}
                            className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary font-medium"
                          >
                            {sp}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {s.is_bookable_online && (
                        <a href={BOOKING_ONLINE_URL} className="text-xs px-4 py-2 rounded-full bg-primary text-white font-semibold hover:bg-primary-hover">
                          Booking dengan {s.title.split(/[ ,]/)[0]}
                        </a>
                      )}
                      <button onClick={() => setCv(s)} className="text-xs px-4 py-2 rounded-full border-2 border-primary text-primary font-semibold hover:bg-primary/10">
                        Lihat profil
                      </button>
                    </div>
                    {/* Polaroid signature */}
                    <div className="mt-5 pt-4 border-t border-black/5">
                      <span className="font-accent text-2xl text-text-secondary/70">{s.title.split(" ")[0]}</span>
                    </div>
                  </div>
                </motion.article>
              ))}
            </motion.div>
          )}
        </div>
      </section>

      {/* Kepercayaan */}
      <section className="relative py-16 md:py-20 px-4 sm:px-6 lg:px-8">
        <div className="blob blob-sage w-[280px] h-[280px] top-10 right-1/4" />

        <div className="relative z-10 max-w-5xl mx-auto">
          <motion.div className="text-center mb-10" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <p className="text-primary font-semibold text-sm mb-2 tracking-wider uppercase">Kepercayaan</p>
            <h2 className="text-3xl md:text-4xl font-heading font-bold">
              Alasan Anda bisa <span className="font-accent text-primary text-5xl md:text-6xl">percaya</span> kepada kami
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-center">
            {[
              { icon: Award, title: "Lisensi Resmi", desc: "Seluruh psikolog kami memiliki STR (Surat Tanda Registrasi) aktif dan berlisensi resmi." },
              { icon: GraduationCap, title: "Berpengalaman", desc: "Berpengalaman menangani berbagai kasus tumbuh kembang anak, mulai dari asesmen hingga intervensi." },
              { icon: Sparkles, title: "Empatis", desc: "Membangun kepercayaan bersama anak dan orang tua melalui pendekatan yang hangat dan sabar." },
            ].map((k) => (
              <div key={k.title} className="bg-white rounded-3xl p-6 border border-black/5 shadow-warm-sm">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                  <k.icon size={26} />
                </div>
                <h3 className="font-heading font-bold text-lg mb-1">{k.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{k.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      {cv && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setCv(null)}>
          <div className="bg-white rounded-[2rem] max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 shadow-warm-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-4 mb-4">
              {cv.photo_url ? (
                <img src={cv.photo_url} alt={cv.title} className="w-20 h-20 rounded-2xl object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-black/5 flex items-center justify-center text-text-secondary/40"><Users size={28} /></div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs uppercase tracking-wider text-primary font-semibold">{cv.role_label || "Tim FlourishCare"}</p>
                <h3 className="font-heading font-bold text-xl">{cv.title}</h3>
                {cv.campus && <p className="text-xs text-text-secondary">Lulusan {cv.campus}</p>}
              </div>
              <button onClick={() => setCv(null)} className="p-1 hover:bg-black/5 rounded-full" aria-label="Tutup"><X size={18} /></button>
            </div>
            {cv.bio && <p className="text-sm text-text-secondary leading-relaxed mb-4">{cv.bio}</p>}
            {[
              ["Pendidikan", cv.education],
              ["Izin praktik", cv.str_number],
              ["Sertifikasi", cv.certifications],
              ["Pengalaman", cv.experience],
              ["Fokus", cv.focus],
            ].filter(([, v]) => v).map(([l, v]) => (
              <div key={l as string} className="mb-3">
                <p className="text-xs font-semibold text-primary uppercase tracking-wider">{l}</p>
                <p className="text-sm whitespace-pre-line">{v}</p>
              </div>
            ))}
            {cv.specialties?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {cv.specialties.map((sp) => <span key={sp} className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary font-medium">{sp}</span>)}
              </div>
            )}
            {cv.instagram && (
              <a href={`https://instagram.com/${cv.instagram.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary inline-flex items-center gap-1 hover:underline">
                <Instagram size={14} /> @{cv.instagram.replace(/^@/, "")}
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
