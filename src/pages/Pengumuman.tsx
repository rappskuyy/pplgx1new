import { useState, useEffect } from "react";
import { Megaphone, Plus, Trash2, Pin, PinOff, Loader2, X, AlertTriangle, Info, CalendarDays, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "react-router-dom";

interface Pengumuman {
  id: string;
  judul: string;
  isi: string;
  kategori: "penting" | "info" | "acara";
  pinned: boolean;
  expired_at: string | null;
  created_at: string;
  created_by: string;
}

const kategoriConfig = {
  penting: { label: "Penting", icon: AlertTriangle, className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", border: "border-l-red-500" },
  info: { label: "Info", icon: Info, className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", border: "border-l-blue-500" },
  acara: { label: "Acara", icon: CalendarDays, className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", border: "border-l-amber-500" },
};

export default function Pengumuman() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [pengumuman, setPengumuman] = useState<Pengumuman[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    judul: "",
    isi: "",
    kategori: "info" as "penting" | "info" | "acara",
    pinned: false,
    expired_at: "",
  });

  useEffect(() => {
    if (!user) return;
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  const fetchData = async () => {
    const { data, error } = await supabase
      .from("pengumuman")
      .select("*")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });
    if (!error && data) setPengumuman(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async () => {
    if (!form.judul.trim() || !form.isi.trim()) return;
    setSubmitting(true);
    const payload: Record<string, unknown> = {
      judul: form.judul.trim(),
      isi: form.isi.trim(),
      kategori: form.kategori,
      pinned: form.pinned,
      created_by: user?.email || "admin",
    };
    if (form.expired_at) payload.expired_at = new Date(form.expired_at).toISOString();

    const { error } = await supabase.from("pengumuman").insert(payload);
    if (!error) {
      setForm({ judul: "", isi: "", kategori: "info", pinned: false, expired_at: "" });
      setShowForm(false);
      fetchData();
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await supabase.from("pengumuman").delete().eq("id", id);
    setPengumuman((prev) => prev.filter((p) => p.id !== id));
    setDeletingId(null);
  };

  const handleTogglePin = async (p: Pengumuman) => {
    await supabase.from("pengumuman").update({ pinned: !p.pinned }).eq("id", p.id);
    fetchData();
  };

  const isExpired = (expired_at: string | null) => {
    if (!expired_at) return false;
    return new Date(expired_at) < new Date();
  };

  return (
    <PageTransition>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Megaphone size={32} className="text-primary" />
              <h1 className="text-3xl font-bold text-foreground">Pengumuman</h1>
            </div>
            <p className="text-muted-foreground">Info dan pengumuman penting untuk kelas PPLG X-1</p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
            >
              <Plus size={16} /> Tambah
            </button>
          )}
        </div>

        {/* Form Modal */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
              onClick={() => setShowForm(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                  <h2 className="font-semibold text-foreground">Tambah Pengumuman</h2>
                  <button onClick={() => setShowForm(false)} className="rounded-lg p-1.5 hover:bg-muted text-muted-foreground transition-colors">
                    <X size={16} />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  {/* Judul */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Judul *</label>
                    <input
                      value={form.judul}
                      onChange={(e) => setForm({ ...form, judul: e.target.value })}
                      placeholder="Judul pengumuman..."
                      className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                    />
                  </div>

                  {/* Isi */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Isi *</label>
                    <textarea
                      value={form.isi}
                      onChange={(e) => setForm({ ...form, isi: e.target.value })}
                      placeholder="Isi pengumuman..."
                      rows={4}
                      className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none"
                    />
                  </div>

                  {/* Kategori */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Kategori</label>
                    <div className="flex gap-2">
                      {(["info", "penting", "acara"] as const).map((k) => {
                        const cfg = kategoriConfig[k];
                        const KIcon = cfg.icon;
                        return (
                          <button
                            key={k}
                            onClick={() => setForm({ ...form, kategori: k })}
                            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all border-2 ${
                              form.kategori === k
                                ? `${cfg.className} border-current`
                                : "border-border text-muted-foreground hover:bg-muted"
                            }`}
                          >
                            <KIcon size={12} /> {cfg.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Expired at */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      <Clock size={13} className="inline mr-1" />
                      Berlaku Hingga <span className="text-muted-foreground font-normal">(opsional)</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={form.expired_at}
                      onChange={(e) => setForm({ ...form, expired_at: e.target.value })}
                      className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Kosongkan jika pengumuman tidak ada batas waktu</p>
                  </div>

                  {/* Pinned */}
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div
                      onClick={() => setForm({ ...form, pinned: !form.pinned })}
                      className={`relative w-10 h-5 rounded-full transition-colors ${form.pinned ? "bg-primary" : "bg-muted"}`}
                    >
                      <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.pinned ? "translate-x-5" : ""}`} />
                    </div>
                    <span className="text-sm text-foreground">Sematkan pengumuman ini</span>
                  </label>
                </div>

                <div className="flex gap-3 px-6 pb-6">
                  <button onClick={() => setShowForm(false)} className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors">
                    Batal
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || !form.judul.trim() || !form.isi.trim()}
                    className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    Tambah
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-primary" size={28} /></div>
        ) : pengumuman.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-muted-foreground">
            <Megaphone size={48} className="mb-3 opacity-20" />
            <p className="font-medium">Belum ada pengumuman</p>
            {isAdmin && <p className="text-sm mt-1">Klik "Tambah" untuk membuat pengumuman pertama</p>}
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {pengumuman.map((p) => {
                const config = kategoriConfig[p.kategori];
                const KategoriIcon = config.icon;
                const expired = isExpired(p.expired_at);

                return (
                  <motion.div
                    key={p.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: expired ? 0.5 : 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    className={`rounded-xl bg-card border border-border border-l-4 ${config.border} shadow-sm overflow-hidden ${p.pinned ? "ring-1 ring-amber-500/20" : ""}`}
                  >
                    <div className="p-5">
                      <div className="flex items-start gap-4">
                        <div className="flex-1 min-w-0">
                          {/* Badges */}
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            {p.pinned && (
                              <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                                <Pin size={10} className="fill-current" /> Disematkan
                              </span>
                            )}
                            {expired && (
                              <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                Kedaluwarsa
                              </span>
                            )}
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${config.className}`}>
                              <KategoriIcon size={10} /> {config.label}
                            </span>
                            {p.expired_at && !expired && (
                              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Clock size={10} />
                                Berakhir {new Date(p.expired_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                              </span>
                            )}
                          </div>

                          <h3 className="font-semibold text-foreground mb-1">{p.judul}</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{p.isi}</p>
                          <p className="text-xs text-muted-foreground/60 mt-3">
                            {new Date(p.created_at).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                          </p>
                        </div>

                        {/* Admin actions */}
                        {isAdmin && (
                          <div className="flex flex-col gap-1.5 shrink-0">
                            <button
                              onClick={() => handleTogglePin(p)}
                              title={p.pinned ? "Lepas sematan" : "Sematkan"}
                              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                                p.pinned
                                  ? "bg-amber-100 text-amber-600 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400"
                                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              {p.pinned ? <PinOff size={14} /> : <Pin size={14} />}
                            </button>
                            <button
                              onClick={() => handleDelete(p.id)}
                              disabled={deletingId === p.id}
                              title="Hapus"
                              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                            >
                              {deletingId === p.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {!user && (
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              <Link to="/login" className="text-primary font-medium hover:underline">Login</Link> untuk mengelola pengumuman
            </p>
          </div>
        )}
      </div>
    </PageTransition>
  );
}