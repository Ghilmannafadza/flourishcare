import { createContext, useContext, useState, useMemo } from "react";

export type ConsultationTopic =
  | "keterlambatan_bicara"
  | "tantrum_regulasi_emosi"
  | "sulit_fokus_hiperaktif"
  | "kesiapan_sekolah"
  | "kesulitan_belajar"
  | "kecemasan_ketakutan"
  | "perilaku_sosial"
  | "parenting_pola_asuh"
  | "konsultasi_awal"
  | "lainnya";

export type WizardData = {
  parent_name: string;
  parent_whatsapp: string;
  parent_email: string;
  child_name: string;
  child_dob: string;
  child_gender: "L" | "P" | "";
  consultation_topic: ConsultationTopic | "";
  condition_notes: string;

  mode: "online" | "homecare";
  homecare_service: "bt" | "si" | "ot" | "tw" | "";
  psychologist_id: string;
  psychologist_name: string;
  scheduled_date: string;
  scheduled_time: string;
  homecare_address: string;

  payment_type: "full" | "dp_50";

  // Pasien lama (No. RM + nama depan) — data anak & orang tua diambil dari rekam medis
  returning: boolean;
  rm_lama: string;
  anak_lama: string;
  child_id: string;
  // Homecare: jarak dari Klinik Mitra Diani (km) untuk biaya transport
  distance_km: string;
};

const DEFAULT: WizardData = {
  parent_name: "",
  parent_whatsapp: "",
  parent_email: "",
  child_name: "",
  child_dob: "",
  child_gender: "",
  consultation_topic: "",
  condition_notes: "",
  mode: "online",
  homecare_service: "",
  psychologist_id: "",
  psychologist_name: "",
  scheduled_date: "",
  scheduled_time: "",
  homecare_address: "",
  payment_type: "full",
  returning: false,
  rm_lama: "",
  anak_lama: "",
  child_id: "",
  distance_km: "",
};

type Ctx = {
  data: WizardData;
  update: (patch: Partial<WizardData>) => void;
  reset: () => void;
};

const WizardCtx = createContext<Ctx | null>(null);

// PENTING: localStorage (bukan sessionStorage) agar bertahan saat redirect
// ke Sumopod (buka tab/window baru) dan kembali via tombol back browser.
const STORAGE_KEY = "flourishcare_book_wizard_v2";

function loadInitial(): WizardData {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT, ...JSON.parse(raw) };
  } catch {
    // ignore
  }
  return DEFAULT;
}

export function BookWizardProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<WizardData>(loadInitial);

  const value = useMemo<Ctx>(
    () => ({
      data,
      update: (patch) => {
        setData((prev) => {
          const next = { ...prev, ...patch };
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          } catch {
            // ignore
          }
          return next;
        });
      },
      reset: () => {
        setData(DEFAULT);
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          // ignore
        }
      },
    }),
    [data]
  );

  return <WizardCtx.Provider value={value}>{children}</WizardCtx.Provider>;
}

export function useWizard() {
  const ctx = useContext(WizardCtx);
  if (!ctx) throw new Error("useWizard harus di dalam BookWizardProvider");
  return ctx;
}

export const CONSULTATION_TOPICS: { value: ConsultationTopic; label: string }[] = [
  { value: "keterlambatan_bicara", label: "Keterlambatan bicara" },
  { value: "tantrum_regulasi_emosi", label: "Tantrum atau regulasi emosi" },
  { value: "sulit_fokus_hiperaktif", label: "Sulit fokus atau hiperaktif" },
  { value: "kesiapan_sekolah", label: "Kesiapan sekolah" },
  { value: "kesulitan_belajar", label: "Kesulitan belajar" },
  { value: "kecemasan_ketakutan", label: "Kecemasan atau ketakutan" },
  { value: "perilaku_sosial", label: "Perilaku sosial" },
  { value: "parenting_pola_asuh", label: "Parenting dan pola asuh" },
  { value: "konsultasi_awal", label: "Belum yakin, ingin konsultasi awal" },
  { value: "lainnya", label: "Lainnya" },
];
