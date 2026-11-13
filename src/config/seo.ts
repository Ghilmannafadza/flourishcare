// Konfigurasi SEO & GEO terpusat.
// Dipakai di dua tempat:
//   1) vite.config.ts  : membuat HTML statis per halaman (dist/<path>/index.html) berisi
//      meta tag, kartu share (Open Graph), JSON-LD, dan ringkasan teks untuk crawler
//      yang tidak menjalankan JavaScript (WhatsApp, Facebook, X, crawler AI).
//   2) <Seo /> di aplikasi : memperbarui judul & meta saat pindah halaman.
// Catatan: jangan pakai em dash di teks yang tampil di kartu share.

export const SITE_URL = "https://flourishcare.id";
export const SITE_NAME = "FlourishCare.id";
export const DEFAULT_OG = "/og/og-home.jpg";
export const THEME_COLOR = "#F29935";

export type RouteSeo = {
  path: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  /** Teks ringkas yang dibaca crawler non-JS (Markdown sederhana: baris "- " jadi list). */
  summary: string[];
  noindex?: boolean;
  changefreq?: "weekly" | "monthly";
  priority?: number;
};

const ADDRESS_LINE =
  "Klinik Mitra Diani Lantai 2, Jl. PKP Raya No.1, Kelapa Dua Wetan, Ciracas, Jakarta Timur";

