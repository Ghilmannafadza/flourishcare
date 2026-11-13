import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Star,
  Users,
  Activity,
  Brain,
  MessageSquare,
  HeartHandshake,
  GraduationCap,
  Smile,
  Building2,
  Stethoscope,
  Video,
  ArrowUpRight,
  CheckCircle2,
  Instagram,
  Heart,
  ClipboardCheck,
  Sparkles,
  Puzzle,
  HandHeart,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { fadeUp, stagger } from "@/lib/motion";
import { supabase } from "@/lib/supabase";
import {
  BOOKING_ONLINE_STATUS,
  CLINIC_ADDRESS,
  CLINIC_MAPS_URL,
  SOCIAL,
} from "@/config/constants";

type GalleryImage = { id: string; url: string; alt: string };

interface InstagramPost {
  id: string | number;
  image: string;
  url: string;
}

// Fallback foto Pinterest untuk bento galeri Instagram (dipakai bila Curator.io feed kosong)
const IG_FALLBACK: InstagramPost[] = [
  { id: 1, image: "https://i.pinimg.com/736x/b1/ea/4d/b1ea4d486af624e510e9fc13791843ae.jpg", url: SOCIAL.instagram },
  { id: 2, image: "https://i.pinimg.com/736x/a0/6b/7f/a06b7f1cb2de748885a65918d11c6a91.jpg", url: SOCIAL.instagram },
  { id: 3, image: "https://i.pinimg.com/736x/3b/d2/cb/3bd2cb81b8e012b588d72e1250d893bb.jpg", url: SOCIAL.instagram },
  { id: 4, image: "https://i.pinimg.com/1200x/d4/d0/a2/d4d0a26da2bfe6ee86f485332d7cbaaf.jpg", url: SOCIAL.instagram },
  { id: 5, image: "https://i.pinimg.com/736x/5e/73/8f/5e738f21883a045057d345c8b5428e08.jpg", url: SOCIAL.instagram },
];

