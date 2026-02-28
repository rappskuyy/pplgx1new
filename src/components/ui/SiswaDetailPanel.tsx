import { X, Instagram, Phone, Heart, Sparkles, FileText, User, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SiswaProfile {
  id: string;
  nama: string;
  gender: string;
  no_absen: number;
  avatar_url: string | null;
  badge?: string;
  bio?: string | null;
  hobi?: string | null;
  instagram?: string | null;
  whatsapp?: string | null;
  motto?: string | null;
}

interface SiswaDetailPanelProps {
  siswa: SiswaProfile | null;
  onClose: () => void;
}

const getColor = (nama: string) => {
  const colors = [
    "from-blue-500 to-blue-600",
    "from-purple-500 to-purple-600",
    "from-green-500 to-green-600",
    "from-amber-500 to-amber-600",
    "from-pink-500 to-pink-600",
    "from-cyan-500 to-cyan-600",
    "from-rose-500 to-rose-600",
    "from-indigo-500 to-indigo-600",
  ];
  let hash = 0;
  for (const ch of nama) hash = ch.charCodeAt(0) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

export default function SiswaDetailPanel({ siswa, onClose }: SiswaDetailPanelProps) {
  return (
    <AnimatePresence>
      {siswa && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Slide Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 h-full w-full max-w-sm z-50 bg-card shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header gradient */}
            <div className={`relative bg-gradient-to-br ${getColor(siswa.nama)} p-6 pb-16 text-white`}>
              <button
                onClick={onClose}
                className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              >
                <X size={16} />
              </button>
              <p className="text-white/70 text-sm mb-1">No. Absen {siswa.no_absen}</p>
              <h2 className="text-2xl font-bold">{siswa.nama}</h2>
              <p className="text-white/80 text-sm mt-0.5">{siswa.gender === "L" ? "Laki-laki" : "Perempuan"}</p>
              {siswa.badge && (
                <span className="inline-flex items-center gap-1 mt-2 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 px-2.5 py-0.5 text-xs font-bold text-yellow-900 shadow-md">
              👑 {siswa.badge.toUpperCase()}
            </span>
              )}
            </div>

            {/* Avatar — overlap header */}
            <div className="relative px-6">
              <div className="absolute -top-10 left-6">
                <div className="h-20 w-20 rounded-2xl overflow-hidden ring-4 ring-card shadow-xl">
                  {siswa.avatar_url ? (
                    <img src={siswa.avatar_url} alt={siswa.nama} className="h-full w-full object-cover" />
                  ) : (
                    <div className={`h-full w-full bg-gradient-to-br ${getColor(siswa.nama)} flex items-center justify-center text-white text-2xl font-bold`}>
                      {siswa.nama.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 pt-14 pb-6 space-y-4">

              {/* Motto */}
              {siswa.motto && (
                <div className="rounded-xl bg-primary/5 border border-primary/10 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles size={14} className="text-primary" />
                    <span className="text-xs font-semibold text-primary uppercase tracking-wide">Motto</span>
                  </div>
                  <p className="text-sm text-foreground italic">"{siswa.motto}"</p>
                </div>
              )}

              {/* Bio */}
              {siswa.bio && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <FileText size={14} className="text-muted-foreground" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tentang</span>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{siswa.bio}</p>
                </div>
              )}

              {/* Hobi */}
              {siswa.hobi && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Heart size={14} className="text-muted-foreground" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Hobi</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {siswa.hobi.split(",").map((h, i) => (
                      <span key={i} className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground">
                        {h.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Sosial */}
              {(siswa.instagram || siswa.whatsapp) && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <User size={14} className="text-muted-foreground" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Kontak & Sosial</span>
                  </div>
                  <div className="space-y-2">
                    {siswa.instagram && (
                      <a
                        href={`https://instagram.com/${siswa.instagram}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 rounded-xl border border-border p-3 hover:bg-muted transition-colors group"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 text-white">
                          <Instagram size={14} />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground">Instagram</p>
                          <p className="text-sm font-medium text-foreground">@{siswa.instagram}</p>
                        </div>
                        <ExternalLink size={13} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                    )}
                    {siswa.whatsapp && (
                      <a
                        href={`https://wa.me/${siswa.whatsapp.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 rounded-xl border border-border p-3 hover:bg-muted transition-colors group"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500 text-white">
                          <Phone size={14} />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground">WhatsApp</p>
                          <p className="text-sm font-medium text-foreground">{siswa.whatsapp}</p>
                        </div>
                        <ExternalLink size={13} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Empty state kalau belum isi profil */}
              {!siswa.bio && !siswa.hobi && !siswa.instagram && !siswa.whatsapp && !siswa.motto && (
                <div className="flex flex-col items-center py-8 text-center text-muted-foreground">
                  <User size={36} className="mb-2 opacity-30" />
                  <p className="text-sm">Belum ada info profil</p>
                  <p className="text-xs mt-1 opacity-70">Siswa ini belum melengkapi profilnya</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}