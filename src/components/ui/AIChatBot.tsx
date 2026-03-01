import { useState, useRef, useEffect } from "react";
import { Bot, X, Send, Loader2, Minimize2, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";

// =============================================
// KONFIGURASI
// =============================================
const AI_NAME = "Asist X1";
const KELAS = "PPLG X-1 SMK Wikrama Bogor";
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const OPENROUTER_MODEL = "openai/gpt-5.3-codex";
// =============================================

interface Message {
  role: "user" | "assistant";
  content: string;
  links?: { label: string; to: string }[];
}

interface SiswaDetail {
  nama: string;
  gender: string;
  no_absen: number;
  badge?: string | null;
  bio?: string | null;
  hobi?: string | null;
  motto?: string | null;
  instagram?: string | null;
}

interface KelasData {
  jumlahSiswa: number;
  totalInfaq: number;
  tugasAktif: number;
  jadwalHariIni: string[];
  namaSiswa: string[];
  siswaDetail: SiswaDetail[];
  kelompokList: { nama: string; anggota: string[] }[];
  tugasList: { judul: string; mapel: string; deadline: string; selesai: boolean }[];
  strukturList: { jabatan: string; nama: string }[];
  pengumumanList: { judul: string; isi: string; kategori: string }[];
  jadwalMingguIni: { hari: string; mapel: string; jam: string; guru: string }[];
  developerStack: string;
}

async function fetchKelasData(): Promise<KelasData> {
  const today = new Date();
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const todayName = days[today.getDay()];
  const month = today.getMonth() + 1;
  const minggu = month >= 7 ? "ganjil" : "genap";
  const now = new Date().toISOString();

  const [
    siswaRes, infaqRes, tugasRes, jadwalHariRes,
    groupsRes, membersRes, strukturRes, pengumumanRes,
    jadwalMingguRes, tugasAllRes,
  ] = await Promise.allSettled([
    supabase.from("profiles").select("id, nama, gender, no_absen, badge, bio, hobi, motto, instagram", { count: "exact" }),
    supabase.from("infaq_transactions").select("nominal"),
    supabase.from("tasks").select("id", { count: "exact" }).eq("selesai", false),
    supabase.from("schedules").select("mata_pelajaran, jam, guru").eq("hari", todayName).eq("minggu", minggu).order("urutan"),
    supabase.from("groups").select("id, nama").order("id"),
    supabase.from("group_members").select("group_id, profile_id"),
    supabase.from("class_structure").select("jabatan, nama").order("urutan"),
    supabase.from("pengumuman").select("judul, isi, kategori").or(`expired_at.is.null,expired_at.gt.${now}`).order("pinned", { ascending: false }).order("created_at", { ascending: false }).limit(5),
    supabase.from("schedules").select("hari, mata_pelajaran, jam, guru").eq("minggu", minggu).order("urutan"),
    supabase.from("tasks").select("judul, mata_pelajaran, deadline, selesai").order("deadline").limit(20),
  ]);

  const siswa = siswaRes.status === "fulfilled" ? siswaRes.value : { data: [], count: 0 };
  const infaq = infaqRes.status === "fulfilled" ? infaqRes.value : { data: [] };
  const tugas = tugasRes.status === "fulfilled" ? tugasRes.value : { count: 0 };
  const jadwalHari = jadwalHariRes.status === "fulfilled" ? (jadwalHariRes.value.data ?? []) : [];
  const groups = groupsRes.status === "fulfilled" ? (groupsRes.value.data ?? []) : [];
  const members = membersRes.status === "fulfilled" ? (membersRes.value.data ?? []) : [];
  const struktur = strukturRes.status === "fulfilled" ? (strukturRes.value.data ?? []) : [];
  const pengumuman = pengumumanRes.status === "fulfilled" ? (pengumumanRes.value.data ?? []) : [];
  const jadwalMinggu = jadwalMingguRes.status === "fulfilled" ? (jadwalMingguRes.value.data ?? []) : [];
  const tugasAll = tugasAllRes.status === "fulfilled" ? (tugasAllRes.value.data ?? []) : [];

  const totalInfaq = (infaq.data ?? []).reduce(
    (sum: number, row: { nominal: number }) => sum + (row.nominal ?? 0), 0
  );

  const namaMap: Record<string, string> = {};
  (siswa.data ?? []).forEach((s: any) => { namaMap[s.id] = s.nama; });

  const kelompokList = groups.map((g: any) => ({
    nama: g.nama,
    anggota: members
      .filter((m: any) => m.group_id === g.id)
      .map((m: any) => namaMap[m.profile_id] || "Unknown"),
  }));

  const siswaDetail: SiswaDetail[] = (siswa.data ?? []).map((s: any) => ({
    nama: s.nama,
    gender: s.gender === "L" ? "Laki-laki" : "Perempuan",
    no_absen: s.no_absen,
    badge: s.badge || null,
    bio: s.bio || null,
    hobi: s.hobi || null,
    motto: s.motto || null,
    instagram: s.instagram || null,
  }));

  return {
    jumlahSiswa: siswa.count ?? (siswa.data?.length ?? 0),
    totalInfaq,
    tugasAktif: tugas.count ?? 0,
    jadwalHariIni: jadwalHari.map((j: any) => `${j.mata_pelajaran} (${j.jam}, ${j.guru})`),
    namaSiswa: (siswa.data ?? []).map((s: any) => s.nama).filter(Boolean),
    siswaDetail,
    kelompokList,
    tugasList: tugasAll.map((t: any) => ({
      judul: t.judul,
      mapel: t.mata_pelajaran || "-",
      deadline: t.deadline?.split("T")[0] || "-",
      selesai: t.selesai,
    })),
    strukturList: struktur.map((s: any) => ({ jabatan: s.jabatan, nama: s.nama })),
    pengumumanList: pengumuman.map((p: any) => ({ judul: p.judul, isi: p.isi, kategori: p.kategori })),
    jadwalMingguIni: jadwalMinggu.map((j: any) => ({
      hari: j.hari, mapel: j.mata_pelajaran, jam: j.jam, guru: j.guru,
    })),
    developerStack: "React, TypeScript, Tailwind CSS, Supabase",
  };
}

async function askOpenRouter(userMessage: string, kelasData: KelasData, history: Message[]): Promise<string> {
  const month = new Date().getMonth() + 1;
  const minggu = month >= 7 ? "ganjil" : "genap";

  const siswaDetailText = kelasData.siswaDetail.length > 0
    ? kelasData.siswaDetail.map((s) => {
        const info = [`- ${s.nama} (No.${s.no_absen}, ${s.gender}${s.badge ? ", badge: " + s.badge : ""})`];
        if (s.hobi) info.push(`  Hobi: ${s.hobi}`);
        if (s.bio) info.push(`  Bio: ${s.bio}`);
        if (s.motto) info.push(`  Motto: ${s.motto}`);
        if (s.instagram) info.push(`  Instagram: @${s.instagram}`);
        return info.join("\n");
      }).join("\n")
    : "data tidak tersedia";

  const systemContext = `Kamu adalah ${AI_NAME}, asisten AI resmi rombel ${KELAS} di SMK Wikrama Bogor.
Kamu hanya menjawab pertanyaan seputar rombel (Rombongan Belajar) ${KELAS}.
Jika ditanya siapa kamu atau AI apa, jawab bahwa kamu adalah ${AI_NAME}, asisten rombel ${KELAS}. Jangan pernah sebut nama AI atau perusahaan lain.
Jawab dengan ramah, singkat, santai, boleh campur bahasa gaul/indonesia. Gunakan emoji yang relevan.
Kalau ditanya info siswa tertentu atau pertanyaan seperti "siapa yang hobi X", "siapa yang mottonya Y", cari dari DATA DETAIL SISWA.

DATA ROMBEL:
- Jumlah siswa: ${kelasData.jumlahSiswa} siswa
- Total infaq: Rp ${kelasData.totalInfaq.toLocaleString("id-ID")}
- Tugas belum selesai: ${kelasData.tugasAktif}

DATA DETAIL SISWA:
${siswaDetailText}

JADWAL HARI INI:
${kelasData.jadwalHariIni.length > 0 ? kelasData.jadwalHariIni.map((j) => "- " + j).join("\n") : "- Tidak ada jadwal"}

JADWAL SEMINGGU (${minggu}):
${[...new Set(kelasData.jadwalMingguIni.map((j: any) => j.hari))].map((hari: string) => hari + ": " + kelasData.jadwalMingguIni.filter((j: any) => j.hari === hari).map((j: any) => j.mapel + " (" + j.jam + ", " + j.guru + ")").join(", ")).join("\n") || "data tidak tersedia"}

TUGAS:
${kelasData.tugasList.length > 0 ? kelasData.tugasList.map((t: any) => "- " + t.judul + " | " + t.mapel + " | deadline: " + t.deadline + " | " + (t.selesai ? "selesai" : "belum")).join("\n") : "tidak ada tugas"}

STRUKTUR ROMBEL:
${kelasData.strukturList.length > 0 ? kelasData.strukturList.map((s: any) => "- " + s.jabatan + ": " + s.nama).join("\n") : "data tidak tersedia"}

KELOMPOK BELAJAR:
${kelasData.kelompokList.length > 0 ? kelasData.kelompokList.map((k: any) => "- " + k.nama + ": " + k.anggota.join(", ")).join("\n") : "data tidak tersedia"}

PENGUMUMAN TERBARU:
${kelasData.pengumumanList.length > 0 ? kelasData.pengumumanList.map((p: any) => "- [" + p.kategori.toUpperCase() + "] " + p.judul + ": " + p.isi).join("\n") : "tidak ada pengumuman"}

TENTANG ROMBEL PPLG X-1:
- Nama rombel: PPLG X-1 (Pengembangan Perangkat Lunak dan Gim)
- Sekolah: SMK Wikrama Bogor
- Deskripsi: Rombel jurusan PPLG yang berfokus pada pengembangan kemampuan siswa di bidang teknologi informasi, pemrograman, software development, UI/UX, dan game development.
- Kurikulum: Mengikuti standar industri terkini, project-based learning
- Bahasa pemrograman yang dipelajari: JavaScript, PHP, Python, HTML, CSS
- Tools: Git, Figma, MySQL
- Jumlah siswa aktif: 35 siswa
- Project selesai: 7+
- Visi: Menjadi rombel unggulan yang menghasilkan lulusan developer berkompeten, berkarakter, dan berdaya saing global
- Misi: Menciptakan lingkungan belajar kolaboratif & inovatif, mengembangkan skill coding, membangun portofolio nyata, mendorong partisipasi kompetisi & hackathon
- Nilai-nilai: Inovatif, Disiplin, Kolaboratif, Berwawasan Global, Tech-Savvy, Berkarakter

INFO TAMBAHAN:
- Guru favorit: Bu Nurul
- Developer website: Raffasya Javas Niscala Widjaja, Cendikia Prananta Ardian, Ahmad Rhezki Prasetya, Muhammad Fedliansyah Ilham
- Tech stack website: React, TypeScript, Tailwind CSS, Supabase

Tolak pertanyaan di luar topik rombel ${KELAS} dengan sopan.`;

  const openRouterHistory = history.slice(-6).map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content,
  }));

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": window.location.origin,
      "X-Title": AI_NAME,
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        { role: "system", content: systemContext },
        ...openRouterHistory,
        { role: "user", content: userMessage },
      ],
      max_tokens: 200,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message ?? `HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "Maaf, aku tidak bisa menjawab sekarang 😅";
}

// =============================================
// detectLinks yang lebih presisi pakai \b word boundary
// =============================================
function detectLinks(message: string, userMsg: string): { label: string; to: string }[] {
  const links: { label: string; to: string }[] = [];
  const combined = (message + " " + userMsg).toLowerCase();

  if (combined.match(/\bdaftar siswa\b|\bdata siswa\b|\bprofil siswa\b|\blihat siswa\b|\bno absen\b/)) links.push({ label: "📋 Lihat Data Siswa", to: "/siswa" });
  if (combined.match(/\binfaq\b|\bkas kelas\b|\biuran\b|\bdana kelas\b/)) links.push({ label: "💰 Lihat Infaq", to: "/infaq" });
  if (combined.match(/\btugas\b|\bdeadline\b|\bpr kelas\b|\bcollect\b/)) links.push({ label: "📝 Lihat Tugas", to: "/tugas" });
  if (combined.match(/\bjadwal\b|\bjam pelajaran\b|\bmata pelajaran hari\b/)) links.push({ label: "📅 Lihat Jadwal", to: "/jadwal" });
  if (combined.match(/\bkelompok belajar\b|\bgrup belajar\b|\bpembagian kelompok\b/)) links.push({ label: "👥 Lihat Kelompok", to: "/kelompok" });
  if (combined.match(/\bgaleri\b|\bfoto kelas\b|\bdokumentasi kelas\b/)) links.push({ label: "🖼️ Lihat Galeri", to: "/galeri" });
  if (combined.match(/\bpengumuman\b|\binfo kelas\b|\bberita kelas\b/)) links.push({ label: "📢 Lihat Pengumuman", to: "/pengumuman" });
  if (combined.match(/\bstruktur kelas\b|\bketua kelas\b|\bwakil kelas\b|\bpengurus kelas\b/)) links.push({ label: "🏫 Lihat Struktur", to: "/struktur" });
  if (combined.match(/\btentang kelas\b|\bvisi misi\b|\bsejarah kelas\b|\bpplg x-1 itu\b|\btentang rombel\b/)) links.push({ label: "ℹ️ Tentang Kelas", to: "/tentang" });

  return links.slice(0, 2);
}

// =============================================
// MAIN COMPONENT
// =============================================
export default function AIChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Halo! Aku ${AI_NAME}, asisten rombel ${KELAS} 👋\nTanyain apa aja soal kelas kita ya!`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [kelasData, setKelasData] = useState<KelasData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  useEffect(() => {
    fetchKelasData().then(setKelasData).catch(console.error);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        inputRef.current?.focus();
      }, 100);
    }
  }, [open, messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setErrorMsg(null);
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);
    try {
      const data = kelasData ?? (await fetchKelasData());
      if (!kelasData) setKelasData(data);
      const reply = await askOpenRouter(userMsg, data, messages);
      const links = detectLinks(reply, userMsg);
      setMessages((prev) => [...prev, { role: "assistant", content: reply, links }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      setErrorMsg(msg);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Aduh, ada error nih 😅\nCoba lagi ya!` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Chat Window */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={`
              fixed z-[9998] flex flex-col bg-background border border-border shadow-2xl overflow-hidden
              ${isMobile
                ? "inset-0 rounded-none"
                : "bottom-6 right-6 w-[380px] h-[520px] rounded-2xl"
              }
            `}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white shrink-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
                <Bot size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm leading-tight">{AI_NAME}</p>
                <p className="text-[11px] text-blue-100">Asisten rombel {KELAS}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full p-1.5 hover:bg-white/20 transition-colors"
              >
                {isMobile ? <X size={20} /> : <Minimize2 size={18} />}
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`flex gap-2 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                    {msg.role === "assistant" && (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40 mt-1">
                        <Bot size={14} className="text-blue-600 dark:text-blue-400" />
                      </div>
                    )}
                    <div>
                      <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                        msg.role === "user"
                          ? "bg-blue-600 text-white rounded-tr-sm"
                          : "bg-muted text-foreground rounded-tl-sm"
                      }`}>
                        {msg.content}
                      </div>
                      {msg.links && msg.links.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-1.5">
                          {msg.links.map((link, j) => (
                            <Link
                              key={j}
                              to={link.to}
                              onClick={() => setOpen(false)}
                              className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-800 transition-colors hover:bg-blue-100"
                            >
                              {link.label} <ExternalLink size={10} />
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="flex gap-2 items-center">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40">
                      <Bot size={14} className="text-blue-600" />
                    </div>
                    <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                      <div className="flex gap-1 items-center">
                        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0ms]" />
                        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:150ms]" />
                        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:300ms]" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-3 py-3 border-t border-border bg-background shrink-0">
              {errorMsg && (
                <p className="text-[11px] text-red-500 mb-1.5 px-1">⚠️ {errorMsg}</p>
              )}
              <div className="flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1.5 focus-within:border-blue-400 transition-colors">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  placeholder={`Tanya ${AI_NAME}...`}
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white disabled:opacity-40 hover:bg-blue-700 transition-colors"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                </button>
              </div>
              <p className="text-center text-[10px] text-muted-foreground/50 mt-1.5">
                {AI_NAME} · Asisten rombel {KELAS}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB Button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center rounded-full shadow-lg bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:shadow-xl transition-shadow w-14 h-14 relative group"
      >
        <Bot size={22} />
        <div className="absolute right-16 top-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
          <div className="bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-lg">
            Tanya Asist X1
            <div className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-gray-900" />
          </div>
        </div>
      </button>
    </>
  );
}