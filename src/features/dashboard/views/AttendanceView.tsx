import { useEffect, useState } from "react";
import { Fingerprint, LogIn as LogInIcon, LogOut as LogOutIcon, CalendarPlus, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/features/dashboard/common";
import { fetchLeaveRequests } from "@/features/dashboard/queries";
import type { LeaveRequest } from "@/types/database";

type AttendanceLog = {
  id: string;
  type: string;
  mode: string;
  logged_at: string;
};

export function AttendanceView() {
  const { profile, role } = useAuth();
  const canApprove = role === "super_admin" || role === "admin_cabang";
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");
  const [leaveReason, setLeaveReason] = useState("");

  async function refresh() {
    if (!profile) return;
    setLoading(true);
    const [logRes, leaveRes] = await Promise.all([
      supabase
        .from("attendance_logs")
        .select("id,type,mode,logged_at")
        .eq("staff_id", profile.id)
        .order("logged_at", { ascending: false })
        .limit(20),
      canApprove ? fetchLeaveRequests() : fetchLeaveRequests(),
    ]);
    setLogs((logRes.data as AttendanceLog[]) ?? []);
    setLeaves(leaveRes);
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, canApprove]);

  async function logAttendance(type: string) {
    if (!profile) return;
    setSubmitting(true);
    await supabase.from("attendance_logs").insert({
      staff_id: profile.id,
      type,
      mode: "onsite",
    });
    setSubmitting(false);
    void refresh();
  }

  async function submitLeave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSubmitting(true);
    await supabase.from("leave_requests").insert({
      staff_id: profile.id,
      start_date: leaveStart,
      end_date: leaveEnd,
      reason: leaveReason,
    });
    setSubmitting(false);
    setLeaveStart("");
    setLeaveEnd("");
    setLeaveReason("");
    void refresh();
  }

  async function reviewLeave(id: string, status: "approved" | "rejected") {
    if (!profile) return;
    setSubmitting(true);
    await supabase
      .from("leave_requests")
      .update({ status, reviewed_by: profile.id, reviewed_at: new Date().toISOString() })
      .eq("id", id);
    setSubmitting(false);
    void refresh();
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-primary/10 p-6">
        <h3 className="font-heading font-bold mb-4 flex items-center gap-2">
          <Fingerprint size={18} className="text-primary" /> Presensi Cepat
        </h3>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => logAttendance("clock_in")} disabled={submitting} className="rounded-full">
            <LogInIcon size={16} className="mr-2" /> Clock In
          </Button>
          <Button onClick={() => logAttendance("clock_out")} disabled={submitting} variant="outline" className="rounded-full border-2">
            <LogOutIcon size={16} className="mr-2" /> Clock Out
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-2xl border border-primary/10 p-6">
          <h3 className="font-heading font-bold mb-4">Log Terakhir</h3>
          {loading ? (
            <div className="text-sm text-text-secondary flex items-center gap-2">
              <Loader2 className="animate-spin" size={16} /> Memuat…
            </div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-text-secondary">Belum ada log presensi.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {logs.map((l) => (
                <li key={l.id} className="flex items-center justify-between border-b border-primary/10 pb-2">
                  <span className="capitalize">{l.type.replace("_", " ")}</span>
                  <span className="text-xs text-text-secondary">
                    {new Date(l.logged_at).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white rounded-2xl border border-primary/10 p-6">
          <h3 className="font-heading font-bold mb-4 flex items-center gap-2">
            <CalendarPlus size={18} className="text-primary" /> Pengajuan Cuti
          </h3>
          <form onSubmit={submitLeave} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                required
                value={leaveStart}
                onChange={(e) => setLeaveStart(e.target.value)}
                className="rounded-lg border border-primary/20 bg-background px-3 py-2 text-sm"
              />
              <input
                type="date"
                required
                value={leaveEnd}
                onChange={(e) => setLeaveEnd(e.target.value)}
                className="rounded-lg border border-primary/20 bg-background px-3 py-2 text-sm"
              />
            </div>
            <textarea
              required
              value={leaveReason}
              onChange={(e) => setLeaveReason(e.target.value)}
              placeholder="Alasan cuti"
              rows={3}
              className="w-full rounded-lg border border-primary/20 bg-background px-3 py-2 text-sm"
            />
            <Button type="submit" disabled={submitting} className="rounded-full w-full">
              Ajukan Cuti
            </Button>
          </form>
        </section>
      </div>

      <section>
        <h3 className="font-heading font-bold mb-3">Daftar Cuti</h3>
        {leaves.length === 0 ? (
          <EmptyState title="Belum ada pengajuan cuti" />
        ) : (
          <div className="bg-white rounded-2xl border border-primary/10 divide-y divide-primary/10">
            {leaves.map((l) => (
              <div key={l.id} className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{l.reason}</p>
                  <p className="text-xs text-text-secondary">
                    {new Date(l.start_date).toLocaleDateString("id-ID")}
                    {" s/d "}
                    {new Date(l.end_date).toLocaleDateString("id-ID")}
                  </p>
                </div>
                {l.status === "pending" && canApprove ? (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => reviewLeave(l.id, "approved")} disabled={submitting} className="rounded-full">
                      Setujui
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => reviewLeave(l.id, "rejected")} disabled={submitting} className="rounded-full border-2">
                      Tolak
                    </Button>
                  </div>
                ) : (
                  <span
                    className={`text-xs px-3 py-1 rounded-full font-medium ${
                      l.status === "approved"
                        ? "bg-green-100 text-green-700"
                        : l.status === "rejected"
                        ? "bg-red/10 text-red"
                        : "bg-yellow/10 text-yellow-700"
                    }`}
                  >
                    {l.status}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
