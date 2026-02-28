import { useState, useEffect, useRef } from "react";
import { Camera, Loader2, Save, User, Instagram, Phone, Heart, Sparkles, FileText, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { Link } from "react-router-dom";

interface Profile {
  id: string;
  nama: string;
  gender: string;
  no_absen: number;
  avatar_url: string | null;
  badge: string | null;
  bio: string | null;
  hobi: string | null;
  instagram: string | null;
  whatsapp: string | null;
  motto: string | null;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    bio: "",
    hobi: "",
    instagram: "",
    whatsapp: "",
    motto: "",
  });

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (data) {
        setProfile(data);
        setForm({
          bio: data.bio || "",
          hobi: data.hobi || "",
          instagram: data.instagram || "",
          whatsapp: data.whatsapp || "",
          motto: data.motto || "",
        });
      }
      setLoading(false);
    };
    fetchProfile();
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validasi ukuran (max 2MB) dan tipe
    if (file.size > 2 * 1024 * 1024) {
      alert("Ukuran foto maksimal 2MB");
      return;
    }
    if (!file.type.startsWith("image/")) {
      alert("File harus berupa gambar");
      return;
    }

    setUploadingAvatar(true);
    const ext = file.name.split(".").pop();
    const filePath = `${user.id}/avatar.${ext}`;

    // Upload ke Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error("Upload error:", uploadError.message);
      setUploadingAvatar(false);
      return;
    }

    // Ambil public URL
    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    // Update avatar_url di profiles
    await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", user.id);

    setProfile((prev) => prev ? { ...prev, avatar_url: publicUrl } : prev);
    setUploadingAvatar(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        bio: form.bio || null,
        hobi: form.hobi || null,
        instagram: form.instagram?.replace("@", "") || null,
        whatsapp: form.whatsapp || null,
        motto: form.motto || null,
      })
      .eq("id", user.id);

    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
    setSaving(false);
  };

  if (!user) {
    return (
      <PageTransition>
        <div className="text-center py-20">
          <User size={48} className="mx-auto mb-4 text-muted-foreground/30" />
          <h2 className="text-xl font-bold text-foreground mb-2">Belum Login</h2>
          <p className="text-muted-foreground mb-4">Kamu perlu login untuk mengakses profil</p>
          <Link to="/login" className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            Login Sekarang
          </Link>
        </div>
      </PageTransition>
    );
  }

  if (loading) {
    return (
      <PageTransition>
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={32} /></div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-1">Profil Saya</h1>
          <p className="text-muted-foreground">Lengkapi profilmu supaya teman-teman bisa mengenalmu lebih baik</p>
        </div>

        {/* Avatar Section */}
        <div className="rounded-2xl bg-card border border-border p-6 mb-6 shadow-sm">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="h-24 w-24 rounded-full overflow-hidden bg-muted ring-4 ring-border">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.nama} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-3xl font-bold text-muted-foreground">
                    {profile?.nama?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors disabled:opacity-70"
              >
                {uploadingAvatar ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">{profile?.nama}</h2>
              <p className="text-sm text-muted-foreground">No. Absen {profile?.no_absen} · {profile?.gender}</p>
              {profile?.badge && (
                <span className="inline-block mt-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  {profile.badge}
                </span>
              )}
              <p className="text-xs text-muted-foreground mt-2">Klik ikon kamera untuk ganti foto · Maks 2MB</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="rounded-2xl bg-card border border-border p-6 shadow-sm space-y-5">
          <h3 className="font-semibold text-foreground text-base">Informasi Profil</h3>

          {/* Bio */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-1.5">
              <FileText size={15} className="text-primary" /> Bio
            </label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="Ceritain sedikit tentang dirimu..."
              rows={3}
              maxLength={200}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none"
            />
            <p className="text-xs text-muted-foreground text-right mt-1">{form.bio.length}/200</p>
          </div>

          {/* Motto */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-1.5">
              <Sparkles size={15} className="text-primary" /> Motto Hidup
            </label>
            <input
              value={form.motto}
              onChange={(e) => setForm({ ...form, motto: e.target.value })}
              placeholder="Motto atau quote favoritmu..."
              maxLength={100}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>

          {/* Hobi */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-1.5">
              <Heart size={15} className="text-primary" /> Hobi
            </label>
            <input
              value={form.hobi}
              onChange={(e) => setForm({ ...form, hobi: e.target.value })}
              placeholder="Contoh: Coding, Gaming, Musik..."
              maxLength={100}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>

          {/* Instagram */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-1.5">
              <Instagram size={15} className="text-primary" /> Instagram
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">@</span>
              <input
                value={form.instagram}
                onChange={(e) => setForm({ ...form, instagram: e.target.value.replace("@", "") })}
                placeholder="username"
                maxLength={50}
                className="w-full rounded-xl border border-border bg-background pl-8 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              />
            </div>
          </div>

          {/* WhatsApp */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-1.5">
              <Phone size={15} className="text-primary" /> WhatsApp
            </label>
            <input
              value={form.whatsapp}
              onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
              placeholder="Contoh: 08123456789"
              maxLength={15}
              type="tel"
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
          >
            <AnimatePresence mode="wait">
              {saved ? (
                <motion.span key="saved" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                  <CheckCircle size={16} /> Tersimpan!
                </motion.span>
              ) : saving ? (
                <motion.span key="saving" className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" /> Menyimpan...
                </motion.span>
              ) : (
                <motion.span key="save" className="flex items-center gap-2">
                  <Save size={16} /> Simpan Profil
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>
    </PageTransition>
  );
}