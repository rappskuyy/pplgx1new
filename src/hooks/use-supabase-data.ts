import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  siswaData as mockSiswa,
  jadwalData as mockJadwal,
  tugasData as mockTugas,
  infaqData as mockInfaq,
  kelompokData as mockKelompok,
  quotesData as mockQuotes,
  galeriData as mockGaleri,
  strukturData as mockStruktur,
} from "@/lib/mock-data";

// ==================== TYPES ====================
export interface Siswa {
  id: string;
  nama: string;
  gender: string;
  no_absen: number;
  avatar_url: string | null;
  badge?: string;
}

export interface Schedule {
  id: string;
  minggu: string;
  hari: string;
  mata_pelajaran: string;
  jam: string;
  guru: string;
  urutan: number;
}

export interface Task {
  id: string;
  judul: string;
  deskripsi: string;
  deadline: string;
  selesai: boolean;
  mata_pelajaran: string;
  created_at: string;
}

export interface InfaqTransaction {
  id: string;
  siswa_id: string;
  siswa_nama: string;
  nominal: number;
  tanggal: string;
  created_at: string;
}

export interface Group {
  id: string;
  nama: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  profile_id: string;
  siswa_nama: string;
}

export interface GroupWithMembers extends Group {
  anggota: string[];
  mapel?: string[];
}

export interface QuoteItem {
  id: string;
  text: string;
  author: string;
}

export interface GalleryItem {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  created_at: string;
}

export interface StrukturItem {
  id: string;
  jabatan: string;
  nama: string;
  avatar_url: string | null;
  urutan: number;
}

// ==================== HOOKS ====================

export function useSiswa() {
  return useQuery({
    queryKey: ["siswa"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, nama, gender, no_absen, avatar_url, badge")
          .order("no_absen");
        if (error) throw error;
        if (data && data.length > 0) return data as Siswa[];
        // Fallback to mock data if empty
        return mockSiswa as unknown as Siswa[];
      } catch (err) {
        console.warn("Supabase fetch failed, using mock data:", err);
        return mockSiswa as unknown as Siswa[];
      }
    },
  });
}

export function useSchedules(minggu: string) {
  return useQuery({
    queryKey: ["schedules", minggu],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("schedules")
          .select("*")
          .eq("minggu", minggu)
          .order("urutan");
        if (error) throw error;
        if (data && data.length > 0) return data as Schedule[];
        // Fallback to mock data
        const mockSchedules = (mockJadwal[minggu as keyof typeof mockJadwal] || {});
        return Object.entries(mockSchedules).flatMap(([hari, items]) =>
          items.map((item, idx) => ({
            id: `${minggu}-${hari}-${idx}`,
            minggu,
            hari,
            mata_pelajaran: item.mapel,
            jam: item.jam,
            guru: item.guru,
            urutan: idx,
          }))
        ) as Schedule[];
      } catch (err) {
        console.warn("Schedule fetch failed, using mock data:", err);
        const mockSchedules = (mockJadwal[minggu as keyof typeof mockJadwal] || {});
        return Object.entries(mockSchedules).flatMap(([hari, items]) =>
          items.map((item, idx) => ({
            id: `${minggu}-${hari}-${idx}`,
            minggu,
            hari,
            mata_pelajaran: item.mapel,
            jam: item.jam,
            guru: item.guru,
            urutan: idx,
          }))
        ) as Schedule[];
      }
    },
  });
}

export function useTasks() {
  return useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("tasks")
          .select("*")
          .order("deadline");
        if (error) throw error;
        if (data && data.length > 0) return data as Task[];
        // Fallback to mock data
        return mockTugas.map((task) => ({
          id: String(task.id),
          judul: task.judul,
          deskripsi: task.deskripsi,
          deadline: task.deadline,
          selesai: task.selesai,
          mata_pelajaran: task.mapel,
          created_at: new Date().toISOString(),
        })) as Task[];
      } catch (err) {
        console.warn("Tasks fetch failed, using mock data:", err);
        return mockTugas.map((task) => ({
          id: String(task.id),
          judul: task.judul,
          deskripsi: task.deskripsi,
          deadline: task.deadline,
          selesai: task.selesai,
          mata_pelajaran: task.mapel,
          created_at: new Date().toISOString(),
        })) as Task[];
      }
    },
  });
}