export const ROUTES: RouteSeo[] = [
  {
    path: "/",
    title: "FlourishCare.id | Klinik Tumbuh Kembang Anak di Jakarta Timur",
    description:
      "Klinik tumbuh kembang anak di Ciracas, Jakarta Timur. Terapi wicara, sensori integrasi, okupasi terapi, behavioral therapy, psikotes, dan konsultasi psikolog anak.",
    image: "/og/og-home.jpg",
    imageAlt: "FlourishCare: Setiap Anak Berhak Tumbuh Sepenuhnya",
    priority: 1,
    changefreq: "weekly",
    summary: [
      "# FlourishCare.id: Klinik Tumbuh Kembang Anak di Jakarta Timur",
      "FlourishCare adalah layanan tumbuh kembang anak yang berpraktik di " + ADDRESS_LINE + ".",
      "Kami mendampingi anak dengan keterlambatan bicara, ADHD dan kesulitan fokus, autism spectrum (ASD), kesulitan belajar, gangguan motorik, serta kecemasan dan regulasi emosi.",
      "## Layanan",
      "- Terapi Wicara (TW): untuk keterlambatan bicara dan kesulitan komunikasi.",
      "- Sensori Integrasi (SI): membantu anak mengolah stimulasi sensorik.",
      "- Okupasi Terapi (OT): melatih kemandirian dan motorik halus maupun kasar.",
      "- Behavioral Therapy (BT): membentuk perilaku positif berbasis bukti.",
      "- Konsultasi psikolog anak di klinik dan online.",
      "- Psikotes dan asesmen: tes IQ, kesiapan sekolah, evaluasi perkembangan.",
    ],
  },
  {
    path: "/services",
    title: "Layanan Terapi Anak & Psikolog | FlourishCare.id",
    description:
      "Terapi wicara, sensori integrasi, okupasi terapi, behavioral therapy, psikotes, dan konsultasi psikolog anak di Klinik Mitra Diani, Ciracas, Jakarta Timur.",
    image: "/og/og-services.jpg",
    imageAlt: "Layanan FlourishCare: pendampingan tumbuh kembang yang komprehensif",
    priority: 0.9,
    changefreq: "monthly",
    summary: [
      "# Layanan FlourishCare",
      "Semua layanan terapi dilakukan on-site di " + ADDRESS_LINE + ".",
      "- Terapi Wicara: membantu keterlambatan bicara, gangguan artikulasi, dan kesulitan komunikasi verbal maupun non-verbal.",
      "- Sensori Integrasi: membantu anak mengolah stimulasi sentuhan, gerakan, keseimbangan, dan pendengaran.",
      "- Okupasi Terapi: melatih kemandirian sehari-hari serta keterampilan motorik halus dan kasar.",
      "- Behavioral Therapy: pendekatan ABA/behavior modification untuk anak dengan ADHD, ASD, atau tantangan perilaku.",
      "- Konsultasi Psikolog: asesmen awal, arahan program terapi, konseling parenting, evaluasi berkala.",
      "- Psikotes & Assessment: tes IQ, kesiapan sekolah, evaluasi perkembangan, dengan laporan tertulis.",
      "Alur: kontak awal, asesmen oleh psikolog, rencana terapi individual, lalu sesi dan evaluasi berkala.",
    ],
  },
  {
    path: "/team",
    title: "Tim Psikolog & Terapis Anak | FlourishCare.id",
    description:
      "Kenali psikolog dan terapis anak FlourishCare yang berlisensi, bersertifikasi STR, dan mendampingi dengan pendekatan hangat dan berbasis bukti.",
    image: "/og/og-team.jpg",
    imageAlt: "Tim FlourishCare: profesional yang berdedikasi",
    priority: 0.7,
    changefreq: "monthly",
    summary: [
      "# Tim FlourishCare",
      "Psikolog anak dan terapis berlisensi serta bersertifikasi STR yang mendampingi tumbuh kembang anak dengan pendekatan hangat, empatik, dan berbasis bukti klinis.",
    ],
  },
  {
    path: "/about",
    title: "Tentang FlourishCare.id | Layanan Tumbuh Kembang Anak",
    description:
      "Cerita dan nilai FlourishCare: empati, kualitas, kolaborasi dengan orang tua, dan transparansi dalam mendampingi tumbuh kembang anak.",
    image: "/og/og-about.jpg",
    imageAlt: "Tentang FlourishCare: berawal dari kepedulian",
    priority: 0.6,
    changefreq: "monthly",
    summary: [
      "# Tentang FlourishCare",
      "FlourishCare berawal dari kepedulian dan tumbuh menjadi solusi pendampingan tumbuh kembang anak di Jakarta Timur.",
      "- Empati: setiap anak dan orang tua adalah bagian dari keluarga kami.",
      "- Kualitas: terapi berbasis bukti oleh tim profesional.",
      "- Kolaborasi: terapis, psikolog, dan orang tua bekerja sebagai satu tim.",
      "- Transparansi: rencana terapi dan progres anak terbuka untuk orang tua.",
    ],
  },
  {
    path: "/booking",
    title: "Info Kunjungan & Lokasi Klinik | FlourishCare.id",
    description:
      "Lokasi FlourishCare: Klinik Mitra Diani Lantai 2, Jl. PKP Raya No.1, Kelapa Dua Wetan, Ciracas, Jakarta Timur. Info kunjungan, layanan, dan cara mendaftar.",
    image: "/og/og-booking.jpg",
    imageAlt: "Kunjungi klinik FlourishCare di Jakarta Timur",
    priority: 0.8,
    changefreq: "monthly",
    summary: [
      "# Info Kunjungan FlourishCare",
      "Alamat: " + ADDRESS_LINE + ".",
      "Sebelum kunjungan pertama, isi formulir pendaftaran di flourishcare.id/assessment.",
      "Konsultasi psikolog online dapat dibooking di flourishcare.id/book.",
    ],
  },
  {
    path: "/book",
    title: "Booking Konsultasi Psikolog Anak Online | FlourishCare.id",
    description:
      "Booking konsultasi psikolog anak secara online. Pilih psikolog dan jadwal, bayar dengan QRIS, lalu sesi lewat video call dari rumah.",
    image: "/og/og-book.jpg",
    imageAlt: "Booking online: konsultasi psikolog anak dari rumah",
    priority: 0.9,
    changefreq: "weekly",
    summary: [
      "# Booking Konsultasi Psikolog Anak Online",
      "- Buat akun atau masuk dengan Google.",
      "- Isi profil anak, pilih psikolog dan jadwal.",
      "- Bayar dengan QRIS (semua e-wallet dan m-banking).",
      "- Sesi konsultasi berlangsung lewat video call.",
    ],
  },
  {
    path: "/assessment",
    title: "Formulir Pendaftaran Pasien | FlourishCare.id",
    description:
      "Daftarkan anak secara online sebelum kunjungan pertama ke FlourishCare di Klinik Mitra Diani, Jakarta Timur, agar sesi pertama lebih cepat dan terarah.",
    image: "/og/og-assessment.jpg",
    imageAlt: "Formulir pendaftaran: daftarkan si kecil sebelum datang",
    priority: 0.8,
    changefreq: "monthly",
    summary: [
      "# Formulir Pendaftaran Pasien FlourishCare",
      "Isi data anak dan keluhan utama secara online sebelum kunjungan pertama ke klinik. Admin akan menghubungi orang tua untuk menjadwalkan sesi.",
    ],
  },
  {
    path: "/progress",
    title: "Portal Perkembangan Anak | FlourishCare.id",
    description:
      "Portal orang tua FlourishCare untuk melihat laporan sesi terapi dan perkembangan anak kapan saja.",
    image: "/og/og-progress.jpg",
    imageAlt: "Portal orang tua: pantau tumbuh kembang si kecil",
    priority: 0.4,
    changefreq: "monthly",
    summary: [
      "# Portal Perkembangan Anak",
      "Orang tua pasien dapat melihat laporan sesi terapi dan perkembangan anak secara aman.",
    ],
  },
  // Halaman privat: tetap punya kartu share, tapi tidak diindeks.
  {
    path: "/login",
    title: "Masuk | FlourishCare.id",
    description: "Masuk ke akun FlourishCare untuk staf klinik dan orang tua pasien.",
    image: "/og/og-home.jpg",
    imageAlt: "FlourishCare.id",
    noindex: true,
    summary: ["# Masuk ke FlourishCare"],
  },
];

