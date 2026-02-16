import { useState } from "react";
import { Search, User as UserIcon, Loader2, AlertCircle, Users } from "lucide-react";
import { motion } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import { useSiswa } from "@/hooks/use-supabase-data";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, scale: 0.95 }, show: { opacity: 1, scale: 1 } };

export default function Siswa() {
  const [search, setSearch] = useState("");
  const { data: siswaData = [], isLoading, isError, error } = useSiswa();

  const filtered = siswaData.filter((s) =>
    s.nama?.toLowerCase().includes(search.toLowerCase()) ||
    String(s.no_absen).includes(search)
  );

  return (
    <PageTransition>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Data Rombel</h1>
        <p className="text-muted-foreground">Daftar seluruh siswa rombel PPLG X-1</p>
      </div>

      <div className="flex justify-center mb-8">
        <div className="relative w-full max-w-md">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama siswa..."
            className="w-full rounded-full border border-border bg-card pl-11 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <AlertCircle size={40} className="text-destructive" />
          <p className="text-lg font-medium">Gagal memuat data siswa</p>
          <p className="text-sm max-w-md text-center">
            {error?.message?.includes("YOUR_PROJECT_ID") || error?.message?.includes("Failed to fetch")
              ? "Pastikan kredensial Supabase (URL dan Anon Key) sudah diisi dengan benar di src/lib/supabase.ts"
              : error?.message || "Periksa koneksi internet atau konfigurasi database."}
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <Users size={40} />
          <p className="text-lg font-medium">{search ? "Tidak ada siswa ditemukan" : "Belum ada data siswa"}</p>
          <p className="text-sm">{search ? "Coba kata kunci lain." : "Data siswa belum ditambahkan ke database."}</p>
        </div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filtered.map((s) => (
            <motion.div
              key={s.id}
              variants={item}
              className="relative rounded-xl bg-card border border-border shadow-md overflow-hidden hover:scale-105 transition-transform"
            >
              <span className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                {s.no_absen}
              </span>
              <div className="flex flex-col items-center p-6 pt-8">
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                  {s.avatar_url ? (
                    <img src={s.avatar_url} alt={s.nama} className="h-20 w-20 rounded-full object-cover" />
                  ) : (
                    <UserIcon size={32} className="text-muted-foreground" />
                  )}
                </div>
                <p className="font-semibold text-foreground text-center">{s.nama}</p>
                <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  s.gender === "L" ? "bg-primary/10 text-primary" : "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300"
                }`}>
                  {s.gender === "L" ? "👦 Laki-laki" : "👧 Perempuan"}
                </span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </PageTransition>
  );
}
