import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Lock, LogIn, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { GrainOverlay } from "@/components/GrainOverlay";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { session, profile, loading: authLoading, profileLoading } = useAuth();

  const explicitRedirect = params.get("redirect");

  // Redirect otomatis kalau user sudah login (menghindari race, tunggu profileLoading selesai)
  useEffect(() => {
    if (authLoading || !session || profileLoading) return;
    if (explicitRedirect) {
      navigate(explicitRedirect, { replace: true });
      return;
    }
    if (profile) {
      navigate("/dashboard", { replace: true });
    } else {
      navigate("/portal", { replace: true });
    }
  }, [session, profile, authLoading, profileLoading, explicitRedirect, navigate]);

  async function handleGoogle() {
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}${explicitRedirect ?? "/login"}` },
    });
    if (err) { setError(err.message); setLoading(false); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (err) throw err;
      const userId = data.user?.id;
      if (!userId) throw new Error("Login gagal: user tidak ditemukan.");

      if (explicitRedirect) {
        navigate(explicitRedirect, { replace: true });
        return;
      }

      // Pakai RPC SECURITY DEFINER — bypass RLS, hasil selalu benar
      const { data: rpcData, error: rpcErr } = await supabase.rpc("get_my_profile");
      const rows = (rpcData as Array<{ id: string; role: string; is_staff: boolean }> | null) ?? [];
      const isStaff = rows.length > 0 && rows[0]?.is_staff === true;

      // eslint-disable-next-line no-console
      console.log("[Login] get_my_profile:", { rows, isStaff, rpcErr });

      if (rpcErr) {
        // Kalau RPC belum ter-deploy, fallback ke query biasa
        const { data: profileRow } = await supabase
          .from("profiles")
          .select("id, role")
          .eq("id", userId)
          .maybeSingle();
        if (profileRow) {
          navigate("/dashboard", { replace: true });
        } else {
          navigate("/portal", { replace: true });
        }
        return;
      }

      if (isStaff) {
        // eslint-disable-next-line no-console
        console.log("[Login] Staff terdeteksi → /dashboard, role:", rows[0].role);
        navigate("/dashboard", { replace: true });
      } else {
        // eslint-disable-next-line no-console
        console.log("[Login] Bukan staff → /portal pasien");
        navigate("/portal", { replace: true });
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[Login] handleSubmit error:", err);
      setError((err as Error).message ?? "Email atau kata sandi salah.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot() {
    if (!email) {
      setError("Masukkan email dulu untuk mengirim tautan reset.");
      return;
    }
    setError(null);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    if (err) setError("Gagal mengirim tautan reset. Coba lagi nanti.");
    else setError("Tautan reset kata sandi telah dikirim ke email Anda.");
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-10 relative overflow-hidden">
      <GrainOverlay />
      <div className="blob blob-peach w-[400px] h-[400px] -top-16 -right-16" />
      <div className="blob blob-lavender w-[320px] h-[320px] -bottom-16 -left-16" />

      <div className="relative z-10 w-full max-w-md">
        <div className="flex justify-center mb-6">
          <Logo className="h-24 w-auto" />
        </div>
        <div className="bg-white rounded-[2rem] p-8 border border-black/5 shadow-warm-lg">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-heading font-bold">
              Masuk <span className="font-accent text-primary text-4xl">akun</span>
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              Untuk staf internal dan orang tua pasien.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleGoogle}
            disabled={loading}
            className="w-full rounded-full border-2 mb-4"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" className="mr-2" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Masuk dengan Google
          </Button>

          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 h-px bg-black/10" />
            <span className="text-xs text-text-secondary">atau</span>
            <div className="flex-1 h-px bg-black/10" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-1.5">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full rounded-2xl border border-black/10 bg-background pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-primary mb-1.5">Kata Sandi</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full rounded-2xl border border-black/10 bg-background pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            {error && (
              <div className="text-sm text-red bg-red/10 border border-red/20 rounded-2xl px-4 py-3">{error}</div>
            )}

            <Button type="submit" className="w-full rounded-full shadow-warm" size="lg" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={18} /> Memproses…
                </>
              ) : (
                <>
                  <LogIn size={18} className="mr-2" /> Masuk
                </>
              )}
            </Button>

            <div className="flex items-center justify-between text-xs">
              <button type="button" onClick={handleForgot} className="text-primary hover:underline">
                Lupa kata sandi?
              </button>
              <Link to="/" className="text-text-secondary hover:text-primary">Kembali ke Beranda</Link>
            </div>
          </form>

          <p className="text-xs text-text-secondary text-center mt-6 pt-4 border-t border-black/5">
            Belum punya akun?{" "}
            <a href="/book/signup" className="text-primary font-semibold hover:underline">
              Daftar di sini
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
