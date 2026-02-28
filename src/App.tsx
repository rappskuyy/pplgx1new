import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { AuthProvider } from "@/hooks/use-auth";
import Dashboard from "./pages/Dashboard";
import Siswa from "./pages/Siswa";
import Jadwal from "./pages/Jadwal";
import Tugas from "./pages/Tugas";
import Infaq from "./pages/Infaq";
import Kelompok from "./pages/Kelompok";
import FloatingChatButton from "@/components/ui/FloatingChatButton";
import Galeri from "./pages/Galeri";
import Tentang from "./pages/Tentang";
import Struktur from "./pages/Struktur";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Karya from "./pages/Karya";
import Pengumuman from "./pages/Pengumuman";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/siswa" element={<Siswa />} />
              <Route path="/jadwal" element={<Jadwal />} />
              <Route path="/tugas" element={<Tugas />} />
              <Route path="/infaq" element={<Infaq />} />
              <Route path="/kelompok" element={<Kelompok />} />
              <Route path="/pengumuman" element={<Pengumuman />} />
              <Route path="/galeri" element={<Galeri />} />
              <Route path="/tentang" element={<Tentang />} />
              <Route path="/struktur" element={<Struktur />} />
              <Route path="/karya" element={<Karya />} />
              <Route path="/login" element={<Login />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
          {/* FAB Chat — muncul di semua halaman */}
          <FloatingChatButton />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;