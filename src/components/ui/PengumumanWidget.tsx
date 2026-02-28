import { useState, useEffect } from "react";
import { Megaphone, Pin, Clock, ChevronDown, ChevronUp, Loader2, AlertTriangle, Info, CalendarDays, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";

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
  penting: {
    label: "Penting",
    icon: AlertTriangle,
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    border: "border-l-red-500",
  },
  info: {
    label: "Info",
    icon: Info,
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    border: "border-l-blue-500",
  },
  acara: {
    label: "Acara",
    icon: CalendarDays,
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    border: "border-l-amber-500",
  },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days} hari lalu`;
  if (hours > 0) return `${hours} jam lalu`;
  if (mins > 0) return `${mins} menit lalu`;
  return "Baru saja";
}

function timeLeft(expiredAt: string) {
  const diff = new Date(expiredAt).getTime() - Date.now();
  if (diff <= 0) return null;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `Berakhir ${days} hari lagi`;
  if (hours > 0) return `Berakhir ${hours} jam lagi`;
  return "Berakhir hari ini";
}

export default function PengumumanWidget() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [pengumuman, setPengumuman] = useState<Pengumuman[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  useEffect(() => {
    const fetchPengumuman = async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("pengumuman")
        .select("*")
        .or(`expired_at.is.null,expired_at.gt.${now}`)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(10);
      if (!error && data) setPengumuman(data);
      setLoading(false);
    };
    fetchPengumuman();

    const channel = supabase
      .channel("pengumuman_widget_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "pengumuman" }, () => {
        fetchPengumuman();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl bg-card p-6 shadow-lg border border-border flex justify-center py-10">
        <Loader2 className="animate-spin text-primary" size={24} />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="rounded-xl bg-card shadow-lg border border-border overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Megaphone size={20} className="text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Pengumuman</h2>
          {pengumuman.length > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {pengumuman.length}
            </span>
          )}
        </div>

        {/* Hanya muncul saat login sebagai admin */}
        {isAdmin && (
          <Link
            to="/pengumuman"
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow shadow-primary/20"
          >
            <Plus size={13} /> Tambah Pengumuman
          </Link>
        )}
      </div>

      {/* List */}
      <div className="divide-y divide-border">
        {pengumuman.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-muted-foreground">
            <Megaphone size={36} className="mb-2 opacity-30" />
            <p className="text-sm">Belum ada pengumuman</p>
            {isAdmin && (
              <Link
                to="/pengumuman"
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Plus size={12} /> Buat Pengumuman Pertama
              </Link>
            )}
          </div>
        ) : (
          pengumuman.map((p) => {
            const config = kategoriConfig[p.kategori];
            const KategoriIcon = config.icon;
            const isExpanded = expandedId === p.id;
            const sisa = p.expired_at ? timeLeft(p.expired_at) : null;

            return (
              <motion.div
                key={p.id}
                layout
                className={`border-l-4 ${config.border} ${p.pinned ? "bg-muted/30" : ""}`}
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : p.id)}
                  className="w-full text-left px-5 py-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {p.pinned && (
                          <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                            <Pin size={10} className="fill-current" /> Disematkan
                          </span>
                        )}
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${config.className}`}>
                          <KategoriIcon size={10} />
                          {config.label}
                        </span>
                        {sisa && (
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Clock size={10} /> {sisa}
                          </span>
                        )}
                      </div>
                      <p className="font-semibold text-sm text-foreground leading-snug">{p.judul}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{timeAgo(p.created_at)}</p>
                    </div>
                    <div className="shrink-0 text-muted-foreground mt-1">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-4">
                        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                          {p.isi}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}