import { useState, useMemo } from "react";
import { Hash, Users, TrendingUp, Plus, Trash2, X, Loader2, AlertCircle, ArrowUpDown, Inbox } from "lucide-react";
import { motion } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import { useInfaq, useSiswa } from "@/hooks/use-supabase-data";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type SortOption = "nama-asc" | "nama-desc" | "nominal-desc" | "nominal-asc";

export default function Infaq() {
  const { data: infaqData = [], isLoading, isError } = useInfaq();
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [form, setForm] = useState({ siswa_id: "", nominal: "", tanggal: "" });
  const { data: siswaList = [] } = useSiswa();
  const [sortOption, setSortOption] = useState<SortOption>("nominal-desc");

  const totalNominal = infaqData.reduce((sum, i) => sum + i.nominal, 0);
  const totalTransaksi = infaqData.length;
  const uniqueSiswa = new Set(infaqData.map((i) => i.siswa_nama)).size;

  // Memoize siswaList untuk menghindari refetch berulang
  const memoSiswaList = useMemo(() => siswaList, [siswaList]);

  // Build ranking with transaction count
  const rankingData = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    infaqData.forEach((i) => {
      if (!map[i.siswa_nama]) map[i.siswa_nama] = { total: 0, count: 0 };
      map[i.siswa_nama].total += i.nominal;
      map[i.siswa_nama].count += 1;
    });
    let entries = Object.entries(map).map(([nama, v]) => ({ nama, ...v }));

    switch (sortOption) {
      case "nama-asc": entries.sort((a, b) => a.nama.localeCompare(b.nama)); break;
      case "nama-desc": entries.sort((a, b) => b.nama.localeCompare(a.nama)); break;
      case "nominal-desc": entries.sort((a, b) => b.total - a.total); break;
      case "nominal-asc": entries.sort((a, b) => a.total - b.total); break;
    }
    return entries;
  }, [infaqData, sortOption]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.siswa_id || !form.nominal || !form.tanggal) { toast.error("Semua field wajib diisi"); return; }
    setFormLoading(true);
    const { error } = await supabase.from("infaq_transactions").insert({
      siswa_id: form.siswa_id, nominal: Number(form.nominal), tanggal: form.tanggal,
    });
    if (error) { toast.error(error.message); } else {
      toast.success("Infaq berhasil ditambahkan!");
      setForm({ siswa_id: "", nominal: "", tanggal: "" });
      setShowForm(false);
      // Invalidate only infaq query untuk menghindari refetch seluruh data
      await queryClient.invalidateQueries({ queryKey: ["infaq"] });
    }
    setFormLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus data infaq ini?")) return;
    const { error } = await supabase.from("infaq_transactions").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { 
      toast.success("Data infaq dihapus"); 
      await queryClient.invalidateQueries({ queryKey: ["infaq"] });
    }
  };

  if (isLoading) return <PageTransition><InfaqSkeleton /></PageTransition>;

  if (isError) {
    return (
      <PageTransition>
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <AlertCircle size={40} className="text-destructive" />
          <p className="text-lg font-medium">Gagal memuat data infaq</p>
          <p className="text-sm">Periksa koneksi internet atau konfigurasi database.</p>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Infaq Rombel</h1>
        <p className="text-muted-foreground">Catatan infaq rombel PPLG X-1</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="shadow-md border-border">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-success/10">
              <span className="text-success font-semibold">Rp</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">Rp {totalNominal.toLocaleString("id-ID")}</p>
              <p className="text-sm text-muted-foreground">Total Infaq</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-md border-border">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Hash size={24} className="text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalTransaksi}</p>
              <p className="text-sm text-muted-foreground">Total Transaksi</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-md border-border">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary/10">
              <Users size={24} className="text-secondary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{uniqueSiswa}</p>
              <p className="text-sm text-muted-foreground">Siswa Berinfaq</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Add */}
      {isAdmin && (
        <div className="mb-4">
          <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? "Batal" : "Tambah Infaq"}
          </button>
        </div>
      )}
      {showForm && isAdmin && (
        <form onSubmit={handleAdd} className="mb-6 rounded-xl bg-card border border-border p-6 shadow-md space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Nama Siswa *</label>
                <select value={form.siswa_id} onChange={(e) => setForm({ ...form, siswa_id: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" required>
                  <option value="">Pilih siswa...</option>
                  {memoSiswaList.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.no_absen ? `${s.no_absen} - ${s.nama}` : s.nama}</option>
                  ))}
                </select>
              </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Nominal (Rp) *</label>
              <input type="number" value={form.nominal} onChange={(e) => setForm({ ...form, nominal: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" required />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Tanggal *</label>
              <input type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" required />
            </div>
          </div>
          <button type="submit" disabled={formLoading} className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-2">
            {formLoading && <Loader2 size={14} className="animate-spin" />} Simpan
          </button>
        </form>
      )}

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Riwayat */}
        <Card className="shadow-md border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Riwayat Infaq</CardTitle>
          </CardHeader>
          <CardContent>
            {infaqData.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-muted-foreground gap-2">
                <Inbox size={32} />
                <p className="text-sm">Belum ada data infaq</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {infaqData.map((inf, i) => (
                  <motion.div key={inf.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.01 }} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                    <div>
                      <p className="font-medium text-foreground text-sm">{inf.siswa_nama}</p>
                      <p className="text-xs text-muted-foreground">{inf.tanggal}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm" style={{ color: "hsl(var(--success))" }}>Rp {inf.nominal.toLocaleString("id-ID")}</span>
                      {isAdmin && (
                        <button onClick={() => handleDelete(inf.id)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 size={14} /></button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ranking */}
        <Card className="shadow-md border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp size={18} className="text-primary" /> Total per Siswa
              </CardTitle>
              <div className="flex items-center gap-1">
                <ArrowUpDown size={14} className="text-muted-foreground" />
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as SortOption)}
                  className="text-xs rounded-md border border-border bg-background px-2 py-1 text-foreground"
                >
                  <option value="nominal-desc">Nominal Terbesar</option>
                  <option value="nominal-asc">Nominal Terkecil</option>
                  <option value="nama-asc">Nama A-Z</option>
                  <option value="nama-desc">Nama Z-A</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {rankingData.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-muted-foreground gap-2">
                <Inbox size={32} />
                <p className="text-sm">Belum ada data</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {rankingData.map((r, i) => (
                  <motion.div key={r.nama} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.01 }} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">{i + 1}</span>
                      <div>
                        <p className="font-medium text-foreground text-sm">{r.nama}</p>
                        <p className="text-xs text-muted-foreground">{r.count} transaksi</p>
                      </div>
                    </div>
                    <span className="font-bold text-sm" style={{ color: "hsl(var(--success))" }}>Rp {r.total.toLocaleString("id-ID")}</span>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}

function InfaqSkeleton() {
  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <Skeleton className="h-8 w-48 mx-auto mb-2" />
        <Skeleton className="h-4 w-64 mx-auto" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="shadow-md"><CardContent className="flex items-center gap-4 p-5"><Skeleton className="h-12 w-12 rounded-xl" /><div className="space-y-2"><Skeleton className="h-6 w-32" /><Skeleton className="h-4 w-20" /></div></CardContent></Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="shadow-md"><CardContent className="p-6 space-y-3">{Array.from({ length: 4 }).map((_, j) => <Skeleton key={j} className="h-12 w-full rounded-lg" />)}</CardContent></Card>
        ))}
      </div>
    </div>
  );
}
