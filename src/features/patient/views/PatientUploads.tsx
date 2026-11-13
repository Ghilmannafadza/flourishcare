import { useEffect, useState } from "react";
import { Upload, FileText, Loader2, Trash2, Download } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/AuthProvider";

type Attachment = {
  id: string;
  child_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  description: string | null;
  uploaded_at: string;
};

type Child = { id: string; rm_number: string | null; full_name: string };

const MAX_SIZE = 20 * 1024 * 1024; // 20 MB
const ALLOWED = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export function PatientUploads() {
  const { session } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    (async () => {
      setLoading(true);
      const { data: parent } = await supabase
        .from("parents")
        .select("id")
        .eq("auth_user_id", session.user.id)
        .maybeSingle();
      if (!parent) {
        setLoading(false);
        return;
      }
      const { data: kidsData } = await supabase
        .from("children")
        .select("id, rm_number, full_name")
        .eq("parent_id", parent.id)
        .order("full_name");
      const kids = (kidsData as Child[]) ?? [];
      setChildren(kids);
      if (kids[0]) setSelectedChild(kids[0].id);

      const childIds = kids.map((k) => k.id);
      if (childIds.length) {
        const { data: att } = await supabase
          .from("patient_attachments")
          .select("*")
          .in("child_id", childIds)
          .order("uploaded_at", { ascending: false });
        setAttachments((att as Attachment[]) ?? []);
      }
      setLoading(false);
    })();
  }, [session]);

  async function refreshAttachments() {
    const ids = children.map((c) => c.id);
    if (!ids.length) return;
    const { data } = await supabase
      .from("patient_attachments")
      .select("*")
      .in("child_id", ids)
      .order("uploaded_at", { ascending: false });
    setAttachments((data as Attachment[]) ?? []);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedChild) return;
    setError(null);
    if (file.size > MAX_SIZE) {
      setError("Ukuran file maksimal 20 MB.");
      return;
    }
    if (!ALLOWED.includes(file.type)) {
      setError("Format tidak didukung. Gunakan PDF, JPG, PNG, atau DOCX.");
      return;
    }
    setUploading(true);
    const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, "_");
    const path = `${selectedChild}/${Date.now()}_${safeName}`;
    const { error: upErr } = await supabase.storage
      .from("patient-attachments")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (upErr) {
      setError(upErr.message);
      setUploading(false);
      return;
    }
    const { error: insErr } = await supabase.from("patient_attachments").insert({
      child_id: selectedChild,
      file_name: file.name,
      file_path: path,
      file_size: file.size,
      mime_type: file.type,
      description: description || null,
    });
    setUploading(false);
    if (insErr) {
      setError(insErr.message);
      return;
    }
    setDescription("");
    e.target.value = "";
    refreshAttachments();
  }

  async function handleDelete(a: Attachment) {
    if (!confirm(`Hapus file "${a.file_name}"?`)) return;
    await supabase.storage.from("patient-attachments").remove([a.file_path]);
    await supabase.from("patient_attachments").delete().eq("id", a.id);
    refreshAttachments();
  }

  async function handleDownload(a: Attachment) {
    const { data, error } = await supabase.storage
      .from("patient-attachments")
      .createSignedUrl(a.file_path, 60);
    if (error || !data) {
      alert("Gagal membuat tautan unduh: " + (error?.message ?? "unknown"));
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  }

  if (loading)
    return (
      <div className="bg-white rounded-2xl border border-black/5 p-10 text-center text-text-secondary text-sm">
        <Loader2 className="animate-spin mx-auto mb-2" size={20} /> Memuat data…
      </div>
    );

  if (!children.length)
    return (
      <div className="bg-white rounded-2xl border border-black/5 p-10 text-center">
        <FileText className="mx-auto mb-3 text-text-secondary/40" size={40} />
        <h3 className="font-heading font-bold text-lg mb-1">Belum ada anak terdaftar</h3>
        <p className="text-sm text-text-secondary max-w-md mx-auto">
          Selesaikan pendaftaran di{" "}
          <a href="/assessment" className="text-primary underline">
            flourishcare.id/assessment
          </a>{" "}
          agar nomor RM dapat diterbitkan.
        </p>
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-black/5 p-5">
        <h3 className="font-heading font-bold text-lg mb-1">Unggah Rekam Medis dari Klinik Lain</h3>
        <p className="text-xs text-text-secondary mb-4">
          Format: PDF/JPG/PNG/DOCX. Maksimal 20 MB per file. File hanya dapat diakses oleh Anda dan tim klinis FlourishCare.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <label className="block">
            <span className="block text-xs font-semibold text-text-secondary mb-1">Untuk Anak</span>
            <select
              value={selectedChild ?? ""}
              onChange={(e) => setSelectedChild(e.target.value)}
              className="input"
            >
              {children.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name} {c.rm_number ? `(${c.rm_number})` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="block md:col-span-2">
            <span className="block text-xs font-semibold text-text-secondary mb-1">Deskripsi (opsional)</span>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input"
              placeholder="Contoh: Hasil observasi RS X, 2025"
            />
          </label>
        </div>

        <label
          htmlFor="patient-upload-input"
          className={`block w-full cursor-pointer rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors p-6 text-center ${
            uploading || !selectedChild ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          <Upload size={32} className="mx-auto mb-2 text-primary" />
          <p className="text-sm font-semibold text-primary mb-1">
            {uploading ? "Mengunggah…" : "Klik untuk pilih file"}
          </p>
          <p className="text-xs text-text-secondary">
            PDF, JPG, PNG, atau DOCX · maks. 20 MB
          </p>
          <input
            id="patient-upload-input"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
            onChange={handleUpload}
            disabled={uploading || !selectedChild}
            className="hidden"
          />
        </label>

        {error && <p className="text-sm text-red mt-3">{error}</p>}
      </div>

      <div className="bg-white rounded-2xl border border-black/5 p-5">
        <h3 className="font-heading font-bold text-lg mb-3">Riwayat Unggahan</h3>
        {attachments.length === 0 ? (
          <p className="text-sm italic text-text-secondary py-6 text-center">Belum ada file yang diunggah.</p>
        ) : (
          <ul className="space-y-2">
            {attachments.map((a) => {
              const child = children.find((c) => c.id === a.child_id);
              return (
                <li
                  key={a.id}
                  className="border border-black/5 rounded-xl p-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-primary shrink-0" />
                      <p className="font-semibold text-sm truncate">{a.file_name}</p>
                    </div>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {child?.full_name ?? "-"} ·{" "}
                      {a.file_size ? `${(a.file_size / 1024).toFixed(0)} KB` : ""} ·{" "}
                      {new Date(a.uploaded_at).toLocaleDateString("id-ID")}
                    </p>
                    {a.description && <p className="text-xs text-text-secondary mt-0.5 italic">{a.description}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="outline" size="sm" className="rounded-full" onClick={() => handleDownload(a)}>
                      <Download size={14} />
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-full text-red border-red/20" onClick={() => handleDelete(a)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="bg-primary/5 rounded-2xl border border-primary/10 p-4 text-sm text-text-secondary">
        <p className="flex items-start gap-2">
          <Upload size={16} className="text-primary mt-0.5 shrink-0" />
          <span>
            Setelah diunggah, tim psikolog akan meninjau dokumen dan menjadikannya bagian dari catatan asesmen anak Anda.
          </span>
        </p>
      </div>
    </div>
  );
}