/** Prefix path privat yang tidak boleh diindeks mesin pencari. */
export const NOINDEX_PREFIXES = ["/dashboard", "/portal", "/login", "/book/profile", "/book/schedule", "/book/payment", "/book/success", "/book/cancel", "/assessment/success"];

export function seoFor(pathname: string): RouteSeo {
  const clean = pathname.replace(/\/+$/, "") || "/";
  const exact = ROUTES.find((r) => r.path === clean);
  if (exact) return exact;
  const parent = ROUTES.filter((r) => r.path !== "/" && clean.startsWith(r.path + "/")).sort(
    (a, b) => b.path.length - a.path.length
  )[0];
  return parent ?? ROUTES[0];
}

export function isNoindex(pathname: string): boolean {
  const clean = pathname.replace(/\/+$/, "") || "/";
  return NOINDEX_PREFIXES.some((p) => clean === p || clean.startsWith(p + "/"));
}

/** Data terstruktur (schema.org) untuk mesin pencari & mesin jawaban AI. */
export function structuredData() {
  const org = `${SITE_URL}/#clinic`;
  return [
    {
      "@context": "https://schema.org",
      "@type": ["MedicalClinic", "LocalBusiness"],
      "@id": org,
      name: "FlourishCare.id",
      alternateName: ["FlourishCare", "Flourish Care"],
      description:
        "Klinik tumbuh kembang anak di Jakarta Timur: terapi wicara, sensori integrasi, okupasi terapi, behavioral therapy, psikotes, dan konsultasi psikolog anak.",
      url: SITE_URL,
      logo: `${SITE_URL}/logo.png`,
      image: `${SITE_URL}/og/og-home.jpg`,
      email: "Flourishcare.id@gmail.com",
      slogan: "Tumbuh Bersama, Flourish Sepenuhnya",
      foundingDate: "2026",
      areaServed: [
        { "@type": "City", name: "Jakarta Timur" },
        { "@type": "AdministrativeArea", name: "DKI Jakarta" },
        { "@type": "Country", name: "Indonesia" },
      ],
      address: {
        "@type": "PostalAddress",
        streetAddress: "Klinik Mitra Diani Lantai 2, Jl. PKP Raya No.1, Kelapa Dua Wetan",
        addressLocality: "Ciracas, Jakarta Timur",
        addressRegion: "DKI Jakarta",
        postalCode: "13730",
        addressCountry: "ID",
      },
      hasMap:
        "https://www.google.com/maps/search/?api=1&query=Klinik%20Mitra%20Diani%2C%20Jl.%20PKP%20Raya%20No.1%2C%20Kelapa%20Dua%20Wetan%2C%20Ciracas%2C%20Jakarta%20Timur",
      medicalSpecialty: ["Pediatric", "Psychiatric", "SpeechPathology", "PhysicalTherapy"],
      knowsLanguage: ["id", "en"],
      sameAs: [
        "https://instagram.com/flourishcare.id",
        "https://www.threads.com/@flourishcare.id",
        "https://www.tiktok.com/@flourishcare.id",
      ],
      availableService: [
        ["Terapi Wicara", "Terapi untuk keterlambatan bicara, gangguan artikulasi, dan kesulitan komunikasi anak."],
        ["Sensori Integrasi", "Terapi untuk membantu anak mengolah stimulasi sensorik dengan tepat."],
        ["Okupasi Terapi", "Terapi untuk kemandirian aktivitas sehari-hari dan keterampilan motorik anak."],
        ["Behavioral Therapy", "Terapi perilaku berbasis bukti (ABA) untuk anak dengan ADHD, ASD, atau tantangan perilaku."],
        ["Konsultasi Psikolog Anak", "Konsultasi tatap muka dan online bersama psikolog anak."],
        ["Psikotes & Assessment", "Tes IQ, kesiapan sekolah, dan evaluasi perkembangan anak oleh psikolog berlisensi."],
      ].map(([name, description]) => ({ "@type": "MedicalTherapy", name, description })),
      potentialAction: [
        { "@type": "ReserveAction", name: "Booking konsultasi psikolog online", target: `${SITE_URL}/book` },
        { "@type": "RegisterAction", name: "Formulir pendaftaran pasien", target: `${SITE_URL}/assessment` },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: "FlourishCare.id",
      url: SITE_URL,
      inLanguage: "id-ID",
      publisher: { "@id": org },
    },
  ];
}
