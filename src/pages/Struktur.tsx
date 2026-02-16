import { User, Loader2, Crown, AlertCircle } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import { motion } from "framer-motion";
import { useStruktur } from "@/hooks/use-supabase-data";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Struktur() {
  const { data: strukturData = [], isLoading, isError } = useStruktur();

  const ketua = strukturData.find((s) => s.jabatan === "Ketua Kelas");
  const wakil = strukturData.find((s) => s.jabatan === "Wakil Ketua");
  const pengurus = strukturData.filter(
    (s) => s.jabatan !== "Ketua Kelas" && s.jabatan !== "Wakil Ketua"
  );

  return (
    <PageTransition>
      <div className="text-center mb-10">
        <Crown size={40} className="mx-auto mb-3 text-primary" />
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Struktur Organisasi Rombel
        </h1>
        <p className="text-muted-foreground">
          Pengurus Rombel PPLG X-1 Tahun Ajaran 2025/2026
        </p>
      </div>

      {isLoading ? (
        <StrukturSkeleton />
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <AlertCircle size={40} className="text-destructive" />
          <p className="text-lg font-medium">Gagal memuat data struktur</p>
          <p className="text-sm">Periksa koneksi internet atau konfigurasi database.</p>
        </div>
      ) : strukturData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <User size={40} />
          <p className="text-lg font-medium">Belum ada data struktur</p>
          <p className="text-sm">Data pengurus kelas belum ditambahkan.</p>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Ketua */}
          {ketua && (
            <div className="flex justify-center">
              <StrukturCard data={ketua} index={0} featured />
            </div>
          )}

          {/* Wakil */}
          {wakil && (
            <div className="flex justify-center">
              <StrukturCard data={wakil} index={1} />
            </div>
          )}

          {/* Pengurus lainnya */}
          {pengurus.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {pengurus.map((s, i) => (
                <StrukturCard key={s.id} data={s} index={i + 2} />
              ))}
            </div>
          )}
        </div>
      )}
    </PageTransition>
  );
}

interface StrukturCardProps {
  data: { id: string; jabatan: string; nama: string; avatar_url: string | null };
  index: number;
  featured?: boolean;
}

function StrukturCard({ data, index, featured }: StrukturCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className={featured ? "w-full max-w-xs" : "w-full"}
    >
      <Card className="rounded-[20px] shadow-md hover:shadow-lg transition-shadow border border-border bg-card overflow-hidden">
        <CardContent className="flex flex-col items-center p-6">
          <div className={`mb-4 rounded-full border-[3px] border-primary p-1 ${featured ? "h-24 w-24" : "h-20 w-20"}`}>
            {data.avatar_url ? (
              <img
                src={data.avatar_url}
                alt={data.nama}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-full bg-muted">
                <User size={featured ? 32 : 28} className="text-muted-foreground" />
              </div>
            )}
          </div>
          <span className="inline-block rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground mb-2">
            {data.jabatan}
          </span>
          <p className={`font-bold text-foreground text-center ${featured ? "text-lg" : "text-base"}`}>
            {data.nama}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function StrukturSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex justify-center">
        <div className="w-full max-w-xs">
          <Card className="rounded-[20px]">
            <CardContent className="flex flex-col items-center p-6">
              <Skeleton className="h-24 w-24 rounded-full mb-4" />
              <Skeleton className="h-5 w-24 rounded-full mb-2" />
              <Skeleton className="h-5 w-32" />
            </CardContent>
          </Card>
        </div>
      </div>
      <div className="flex justify-center">
        <div className="w-full max-w-xs">
          <Card className="rounded-[20px]">
            <CardContent className="flex flex-col items-center p-6">
              <Skeleton className="h-20 w-20 rounded-full mb-4" />
              <Skeleton className="h-5 w-24 rounded-full mb-2" />
              <Skeleton className="h-5 w-32" />
            </CardContent>
          </Card>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="rounded-[20px]">
            <CardContent className="flex flex-col items-center p-6">
              <Skeleton className="h-20 w-20 rounded-full mb-4" />
              <Skeleton className="h-5 w-24 rounded-full mb-2" />
              <Skeleton className="h-5 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
