import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Building2,
  Stethoscope,
  Brain,
  Video,
  MapPin,
  ExternalLink,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSetting } from "@/lib/settings";
import { formatWaDisplay, waLink } from "@/lib/wa";
import { fadeUp, stagger } from "@/lib/motion";
import {
  BOOKING_ONLINE_STATUS,
  BOOKING_ONLINE_URL,
  CLINIC_ADDRESS,
  CLINIC_MAPS_URL,
  CLINIC_NAME,
  CONTACT_EMAIL,
} from "@/config/constants";

type ServiceCard = {
  id: string;
  icon: typeof Building2;
  title: string;
  desc: string;
  variant: "onsite" | "online";
};

const CARDS: ServiceCard[] = [
  {
    id: "onsite-terapi",
    icon: Building2,
    title: "Terapi On-Site",
    desc: "Sesi terapi anak (SI, TW, OT, BT) dilakukan langsung di klinik bersama terapis kami.",
    variant: "onsite",
  },
  {
    id: "onsite-psikolog",
    icon: Stethoscope,
    title: "Konsultasi Psikolog On-Site",
    desc: "Konsultasi tatap muka bersama psikolog anak di klinik.",
    variant: "onsite",
  },
  {
    id: "onsite-psikotes",
    icon: Brain,
    title: "Psikotes & Assessment",
    desc: "Layanan tes IQ, kesiapan sekolah, dan asesmen diagnostik di klinik.",
    variant: "onsite",
  },
  {
    id: "online-psikolog",
    icon: Video,
    title: "Konsultasi Psikolog Online",
    desc: "Sesi konsultasi psikolog secara online melalui platform booking terpisah.",
    variant: "online",
  },
];

export function Booking() {
  const online = BOOKING_ONLINE_STATUS === "live";
  const { value: contact } = useSetting("contact");

  return (
    <div>
      <section className="relative pt-14 pb-12 md:pt-20 md:pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="blob blob-peach w-[380px] h-[380px] -top-16 -right-16" />
        <div className="blob blob-mist w-[300px] h-[300px] top-16 -left-16" />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <p className="text-primary font-semibold text-sm mb-2 tracking-wider uppercase">Info Kunjungan</p>
          <h1 className="text-4xl md:text-5xl font-heading font-extrabold mb-4">
            Kunjungi Klinik Kami di{" "}
            <span className="font-accent text-primary text-6xl md:text-7xl">Jakarta Timur</span>
          </h1>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            Semua layanan on-site dilakukan di {CLINIC_NAME}. Cek detail layanan dan alamat di bawah.
          </p>
        </div>
      </section>

      <section className="px-4 sm:px-6 lg:px-8 pb-16">
        <motion.div
          className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-5"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {CARDS.map((c) => (
            <motion.article
              key={c.id}
              variants={fadeUp}
              className="bg-white rounded-3xl p-6 md:p-8 border border-primary/10 shadow-warm-sm flex flex-col hover:shadow-warm transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <c.icon size={22} />
                </div>
                {c.variant === "online" && !online && (
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-secondary/20 text-secondary">
                    Opening Soon
                  </span>
                )}
              </div>

              <h3 className="font-heading font-bold text-xl mb-2">{c.title}</h3>
              <p className="text-sm text-text-secondary leading-relaxed mb-5">{c.desc}</p>

              {c.variant === "onsite" ? (
                <div className="mt-auto space-y-3">
                  <div className="flex items-start gap-2 text-sm text-text-secondary">
                    <MapPin size={16} className="text-primary flex-shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{CLINIC_ADDRESS}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button asChild className="rounded-full shadow-warm-sm">
                      <a href={CLINIC_MAPS_URL} target="_blank" rel="noopener noreferrer">
                        Petunjuk Arah
                      </a>
                    </Button>
                    <Button asChild variant="outline" className="rounded-full border-2">
                      <a href={`mailto:${CONTACT_EMAIL}`}>
                        <Mail size={16} className="mr-2" /> Hubungi Kami
                      </a>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-auto">
                  {online ? (
                    <Button asChild className="rounded-full w-full sm:w-auto shadow-warm">
                      <a href={BOOKING_ONLINE_URL} target="_blank" rel="noopener noreferrer">
                        Booking Sekarang <ExternalLink size={16} className="ml-2" />
                      </a>
                    </Button>
                  ) : (
                    <div className="text-sm text-text-secondary bg-background border border-primary/10 rounded-2xl p-4">
                      Layanan booking online sedang kami persiapkan. Anda akan dapat memesan sesi konsultasi psikolog online melalui{" "}
                      <span className="font-mono text-primary">{new URL(BOOKING_ONLINE_URL).host}</span> dalam waktu dekat.
                    </div>
                  )}
                </div>
              )}
            </motion.article>
          ))}
        </motion.div>
      </section>

      {/* Alamat + peta */}
      <section className="pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto bg-white rounded-[2.5rem] p-8 md:p-12 border border-primary/10 shadow-warm-lg">
          <div className="text-center mb-6">
            <p className="text-primary font-semibold text-sm mb-2 tracking-wider uppercase">Lokasi</p>
            <h2 className="text-2xl md:text-3xl font-heading font-bold mb-2">{CLINIC_NAME}</h2>
            <p className="text-text-secondary">{CLINIC_ADDRESS}</p>
            {contact.wa && (
              <p className="text-sm mt-1">
                WhatsApp admin:{" "}
                <a href={waLink(contact.wa, `${contact.greeting} tentang kunjungan ke klinik.`)} target="_blank" rel="noopener noreferrer" className="text-primary font-semibold hover:underline">
                  {formatWaDisplay(contact.wa)}
                </a>
              </p>
            )}
            <p className="text-sm text-text-secondary mt-3 bg-background border border-primary/10 rounded-2xl px-4 py-3">
              Isi data anak dan orang tua sebelum kunjungan pertama di{" "}
              <a href="/assessment" className="text-primary font-semibold hover:underline">formulir pendaftaran</a>.
              Hubungi admin kembali setelah mengisi formulir pendaftaran.
            </p>
          </div>
          <div className="aspect-video rounded-3xl overflow-hidden bg-primary/5 border border-primary/10">
            <iframe
              title="Peta Klinik Mitra Diani"
              src={`https://www.google.com/maps?q=${encodeURIComponent("Klinik Mitra Diani, Jl. PKP Raya No.1, Kelapa Dua Wetan, Ciracas, Jakarta Timur")}&output=embed`}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
            <Button asChild size="lg" className="rounded-full px-8 shadow-warm">
              <a href={CLINIC_MAPS_URL} target="_blank" rel="noopener noreferrer">
                Buka di Google Maps
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