export function useInfaq() {
  return useQuery({
    queryKey: ["infaq"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("infaq_transactions")
          .select("id, siswa_id, nominal, tanggal, created_at, profiles:siswa_id(nama)")
          .order("tanggal", { ascending: false });
        if (error) throw error;
        if (data && data.length > 0) {
          return data.map((item: any) => ({
            id: item.id,
            siswa_id: item.siswa_id,
            siswa_nama: item.profiles?.nama || "Unknown",
            nominal: item.nominal,
            tanggal: item.tanggal,
            created_at: item.created_at,
          })) as InfaqTransaction[];
        }
        // Fallback to mock data
        return mockInfaq.map((item) => ({
          id: String(item.id),
          siswa_id: String(item.id),
          siswa_nama: item.siswa,
          nominal: item.nominal,
          tanggal: item.tanggal,
          created_at: new Date().toISOString(),
        })) as InfaqTransaction[];
      } catch (err) {
        console.warn("Infaq fetch failed, using mock data:", err);
        return mockInfaq.map((item) => ({
          id: String(item.id),
          siswa_id: String(item.id),
          siswa_nama: item.siswa,
          nominal: item.nominal,
          tanggal: item.tanggal,
          created_at: new Date().toISOString(),
        })) as InfaqTransaction[];
      }
    },
  });
}

export function useGroups() {
  return useQuery({
    queryKey: ["groups"],
    queryFn: async () => {
      try {
        const { data: groups, error: gError } = await supabase
          .from("groups")
          .select("*")
          .order("id");
        if (gError) throw gError;

        const { data: members, error: mError } = await supabase
          .from("group_members")
          .select("id, group_id, profile_id, profiles:profile_id(nama)");
        if (mError) throw mError;

        if ((groups as Group[])?.length > 0) {
          return (groups as Group[]).map((g) => ({
            ...g,
            anggota: (members as any[])
              .filter((m) => m.group_id === g.id)
              .map((m) => m.profiles?.nama || "Unknown"),
          })) as GroupWithMembers[];
        }
        // Fallback to mock data
        return mockKelompok.map((group) => ({
          id: String(group.id),
          nama: group.nama,
          anggota: group.anggota,
          mapel: (group as any).mapel || [],
        })) as GroupWithMembers[];
      } catch (err) {
        console.warn("Groups fetch failed, using mock data:", err);
        return mockKelompok.map((group) => ({
          id: String(group.id),
          nama: group.nama,
          anggota: group.anggota,
          mapel: (group as any).mapel || [],
        })) as GroupWithMembers[];
      }
    },
  });
}

export function useQuotes() {
  return useQuery({
    queryKey: ["quotes"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("quotes")
          .select("*")
          .order("id");
        if (error) throw error;
        if (data && data.length > 0) return data as QuoteItem[];
        // Fallback to mock data
        return mockQuotes.map((quote) => ({
          id: String(quote.id),
          text: quote.text,
          author: quote.author,
        })) as QuoteItem[];
      } catch (err) {
        console.warn("Quotes fetch failed, using mock data:", err);
        return mockQuotes.map((quote) => ({
          id: String(quote.id),
          text: quote.text,
          author: quote.author,
        })) as QuoteItem[];
      }
    },
  });
}

export function useGallery() {
  return useQuery({
    queryKey: ["gallery"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("gallery")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        if (data && data.length > 0) return data as GalleryItem[];
        // Fallback to mock data
        return mockGaleri as GalleryItem[];
      } catch (err) {
        console.warn("Gallery fetch failed, using mock data:", err);
        return mockGaleri as GalleryItem[];
      }
    },
  });
}

export function useStruktur() {
  return useQuery({
    queryKey: ["struktur"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("class_structure")
          .select("*")
          .order("urutan");
        if (error) throw error;
        if (data && data.length > 0) return data as StrukturItem[];
        // Fallback to mock data
        return mockStruktur.map((item, idx) => ({
          id: String(idx + 1),
          jabatan: item.jabatan,
          nama: item.nama,
          avatar_url: item.foto || null,
          urutan: idx + 1,
        })) as StrukturItem[];
      } catch (err) {
        console.warn("Struktur fetch failed, using mock data:", err);
        return mockStruktur.map((item, idx) => ({
          id: String(idx + 1),
          jabatan: item.jabatan,
          nama: item.nama,
          avatar_url: item.foto || null,
          urutan: idx + 1,
        })) as StrukturItem[];
      }
    },
  });
}
