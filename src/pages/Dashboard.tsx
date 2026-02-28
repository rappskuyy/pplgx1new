import { Link } from "react-router-dom";
import { Users, ClipboardList, Calendar, BookOpen, Clock, User, Loader2, Quote, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import PageTransition from "@/components/PageTransition";
import { useSiswa, useSchedules, useTasks, useQuotes } from "@/hooks/use-supabase-data";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

// Function untuk detect minggu berdasarkan tanggal
function getMingguAkademik(date: Date): "ganjil" | "genap" {
  const month = date.getMonth() + 1;
  return month >= 7 ? "ganjil" : "genap";
}

// Hook untuk rotasi quote otomatis
function useRotatingQuote(quotes: { id: string; text: string; author: string }[], intervalMs = 60000) {
  const [index, setIndex] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);

  useEffect(() => {
    if (quotes.length === 0) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % quotes.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [quotes.length, intervalMs]);

  const refresh = useCallback(() => {
    if (quotes.length === 0) return;
    setIsSpinning(true);
    setIndex((prev) => (prev + 1) % quotes.length);
    setTimeout(() => setIsSpinning(false), 600);
  }, [quotes.length]);

  return { quote: quotes[index] ?? null, index, refresh, isSpinning };
}

export default function Dashboard() {
  const today = new Date();
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const todayName = days[today.getDay()];
  const currentMinggu = getMingguAkademik(today);

  const { data: siswaData = [], isLoading: loadingSiswa } = useSiswa();
  const { data: allSchedules = [], isLoading: loadingSchedule } = useSchedules(currentMinggu);
  const { data: allTasks = [], isLoading: loadingTasks } = useTasks();
  const { data: quotesData = [], isLoading: loadingQuotes } = useQuotes();

  const todaySchedule = allSchedules.filter((s) => s.hari === todayName);
  const activeTasks = allTasks.filter((t) => !t.selesai);
  const upcomingTasks = activeTasks.filter((t) => new Date(t.deadline) >= today);

  const isLoading = loadingSiswa || loadingSchedule || loadingTasks;

  // Rotating quote — ganti tiap 60 detik
  const { quote, refresh, isSpinning } = useRotatingQuote(quotesData, 60000);

  return (
    <PageTransition>
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 to-blue-400 p-8 md:p-12 text-white mb-8">
        <div className="relative z-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Selamat Datang di PPLG X-1</h1>
          <p className="text-blue-100 mb-6 text-lg">Portal manajemen rombel digital — akses jadwal, tugas, dan info kelas dengan mudah.</p>
          <div className="flex gap-3 flex-wrap">
            <Link to="/siswa" className="inline-flex items-center gap-2 rounded-full bg-white text-blue-700 px-6 py-2.5 text-sm font-semibold shadow hover:scale-105 transition-transform">
              <Users size={16} /> Lihat Anggota
            </Link>
            <Link to="/tugas" className="inline-flex items-center gap-2 rounded-full bg-blue-600 text-white px-6 py-2.5 text-sm font-semibold shadow hover:scale-105 transition-transform border border-blue-300/30">
              <ClipboardList size={16} /> Tugas Kelas
            </Link>
          </div>
        </div>
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
        <div className="absolute -right-5 -bottom-10 h-60 w-60 rounded-full bg-white/5" />
      </div>

      {/* Quote of the Minute */}
      {!loadingQuotes && quote && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative rounded-xl bg-gradient-to-r from-violet-500/10 to-blue-500/10 border border-violet-200 dark:border-violet-800 p-5 mb-8 flex items-start gap-4"
        >
          <Quote size={28} className="text-violet-400 shrink-0 mt-1" />
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={quote.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.4 }}
              >
                <p className="text-foreground italic leading-relaxed mb-1">"{quote.text}"</p>
                <p className="text-sm font-semibold text-violet-500">— {quote.author}</p>
              </motion.div>
            </AnimatePresence>
          </div>
          <button
            onClick={refresh}
            title="Ganti quote"
            className="shrink-0 rounded-lg p-2 text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors"
          >
            <RefreshCw size={18} className={isSpinning ? "animate-spin" : "transition-transform"} />
          </button>
        </motion.div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div>
      ) : (
        <>
          {/* Stats */}
          <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <motion.div variants={item} className="rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white shadow-lg hover:-translate-y-1 transition-transform">
              <div className="flex items-center gap-3 mb-3">
                <div className="rounded-lg bg-white/20 p-2"><User size={20} /></div>
                <span className="text-sm font-medium text-blue-100">Total Siswa</span>
              </div>
              <p className="text-4xl font-bold">{siswaData.length}</p>
              <p className="text-sm text-blue-200 mt-1">Siswa terdaftar</p>
            </motion.div>
            <motion.div variants={item} className="rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 p-6 text-white shadow-lg hover:-translate-y-1 transition-transform">
              <div className="flex items-center gap-3 mb-3">
                <div className="rounded-lg bg-white/20 p-2"><ClipboardList size={20} /></div>
                <span className="text-sm font-medium text-cyan-100">Tugas Aktif</span>
              </div>
              <p className="text-4xl font-bold">{activeTasks.length}</p>
              <p className="text-sm text-cyan-200 mt-1">Belum dikerjakan</p>
            </motion.div>
            <motion.div variants={item} className="rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 p-6 text-white shadow-lg hover:-translate-y-1 transition-transform">
              <div className="flex items-center gap-3 mb-3">
                <div className="rounded-lg bg-white/20 p-2"><Calendar size={20} /></div>
                <span className="text-sm font-medium text-violet-100">Jadwal Hari Ini</span>
              </div>
              <p className="text-4xl font-bold">{todaySchedule.length}</p>
              <p className="text-sm text-violet-200 mt-1">{todayName}</p>
            </motion.div>
          </motion.div>

          {/* Bottom 2 cols */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="rounded-xl bg-card p-6 shadow-lg border border-border">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen size={20} className="text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Jadwal Hari Ini</h2>
              </div>
              {todaySchedule.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-muted-foreground">
                  <Calendar size={40} className="mb-2 opacity-40" />
                  <p>Tidak ada jadwal hari ini</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todaySchedule.map((j, i) => (
                    <div key={j.id} className="flex items-center gap-4 rounded-lg bg-muted/50 p-3 hover:bg-muted transition-colors">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">{i + 1}</span>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{j.mata_pelajaran}</p>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock size={12} /> {j.jam}</span>
                          <span>{j.guru}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="rounded-xl bg-card p-6 shadow-lg border border-border">
              <div className="flex items-center gap-2 mb-4">
                <ClipboardList size={20} className="text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Tugas Mendatang</h2>
              </div>
              {upcomingTasks.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-muted-foreground">
                  <ClipboardList size={40} className="mb-2 opacity-40" />
                  <p>Tidak ada tugas mendatang</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingTasks.map((t) => (
                    <div key={t.id} className="flex items-start gap-3 rounded-lg bg-muted/50 p-3 hover:bg-muted transition-colors">
                      <div className="mt-0.5 rounded-lg bg-accent/20 p-2"><ClipboardList size={16} className="text-accent" /></div>
                      <div>
                        <p className="font-medium text-foreground">{t.judul}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1"><Calendar size={12} /> Deadline: {t.deadline?.split("T")[0]}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </PageTransition>
  );
}