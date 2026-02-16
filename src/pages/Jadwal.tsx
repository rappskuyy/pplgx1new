import { useState, useEffect } from "react";
import { BookOpen, Clock, User, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import { useSchedules } from "@/hooks/use-supabase-data";

const daysOfWeek = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"];

// Function untuk detect minggu berdasarkan tanggal
function getMingguAkademik(date: Date): "ganjil" | "genap" {
  // Asumsi: Tahun akademik dimulai bulan Juli
  // Bulan 7-12 = ganjil, Bulan 1-6 = genap
  const month = date.getMonth() + 1;
  return month >= 7 ? "ganjil" : "genap";
}

export default function Jadwal() {
  const today = new Date();
  const [minggu, setMinggu] = useState<"ganjil" | "genap">(getMingguAkademik(today));
  const initialHari = (() => {
    const dow = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    return dow >= 1 && dow <= 5 ? daysOfWeek[dow - 1] : "Senin";
  })();
  const [hari, setHari] = useState(initialHari);
  const { data: allSchedules = [], isLoading } = useSchedules(minggu);
  const schedule = allSchedules.filter((s) => s.hari === hari);

  return (
    <PageTransition>
      <div className="text-center mb-8">
        <BookOpen size={40} className="mx-auto mb-3 text-primary" />
        <h1 className="text-3xl font-bold text-foreground mb-2">Jadwal Pelajaran</h1>
        <p className="text-muted-foreground">Jadwal pelajaran rombel PPLG X-1</p>
        <div className="flex justify-center gap-2 mt-3">
          <span className="text-xs px-3 py-1 rounded-full bg-card text-muted-foreground border border-border">Minggu: {minggu === "ganjil" ? "Ganjil" : "Genap"}</span>
          <span className="text-xs px-3 py-1 rounded-full bg-card text-muted-foreground border border-border">Hari: {hari}</span>
        </div>
      </div>

      {/* Minggu toggle */}
      <div className="flex justify-center gap-3 mb-6">
        {(["ganjil", "genap"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMinggu(m)}
            className={`rounded-lg px-6 py-2.5 text-sm font-medium transition-all ${
              minggu === m ? "bg-primary text-primary-foreground shadow-lg" : "bg-card text-muted-foreground border border-border hover:bg-muted"
            }`}
          >
            Minggu {m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>

      {/* Day buttons */}
      <div className="flex justify-center gap-2 mb-8 flex-wrap">
        {daysOfWeek.map((d) => (
          <button
            key={d}
            onClick={() => setHari(d)}
            className={`rounded-lg px-5 py-2 text-sm font-medium transition-all ${
              hari === d ? "bg-primary text-primary-foreground shadow-lg" : "bg-card text-muted-foreground border border-border hover:bg-muted"
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Schedule List */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={`${minggu}-${hari}`} className="space-y-3 max-w-2xl mx-auto">
          {schedule.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Tidak ada jadwal</div>
          ) : (
            schedule.map((j, i) => (
              <motion.div
                key={j.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex items-center gap-4 rounded-xl bg-card p-4 shadow-md border border-border hover:shadow-lg transition-shadow"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold">{i + 1}</span>
                <div className="flex-1">
                  <p className="font-semibold text-foreground flex items-center gap-2">
                    <BookOpen size={16} className="text-primary" /> {j.mata_pelajaran}
                  </p>
                  <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                    <span className="flex items-center gap-1"><Clock size={12} /> {j.jam}</span>
                    <span className="flex items-center gap-1"><User size={12} /> {j.guru}</span>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </motion.div>
      )}
    </PageTransition>
  );
}