// Foto galeri kegiatan (fallback bila tabel `gallery` di Supabase kosong)
const GALLERY_FALLBACK: GalleryImage[] = [
  { id: "g1", url: "https://images.unsplash.com/photo-1560264280-88b68371db39?w=800&auto=format&fit=crop", alt: "Sesi terapi wicara anak" },
  { id: "g2", url: "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=800&auto=format&fit=crop", alt: "Aktivitas sensori integrasi" },
  { id: "g3", url: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800&auto=format&fit=crop", alt: "Konsultasi psikolog dengan orang tua" },
  { id: "g4", url: "https://images.unsplash.com/photo-1587560699334-cc4ff634909a?w=800&auto=format&fit=crop", alt: "Anak bermain edukatif" },
  { id: "g5", url: "https://images.unsplash.com/photo-1596464716127-f2a82984de30?w=800&auto=format&fit=crop", alt: "Ruangan terapi ramah anak" },
  { id: "g6", url: "https://images.unsplash.com/photo-1503917988258-f87a78e3c995?w=800&auto=format&fit=crop", alt: "Aktivitas okupasi terapi" },
  { id: "g7", url: "https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=800&auto=format&fit=crop", alt: "Anak dan terapis" },
  { id: "g8", url: "https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=800&auto=format&fit=crop", alt: "Momen di klinik FlourishCare" },
];

const HERO_BADGES = [
  "Terapis Berlisensi & Berpengalaman",
  "Tim Bersertifikasi STR",
  "Klinik Terpercaya di Jakarta Timur",
];

const CHALLENGES = [
  {
    icon: MessageSquare,
    title: "Keterlambatan Bicara",
    desc: "Anak belum lancar bicara atau memiliki kosakata terbatas sesuai usianya. Kami membantu memicu kemampuan bicara melalui pendekatan terapi wicara yang menyenangkan dan berbasis bukti.",
  },
  {
    icon: Activity,
    title: "ADHD & Kesulitan Fokus",
    desc: "Anak sulit fokus, mudah teralihkan, atau memiliki tingkat aktivitas yang tinggi. Tim kami merancang program untuk membantu regulasi perhatian dan perilaku secara bertahap.",
  },
  {
    icon: Brain,
    title: "Autism Spectrum (ASD)",
    desc: "Tantangan dalam interaksi sosial, komunikasi, dan pola perilaku berulang. Kami mendampingi anak dengan pendekatan individual sesuai spektrum kebutuhannya.",
  },
  {
    icon: GraduationCap,
    title: "Kesulitan Belajar",
    desc: "Membutuhkan pendekatan khusus untuk membaca, menulis, atau berhitung. Psikolog kami mengidentifikasi akar kesulitan dan menyusun strategi belajar yang tepat.",
  },
  {
    icon: HeartHandshake,
    title: "Gangguan Motorik",
    desc: "Kesulitan koordinasi motorik halus (menulis, memegang) atau motorik kasar (berlari, keseimbangan). Okupasi terapi kami melatih kemandirian aktivitas sehari-hari.",
  },
  {
    icon: Smile,
    title: "Kecemasan & Regulasi Emosi",
    desc: "Anak butuh dukungan mengelola rasa cemas, tantrum, atau emosi yang meluap. Kami menciptakan ruang aman untuk membantu anak belajar mengenali dan mengelola emosinya.",
  },
];

const SERVICES = [
  {
    icon: Building2,
    title: "Terapi On-Site",
    desc: "Sesi terapi anak (SI, TW, OT, BT) yang dilakukan langsung di klinik. Ruangan didesain ramah anak dengan peralatan lengkap untuk mendukung berbagai jenis intervensi.",
    tag: "Di Klinik",
    to: "/services#onsite",
  },
  {
    icon: Stethoscope,
    title: "Konsultasi Psikolog On-Site",
    desc: "Konsultasi tatap muka bersama psikolog anak untuk asesmen awal, arahan program terapi, konseling parenting, atau evaluasi berkala perkembangan anak.",
    tag: "Di Klinik",
    to: "/services#psikolog",
  },
  {
    icon: Video,
    title: "Konsultasi Psikolog Online",
    desc: "Sesi konsultasi jarak jauh yang fleksibel, cocok untuk orang tua yang membutuhkan arahan cepat, konsultasi lanjutan, atau berdomisili di luar Jakarta.",
    tag: BOOKING_ONLINE_STATUS === "live" ? "Online" : "Opening Soon",
    to: "/booking",
  },
  {
    icon: Brain,
    title: "Psikotes & Assessment",
    desc: "Layanan asesmen menyeluruh: Tes IQ, kesiapan sekolah, evaluasi perkembangan, dan diagnosa profesional oleh psikolog berlisensi.",
    tag: "Di Klinik",
    to: "/services#psikotes",
  },
];

const THERAPIES = [
  { code: "TW", icon: MessageSquare, title: "Terapi Wicara", desc: "Merangsang kemampuan komunikasi verbal & non-verbal." },
  { code: "SI", icon: Puzzle, title: "Sensori Integrasi", desc: "Membantu anak mengolah stimulasi sensorik dengan tepat." },
  { code: "OT", icon: HandHeart, title: "Okupasi Terapi", desc: "Melatih kemandirian aktivitas sehari-hari & motorik." },
  { code: "BT", icon: Wand2, title: "Behavioral Therapy", desc: "Membentuk perilaku positif dengan pendekatan berbasis bukti." },
];

const HOW_STEPS = [
  {
    step: "01",
    icon: MessageSquare,
    title: "Konsultasi Awal",
    desc: "Datang ke Klinik Mitra Diani untuk sesi awal bersama psikolog kami. Kami mendengarkan cerita Anda dan memahami tantangan yang dihadapi si kecil.",
  },
  {
    step: "02",
    icon: ClipboardCheck,
    title: "Asesmen Menyeluruh",
    desc: "Psikolog melakukan asesmen komprehensif untuk memahami kebutuhan spesifik anak, mulai dari perkembangan bicara, motorik, sensori, hingga emosi.",
  },
  {
    step: "03",
    icon: Sparkles,
    title: "Rencana Terapi Individual",
    desc: "Tim kami menyusun rencana terapi yang disesuaikan dengan kondisi, usia, dan target anak. Orang tua terlibat penuh dalam penyusunan rencana.",
  },
  {
    step: "04",
    icon: Heart,
    title: "Sesi Terapi Berkala",
    desc: "Anak menjalani sesi terapi (SI, TW, OT, BT, atau kombinasi) di klinik dengan pendekatan yang hangat, sabar, dan menyenangkan.",
  },
  {
    step: "05",
    icon: Activity,
    title: "Evaluasi & Progress Digital",
    desc: "Perkembangan anak dievaluasi secara berkala. Orang tua dapat memantau progres online melalui halaman Progress Layanan kami.",
  },
];

export function Homepage() {
  const [igPosts, setIgPosts] = useState<InstagramPost[]>([]);
  const [gallery, setGallery] = useState<GalleryImage[]>([]);

  // Fetch Instagram feed dari Curator.io : fallback ke IG_FALLBACK bila gagal
  useEffect(() => {
    let cancelled = false;
    fetch("https://api.curator.io/v1/feeds/9881e444-26c0-4abf-8a1b-c94e7456fa9d/posts")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data && data.posts && data.posts.length > 0) {
          // Filter: hanya foto/album, buang video
          const photosOnly = (data.posts as Array<{ id: string | number; type?: string; image_large?: string; image?: string; url?: string; video?: string; video_url?: string }>)
            .filter((p) => p.type !== "video" && !p.video && !p.video_url)
            .filter((p) => Boolean(p.image_large || p.image))
            .slice(0, 5)
            .map((p) => ({
              id: p.id,
              image: p.image_large || p.image || "",
              url: p.url || SOCIAL.instagram,
            }));
          setIgPosts(photosOnly.length > 0 ? photosOnly : IG_FALLBACK);
        } else {
          setIgPosts(IG_FALLBACK);
        }
      })
      .catch(() => {
        if (!cancelled) setIgPosts(IG_FALLBACK);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch galeri kegiatan dari tabel `gallery` di Supabase : fallback ke GALLERY_FALLBACK
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("gallery")
        .select("id,url,alt")
        .order("display_order", { ascending: true })
        .limit(8);
      if (cancelled) return;
      if (!error && data && data.length > 0) {
        setGallery(data as GalleryImage[]);
      } else {
        setGallery(GALLERY_FALLBACK);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const displayPosts = igPosts.length > 0 ? igPosts : IG_FALLBACK;

  return (
    <div className="flex flex-col w-full overflow-hidden">
      {/* HERO */}
      <section className="relative pt-10 pb-16 lg:pt-20 lg:pb-24 px-4 sm:px-6 lg:px-8">
        <div className="blob blob-peach w-[420px] h-[420px] -top-20 -right-20" />
        <div className="blob blob-lavender w-[380px] h-[380px] top-40 -left-24" />
        <div className="blob blob-sage w-[300px] h-[300px] top-1/3 left-1/2 -translate-x-1/2" />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <p className="text-primary font-semibold text-sm mb-3 tracking-wider uppercase">Layanan Tumbuh Kembang Anak · Jakarta Timur</p>
          <motion.h1
            className="text-4xl sm:text-5xl lg:text-6xl font-heading font-extrabold text-text-primary leading-[1.05] mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Setiap Anak Berhak <span className="text-primary">Tumbuh </span>
            <span className="font-accent text-primary text-6xl sm:text-7xl lg:text-8xl leading-none">
              Sepenuhnya
            </span>
          </motion.h1>

          <motion.p
            className="text-lg sm:text-xl text-text-secondary mb-8 max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            FlourishCare bukan hanya tentang tumbuh hari ini, tetapi tentang membuka jalan agar setiap anak dapat melangkah lebih jauh dan bersinar dengan caranya sendiri.
          </motion.p>

          <motion.div
            className="flex flex-wrap justify-center gap-3 sm:gap-4 mb-8 max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            {HERO_BADGES.map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm font-medium text-text-primary bg-white/70 backdrop-blur rounded-full px-4 py-2 border border-black/5 shadow-warm-sm">
                <CheckCircle2 size={14} className="text-primary flex-shrink-0" />
                {item}
              </div>
            ))}
          </motion.div>

          <motion.div
            className="flex items-center justify-center gap-2 mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex text-yellow">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={18} fill="currentColor" />
              ))}
            </div>
            <span className="text-sm text-text-secondary">
              <span className="font-semibold text-text-primary">4.9/5</span> dari puluhan keluarga di Jakarta Timur
            </span>
          </motion.div>

          <motion.div
            className="flex flex-col sm:flex-row justify-center gap-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Button asChild size="lg" className="rounded-full px-8 shadow-warm">
              <Link to="/booking">Kunjungi Klinik</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-full px-8 border-2">
              <Link to="/progress">Cek Progress Anak</Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* INSTAGRAM BENTO GALLERY */}
      <section className="relative pb-16 md:pb-20 px-4 sm:px-6 lg:px-8">
        <div className="relative z-10 max-w-6xl mx-auto">
          <motion.div
            className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-8"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <div>
              <p className="text-primary font-semibold text-sm mb-2 tracking-wider uppercase">Momen di Klinik</p>
              <h2 className="text-3xl md:text-4xl font-heading font-bold">
                Ikuti keseharian <span className="font-accent text-primary text-5xl md:text-6xl">kami</span>
              </h2>
            </div>
            <a
              href={SOCIAL.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-primary font-semibold text-sm hover:gap-3 transition-all"
            >
              <Instagram size={18} /> @flourishcare.id
            </a>
          </motion.div>

          {/* Bento grid: 1 large left + 4 small right */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {displayPosts.slice(0, 5).map((post, i) => (
              <a
                key={post.id}
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`group relative overflow-hidden rounded-3xl bg-black/5 border border-black/5 ${
                  i === 0 ? "col-span-2 row-span-2 aspect-square md:aspect-auto" : "aspect-square"
                }`}
              >
                <img
                  src={post.image}
                  alt={`Postingan Instagram FlourishCare ${i + 1}`}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                  <Instagram className="text-white" size={20} />
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* NILAI & KEUNGGULAN : Bento Grid */}
      <section className="relative py-16 md:py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="blob blob-lavender w-[280px] h-[280px] top-10 right-10" />

        <div className="relative z-10 max-w-6xl mx-auto">
          <motion.div className="text-center mb-12" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <p className="text-primary font-semibold text-sm mb-2 tracking-wider uppercase">Nilai & Keunggulan</p>
            <h2 className="text-3xl md:text-4xl font-heading font-bold">
              Alasan keluarga <span className="font-accent text-primary text-5xl md:text-6xl">memilih</span> kami
            </h2>
          </motion.div>

          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5"
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {[
              { icon: Users, value: "Ratusan", label: "Keluarga Dipercaya", desc: "Menemani perjalanan tumbuh kembang anak Indonesia." },
              { icon: Activity, value: "4", label: "Jenis Terapi Komprehensif", desc: "SI, TW, OT, dan BT dengan pendekatan yang disesuaikan." },
              { icon: HeartHandshake, value: "STR", label: "Terapis Bersertifikat", desc: "Seluruh tim memiliki Surat Tanda Registrasi aktif." },
              { icon: Stethoscope, value: "1 Klinik", label: "di Jakarta Timur", desc: "Berlokasi strategis di Klinik Mitra Diani, Ciracas." },
            ].map((s) => (
              <motion.div
                key={s.label}
                variants={fadeUp}
                className="bg-white rounded-3xl p-6 border border-black/5 shadow-warm-sm"
              >
                <div className="w-11 h-11 mb-4 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <s.icon size={20} />
                </div>
                <p className="text-2xl md:text-3xl font-heading font-extrabold text-text-primary">{s.value}</p>
                <p className="text-sm font-semibold text-text-primary mt-1">{s.label}</p>
                <p className="text-xs text-text-secondary mt-2 leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* 6 TANTANGAN TUMBUH KEMBANG */}
      <section className="relative py-16 md:py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="blob blob-sage w-[300px] h-[300px] -top-10 -left-10" />

        <div className="relative z-10 max-w-6xl mx-auto">
          <motion.div className="text-center mb-12" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <p className="text-primary font-semibold text-sm mb-2 tracking-wider uppercase">Tantangan Tumbuh Kembang</p>
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-3">
              Kami memahami <span className="font-accent text-primary text-5xl md:text-6xl">perjalanan</span> Anda
            </h2>
            <p className="text-text-secondary max-w-2xl mx-auto">
              Setiap anak unik, dan setiap tantangan tumbuh kembang punya solusi terapi yang tepat. Berikut area yang paling sering kami dampingi.
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {CHALLENGES.map((c) => (
              <motion.div
                key={c.title}
                variants={fadeUp}
                className="bg-white rounded-3xl p-6 border border-black/5 shadow-warm-sm hover:shadow-warm transition-shadow"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <c.icon size={22} />
                </div>
                <h3 className="font-heading font-bold text-lg mb-2">{c.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{c.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* 4 PILIHAN LAYANAN */}
      <section className="relative py-16 md:py-24 px-4 sm:px-6 lg:px-8">
        <div className="blob blob-peach w-[320px] h-[320px] top-20 right-0" />

        <div className="relative z-10 max-w-6xl mx-auto">
          <motion.div className="text-center mb-12" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <p className="text-primary font-semibold text-sm mb-2 tracking-wider uppercase">Pilihan Layanan</p>
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-3">
              Pendampingan yang <span className="font-accent text-primary text-5xl md:text-6xl">tepat</span>
            </h2>
            <p className="text-text-secondary max-w-2xl mx-auto">
              Kami menyediakan beragam layanan untuk memenuhi kebutuhan tumbuh kembang anak Anda, mulai dari terapi klinis hingga konsultasi psikolog online.
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 gap-5"
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {SERVICES.map((s) => (
              <motion.div
                key={s.title}
                variants={fadeUp}
                className="bg-white rounded-3xl p-6 md:p-7 border border-black/5 shadow-warm-sm flex flex-col hover:shadow-warm transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                    <s.icon size={22} />
                  </div>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${s.tag === "Opening Soon" ? "bg-secondary/20 text-secondary" : "bg-primary/10 text-primary"}`}>
                    {s.tag}
                  </span>
                </div>
                <h3 className="font-heading font-bold text-lg mb-2">{s.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed flex-grow">{s.desc}</p>
                <Link
                  to={s.to}
                  className="mt-5 inline-flex items-center gap-1 text-primary font-semibold text-sm hover:gap-2 transition-all"
                >
                  Selengkapnya <ArrowUpRight size={16} />
                </Link>
              </motion.div>
            ))}
          </motion.div>

          {/* 4 Jenis Terapi (chip strip) */}
          <div className="mt-12 bg-white rounded-3xl p-6 md:p-8 border border-black/5 shadow-warm-sm">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={16} className="text-primary" />
              <p className="text-sm font-semibold text-text-primary">4 Jenis Terapi Komprehensif yang Kami Sediakan</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {THERAPIES.map((t) => (
                <div key={t.code} className="p-4 rounded-2xl bg-background border border-black/5">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <t.icon size={16} />
                    </div>
                    <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">{t.code}</span>
                  </div>
                  <h4 className="font-heading font-bold text-sm mb-1">{t.title}</h4>
                  <p className="text-xs text-text-secondary leading-relaxed">{t.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS : 5 langkah */}
      <section className="relative py-16 md:py-24 px-4 sm:px-6 lg:px-8">
        <div className="blob blob-lavender w-[280px] h-[280px] top-1/2 left-1/4" />

        <div className="relative z-10 max-w-6xl mx-auto">
          <motion.div className="text-center mb-12" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <p className="text-primary font-semibold text-sm mb-2 tracking-wider uppercase">Alur Layanan</p>
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-3">
              Bagaimana kami <span className="font-accent text-primary text-5xl md:text-6xl">mendampingi</span>
            </h2>
            <p className="text-text-secondary max-w-2xl mx-auto">
              5 langkah sederhana untuk memulai perjalanan tumbuh kembang si kecil bersama kami.
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4"
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {HOW_STEPS.map((h) => (
              <motion.div
                key={h.step}
                variants={fadeUp}
                className="bg-white rounded-3xl p-5 border border-black/5 shadow-warm-sm relative"
              >
                <p className="text-4xl font-heading font-extrabold text-primary/25 leading-none mb-2">{h.step}</p>
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                  <h.icon size={18} />
                </div>
                <h3 className="font-heading font-bold text-base mb-2">{h.title}</h3>
                <p className="text-xs text-text-secondary leading-relaxed">{h.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* GALERI KEGIATAN : 8 foto */}
      <section className="relative py-16 md:py-20 px-4 sm:px-6 lg:px-8">
        <div className="relative z-10 max-w-6xl mx-auto">
          <motion.div className="text-center mb-10" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <p className="text-primary font-semibold text-sm mb-2 tracking-wider uppercase">Galeri Kegiatan</p>
            <h2 className="text-3xl md:text-4xl font-heading font-bold">
              Suasana <span className="font-accent text-primary text-5xl md:text-6xl">hangat</span> di klinik kami
            </h2>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {gallery.slice(0, 8).map((g) => (
              <div
                key={g.id}
                className="aspect-square rounded-3xl overflow-hidden bg-black/5 border border-black/5 hover:shadow-warm transition-shadow"
              >
                <img
                  src={g.url}
                  alt={g.alt}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ALAMAT KLINIK : CTA FINAL */}
      <section className="relative py-16 md:py-24 px-4 sm:px-6 lg:px-8">
        <div className="blob blob-peach w-[380px] h-[380px] top-10 -right-16" />
        <div className="blob blob-sage w-[300px] h-[300px] bottom-0 -left-10" />

        <div className="relative z-10 max-w-3xl mx-auto bg-white rounded-[2.5rem] p-8 md:p-12 border border-black/5 shadow-warm-lg text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
            <Heart size={24} />
          </div>
          <p className="text-primary font-semibold text-sm mb-2 tracking-wider uppercase">Kunjungi Kami</p>
          <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
            Mulai perjalanan tumbuh kembang{" "}
            <span className="font-accent text-primary text-5xl md:text-6xl">hari ini</span>
          </h2>
          <p className="text-text-secondary max-w-xl mx-auto mb-6 leading-relaxed">
            Kami menantikan kunjungan Anda dan si kecil di klinik kami. Datang langsung untuk konsultasi awal, atau cek progress anak Anda secara online.
          </p>
          <p className="text-sm text-text-secondary mb-6">
            📍 {CLINIC_ADDRESS}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Button asChild size="lg" className="rounded-full px-8 shadow-warm">
              <a href={CLINIC_MAPS_URL} target="_blank" rel="noopener noreferrer">
                Petunjuk Arah
              </a>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-full px-8 border-2">
              <Link to="/progress">Cek Progress Anak</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
