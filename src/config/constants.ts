// Konstanta global brand & konfigurasi.
// Values yang bisa berbeda per environment memakai import.meta.env.

export const BRAND_NAME = "FlourishCare.id";
export const BRAND_TAGLINE = "Tumbuh Bersama, Flourish Sepenuhnya";

// Logo lokal , file ada di /public/logo.png
export const LOGO_URL = "/logo.png";

// Kontak & alamat
export const CONTACT_EMAIL = "Flourishcare.id@gmail.com";
export const CLINIC_NAME = "Klinik Mitra Diani";
export const CLINIC_ADDRESS =
  "Klinik Mitra Diani Lantai 2, Jl. PKP Raya No.1, Kelapa Dua Wetan, Ciracas, Jakarta Timur";
export const CLINIC_MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=" +
  encodeURIComponent("Klinik Mitra Diani, Jl. PKP Raya No.1, Kelapa Dua Wetan, Ciracas, Jakarta Timur");

// Sosial media
export const SOCIAL = {
  instagram:
    import.meta.env.VITE_SOCIAL_INSTAGRAM ?? "https://instagram.com/flourishcare.id",
  threads:
    import.meta.env.VITE_SOCIAL_THREADS ?? "https://www.threads.com/@flourishcare.id",
  tiktok:
    import.meta.env.VITE_SOCIAL_TIKTOK ?? "https://www.tiktok.com/@flourishcare.id",
};

// Booking online (konsultasi psikolog online, subdomain terpisah)
export const BOOKING_ONLINE_URL =
  import.meta.env.VITE_BOOKING_ONLINE_URL ?? "https://book.flourishcare.id/";
export const BOOKING_ONLINE_STATUS: "coming_soon" | "live" =
  (import.meta.env.VITE_BOOKING_ONLINE_STATUS as "coming_soon" | "live") ??
  "coming_soon";

// Legal
export const COPYRIGHT_YEAR_START = 2026; // PM: FlourishCare didirikan 2026
