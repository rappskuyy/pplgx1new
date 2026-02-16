import { useState } from "react";
import { ClipboardList, Calendar, CheckCircle, Circle, AlertTriangle, Loader2, Plus, Trash2, X, Smile } from "lucide-react";
import { motion } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import { useTasks } from "@/hooks/use-supabase-data";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function Tugas() {
  const { data: tugas = [], isLoading } = useTasks();
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const total = tugas.length;
  const selesai = tugas.filter((t) => t.selesai).length;
  const belum = total - selesai;
  const today = new Date();

  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [form, setForm] = useState({ judul: "", deskripsi: "", mata_pelajaran: "", deadline: "" });

  const toggleSelesai = async (id: string, currentStatus: boolean) => {
    if (!user) { toast.error("Login dulu untuk mengubah status tugas"); return; }
    await supabase.from("tasks").update({ selesai: !currentStatus }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.judul || !form.deadline) { toast.error("Judul dan deadline wajib diisi"); return; }
    setFormLoading(true);
    const { error } = await supabase.from("tasks").insert({
      judul: form.judul,
      deskripsi: form.deskripsi,
      mata_pelajaran: form.mata_pelajaran,
      deadline: form.deadline,
      selesai: false,
    });
    if (error) { toast.error(error.message); } else {
      toast.success("Tugas berhasil ditambahkan!");
      setForm({ judul: "", deskripsi: "", mata_pelajaran: "", deadline: "" });
      setShowForm(false);
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
    }
    setFormLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus tugas ini?")) return;
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { 
      toast.success("Tugas dihapus"); 
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
    }
  };

  return (
    <PageTransition>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Tugas Rombel</h1>
        <p className="text-muted-foreground">Kelola dan pantau tugas rombel PPLG X-1</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl bg-card border border-border p-5 shadow-md text-center">
          <ClipboardList size={24} className="mx-auto mb-2 text-primary" />
          <p className="text-3xl font-bold text-foreground">{total}</p>
          <p className="text-sm text-muted-foreground">Total Tugas</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-5 shadow-md text-center">
          <CheckCircle size={24} className="mx-auto mb-2 text-green-500" />
          <p className="text-3xl font-bold text-foreground">{selesai}</p>
          <p className="text-sm text-muted-foreground">Selesai</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-5 shadow-md text-center">
          <AlertTriangle size={24} className="mx-auto mb-2 text-destructive" />
          <p className="text-3xl font-bold text-foreground">{belum}</p>
          <p className="text-sm text-muted-foreground">Belum Selesai</p>
        </div>
      </div>

      {/* Add button (admin only) */}
      {isAdmin && (
        <div className="max-w-3xl mx-auto mb-4">
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? "Batal" : "Tambah Tugas"}
          </button>
        </div>
      )}

      {/* Add form */}
      {showForm && isAdmin && (
        <form onSubmit={handleAdd} className="max-w-3xl mx-auto mb-6 rounded-xl bg-card border border-border p-6 shadow-md space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Judul *</label>
              <input value={form.judul} onChange={(e) => setForm({ ...form, judul: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" required />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Mata Pelajaran</label>
              <input value={form.mata_pelajaran} onChange={(e) => setForm({ ...form, mata_pelajaran: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Deskripsi</label>
            <textarea value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" rows={2} />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Deadline *</label>
            <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" required />
          </div>
          <button type="submit" disabled={formLoading} className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-2">
            {formLoading && <Loader2 size={14} className="animate-spin" />} Simpan
          </button>
        </form>
      )}

      {/* Task list */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div>
      ) : tugas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3 max-w-3xl mx-auto">
          <Smile size={48} className="text-primary" />
          <p className="text-lg font-medium">Tidak ada tugas</p>
          <p className="text-sm">Kamu bebas dari tugas hari ini!</p>
        </div>
      ) : (
        <div className="space-y-3 max-w-3xl mx-auto">
          {tugas.map((t, i) => {
            const isLate = !t.selesai && new Date(t.deadline) < today;
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-4 rounded-xl bg-card p-4 shadow-md border border-border hover:shadow-lg transition-shadow"
              >
                <button onClick={() => toggleSelesai(t.id, t.selesai)} className="mt-1 shrink-0">
                  {t.selesai ? <CheckCircle size={22} className="text-green-500" /> : <Circle size={22} className="text-muted-foreground hover:text-primary transition-colors" />}
                </button>
                <div className="flex-1">
                  <p className={`font-semibold text-foreground ${t.selesai ? "line-through opacity-50" : ""}`}>{t.judul}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{t.deskripsi}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground"><Calendar size={12} /> {t.deadline}</span>
                    {isLate && <span className="rounded-full bg-destructive/10 text-destructive px-2 py-0.5 text-xs font-medium">Terlambat</span>}
                  </div>
                </div>
                {isAdmin && (
                  <button onClick={() => handleDelete(t.id)} className="mt-1 shrink-0 text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 size={18} />
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </PageTransition>
  );
}
