import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, Smile, Reply, Trash2, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { Link } from "react-router-dom";

interface ChatMessage {
  id: string;
  user_id: string;
  user_email: string;
  message: string;
  created_at: string;
  reply_to_id?: string | null;
  reply_to_message?: string | null;
  reply_to_email?: string | null;
}

export default function FloatingChatButton() {
  const { user, loading: authLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearingChat, setClearingChat] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Check admin
  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  // Fetch & realtime — dipanggil ulang setiap kali user berubah
  useEffect(() => {
    // Tunggu auth selesai loading dulu
    if (authLoading) return;

    // Kalau tidak login, kosongkan messages
    if (!user) {
      setMessages([]);
      setLoading(false);
      // Cleanup channel kalau ada
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    // User sudah login — fetch messages
    const fetchMessages = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(100);
      if (!error && data) setMessages(data);
      else if (error) console.error("Chat fetch error:", error.message);
      setLoading(false);
    };

    fetchMessages();

    // Cleanup channel lama dulu
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Subscribe realtime
    const channel = supabase
      .channel(`chat_fab_${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (payload) => {
        setMessages((prev) => {
          // Hindari duplikat
          if (prev.find((m) => m.id === (payload.new as ChatMessage).id)) return prev;
          return [...prev, payload.new as ChatMessage];
        });
        setUnreadCount((c) => (isOpen ? c : c + 1));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "chat_messages" }, (payload) => {
        setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("Chat realtime connected");
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, authLoading]); // ← re-run saat user berubah

  // Reset unread & scroll saat buka chat
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 150);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!newMsg.trim() || !user) return;
    setSending(true);
    const payload: Record<string, unknown> = {
      user_id: user.id,
      user_email: user.email || "Unknown",
      message: newMsg.trim(),
    };
    if (replyTo) {
      payload.reply_to_id = replyTo.id;
      payload.reply_to_message = replyTo.message;
      payload.reply_to_email = replyTo.user_email;
    }
    const { error } = await supabase.from("chat_messages").insert(payload);
    if (!error) { setNewMsg(""); setReplyTo(null); }
    else console.error("Send error:", error.message);
    setSending(false);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await supabase.from("chat_messages").delete().eq("id", id);
    setDeletingId(null);
  };

  const handleClearChat = async () => {
    setClearingChat(true);
    await supabase.from("chat_messages").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    setMessages([]);
    setClearingChat(false);
    setShowClearConfirm(false);
  };

  const getInitial = (email: string) => email.charAt(0).toUpperCase();
  const getColor = (email: string) => {
    const colors = ["from-blue-500 to-blue-600", "from-purple-500 to-purple-600", "from-green-500 to-green-600", "from-amber-500 to-amber-600", "from-pink-500 to-pink-600", "from-cyan-500 to-cyan-600"];
    let hash = 0;
    for (const ch of email) hash = ch.charCodeAt(0) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <>
      <motion.div
        className="relative select-none">
        {/* Chat Panel */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 20 }}
              drag
              dragMomentum={false}
              dragElastic={0}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="fixed bottom-24 right-6 w-[340px] sm:w-[380px] rounded-2xl bg-card border border-border shadow-2xl overflow-hidden flex flex-col"
              style={{ height: "480px" }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white">
                <div className="flex items-center gap-2">
                  <div
                    className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-white/10 transition-colors"
                    title="Geser chat"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" opacity="0.7">
                      <circle cx="4" cy="3" r="1.2" /><circle cx="10" cy="3" r="1.2" />
                      <circle cx="4" cy="7" r="1.2" /><circle cx="10" cy="7" r="1.2" />
                      <circle cx="4" cy="11" r="1.2" /><circle cx="10" cy="11" r="1.2" />
                    </svg>
                  </div>
                  <MessageCircle size={16} />
                  <span className="font-semibold text-sm">Chat Kelas</span>
                  <span className="text-xs text-blue-200">{messages.length} pesan</span>
                </div>
                <div className="flex items-center gap-1">
                  {isAdmin && (
                    <button onClick={() => setShowClearConfirm(true)} title="Clear chat" className="flex items-center justify-center h-7 w-7 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors">
                      <Trash2 size={13} />
                    </button>
                  )}
                  <button onClick={() => setIsOpen(false)} className="flex items-center justify-center h-7 w-7 rounded-lg hover:bg-white/20 transition-colors">
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {/* Belum login */}
                {!user ? (
                  <div className="flex flex-col items-center justify-center h-full text-center px-4">
                    <MessageCircle size={36} className="mb-3 text-muted-foreground/30" />
                    <p className="text-sm font-medium text-foreground mb-1">Login untuk Chat</p>
                    <p className="text-xs text-muted-foreground mb-4">Kamu perlu login untuk bergabung</p>
                    <Link to="/login" className="rounded-xl bg-primary px-5 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                      Login Sekarang
                    </Link>
                  </div>
                ) : loading ? (
                  <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" size={24} /></div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <Smile size={32} className="mb-2 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">Belum ada pesan. Mulai percakapan!</p>
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    {messages.map((msg) => {
                      const isMe = msg.user_id === user?.id;
                      const isDeleting = deletingId === msg.id;
                      return (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: isDeleting ? 0 : 1, y: 0, scale: isDeleting ? 0.95 : 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.18 }}
                          className={`flex gap-2 group ${isMe ? "flex-row-reverse" : ""}`}
                          onMouseEnter={() => setHoveredId(msg.id)}
                          onMouseLeave={() => setHoveredId(null)}
                        >
                          <div className={`h-7 w-7 shrink-0 rounded-full bg-gradient-to-br ${getColor(msg.user_email)} flex items-center justify-center text-white text-[11px] font-bold self-end mb-4`}>
                            {getInitial(msg.user_email)}
                          </div>
                          <div className={`max-w-[75%] flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                            <p className={`text-[10px] mb-0.5 text-muted-foreground ${isMe ? "text-right" : ""}`}>
                              {msg.user_email.split("@")[0]}
                            </p>
                            {msg.reply_to_id && (
                              <div className={`mb-1 px-2.5 py-1 rounded-lg text-[10px] border-l-2 border-primary/50 bg-muted/60 text-muted-foreground ${isMe ? "border-l-0 border-r-2 text-right" : ""}`}>
                                <span className="font-medium text-primary/80">{msg.reply_to_email?.split("@")[0]}</span>
                                <p className="truncate opacity-70">{msg.reply_to_message}</p>
                              </div>
                            )}
                            <div className={`flex items-end gap-1 ${isMe ? "flex-row-reverse" : ""}`}>
                              <div className={`rounded-2xl px-3 py-2 text-xs ${isMe ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted text-foreground rounded-tl-sm"}`}>
                                {msg.message}
                              </div>
                              <AnimatePresence>
                                {hoveredId === msg.id && (
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    transition={{ duration: 0.1 }}
                                    className={`flex items-center gap-0.5 mb-1 ${isMe ? "flex-row-reverse" : ""}`}
                                  >
                                    <button onClick={() => { setReplyTo(msg); inputRef.current?.focus(); }} className="flex h-5 w-5 items-center justify-center rounded-full bg-muted hover:bg-muted-foreground/20 text-muted-foreground hover:text-foreground transition-colors">
                                      <Reply size={10} />
                                    </button>
                                    {isMe && (
                                      <button onClick={() => handleDelete(msg.id)} className="flex h-5 w-5 items-center justify-center rounded-full bg-muted hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors">
                                        <Trash2 size={10} />
                                      </button>
                                    )}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                            <p className={`text-[9px] mt-0.5 text-muted-foreground/50 ${isMe ? "text-right" : ""}`}>
                              {new Date(msg.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Reply bar */}
              <AnimatePresence>
                {replyTo && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-t border-border bg-muted/30 px-3 py-1.5 flex items-center gap-2"
                  >
                    <Reply size={12} className="text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-medium text-primary">{replyTo.user_email.split("@")[0]}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{replyTo.message}</p>
                    </div>
                    <button onClick={() => setReplyTo(null)} className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-muted text-muted-foreground">
                      <X size={10} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Input */}
              {user && (
                <div className="border-t border-border p-3 bg-card">
                  <div className="flex gap-2">
                    <input
                      ref={inputRef}
                      value={newMsg}
                      onChange={(e) => setNewMsg(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                      placeholder={replyTo ? `Balas ${replyTo.user_email.split("@")[0]}...` : "Ketik pesan..."}
                      className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                    />
                    <button
                      onClick={handleSend}
                      disabled={sending || !newMsg.trim()}
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-lg shadow-primary/20"
                    >
                      {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* FAB Button */}
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen((prev) => !prev)}
          className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-500 text-white shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 transition-shadow cursor-grab active:cursor-grabbing"
          title="Chat Kelas"
        >
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                <X size={22} />
              </motion.div>
            ) : (
              <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
                <MessageCircle size={22} />
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {unreadCount > 0 && !isOpen && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-md"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>

          {!isOpen && (
            <span className="absolute inset-0 rounded-full animate-ping bg-blue-400/30 pointer-events-none" />
          )}
        </motion.button>
      </motion.div>

      {/* Clear Chat Modal */}
      <AnimatePresence>
        {showClearConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowClearConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-card border border-border rounded-2xl shadow-2xl p-6 w-80 mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                  <AlertTriangle size={18} className="text-destructive" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm">Hapus Semua Chat?</h3>
                  <p className="text-xs text-muted-foreground">Tindakan ini tidak bisa dibatalkan</p>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setShowClearConfirm(false)} className="flex-1 rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors">
                  Batal
                </button>
                <button
                  onClick={handleClearChat}
                  disabled={clearingChat}
                  className="flex-1 rounded-xl bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {clearingChat ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  Hapus Semua
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}