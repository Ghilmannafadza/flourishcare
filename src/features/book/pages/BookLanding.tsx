import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Video, Home, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/AuthProvider";
import { fadeUp, stagger } from "@/lib/motion";
import { useWizard } from "../wizardContext";

export function BookLanding() {
  const { session } = useAuth();
  const { update } = useWizard();
  const navigate = useNavigate();

  const startBooking = (mode: "online" | "homecare") => {
    update({ mode });
    if (session) navigate("/profile");
    else navigate("/signup?next=/profile");
  };

  return (
    <div className="max-w-3xl mx-auto">
      <motion.div variants={stagger} initial="hidden" animate="visible" className="text-center mb-8">
        <motion.p variants={fadeUp} className="text-primary font-semibold text-sm mb-2 tracking-wider uppercase">
          Booking Online
        </motion.p>
        <motion.h1 variants={fadeUp} className="text-3xl md:text-4xl font-heading font-extrabold mb-3">
          Konsultasi psikolog anak <span className="text-primary">di ujung jari</span>
        </motion.h1>
        <motion.p variants={fadeUp} className="text-text-secondary max-w-xl mx-auto">
          Booking sesi konsultasi psikolog secara online atau layanan homecare langsung dari rumah. Aman, mudah, dan bersertifikasi.
        </motion.p>
      </motion.div>

      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        <motion.button
          variants={fadeUp}
          onClick={() => startBooking("online")}
          className="text-left bg-white rounded-3xl p-6 md:p-7 border border-black/5 shadow-warm-sm hover:shadow-warm transition-shadow"
        >
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
            <Video size={22} />
          </div>
          <h3 className="font-heading font-bold text-lg mb-2">Konsultasi Online</h3>
          <p className="text-sm text-text-secondary leading-relaxed mb-4">
            Sesi konsultasi psikolog secara online via video call. Cocok untuk konsultasi lanjutan atau di luar Jabodetabek.
          </p>
          <span className="inline-flex items-center gap-1 text-primary font-semibold text-sm">
            Mulai booking <ArrowRight size={14} />
          </span>
        </motion.button>

        <motion.button
          variants={fadeUp}
          onClick={() => startBooking("homecare")}
          className="text-left bg-white rounded-3xl p-6 md:p-7 border border-black/5 shadow-warm-sm hover:shadow-warm transition-shadow"
        >
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
            <Home size={22} />
          </div>
          <h3 className="font-heading font-bold text-lg mb-2">Homecare Visit</h3>
          <p className="text-sm text-text-secondary leading-relaxed mb-4">
            Psikolog datang langsung ke rumah untuk sesi konsultasi atau asesmen. Kenyamanan maksimal untuk anak.
          </p>
          <span className="inline-flex items-center gap-1 text-primary font-semibold text-sm">
            Mulai booking <ArrowRight size={14} />
          </span>
        </motion.button>
      </motion.div>

      {!session && (
        <div className="mt-8 text-center text-sm text-text-secondary">
          Sudah punya akun?{" "}
          <Link to="/login" className="text-primary font-semibold hover:underline">
            Masuk di sini
          </Link>
        </div>
      )}

      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-text-secondary">
        <div className="flex items-start gap-2 bg-white rounded-2xl p-4 border border-black/5">
          <ShieldCheck size={18} className="text-primary flex-shrink-0 mt-0.5" />
          <p>Psikolog bersertifikasi STR aktif.</p>
        </div>
        <div className="flex items-start gap-2 bg-white rounded-2xl p-4 border border-black/5">
          <Sparkles size={18} className="text-primary flex-shrink-0 mt-0.5" />
          <p>Pembayaran aman via QRIS (semua e-wallet).</p>
        </div>
      </div>

      <Button asChild className="mt-8 rounded-full w-full sm:w-auto sm:mx-auto sm:flex" size="lg">
        <Link to={session ? "/profile" : "/signup?next=/profile"}>
          Mulai Booking Sekarang
        </Link>
      </Button>
    </div>
  );
}
