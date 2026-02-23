import { useState, useEffect, useRef } from "react";
import { MessageCircle, Send, Loader2, Smile, Reply, Trash2, X, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PageTransition from "@/components/PageTransition";
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

export default function ChatKelas() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearingChat, setClearingChat] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check if current user is admin
  useEffect(() => {
    if (!user) return;
    const checkAdmin = async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      setIsAdmin(!!data);
    };
    checkAdmin();
  }, [user]);

  // Fetch messages
  useEffect(() => {
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(100);
      if (!error && data) setMessages(data);
      setLoading(false);
    };
    fetchMessages();

    // Realtime subscription
    const channel = supabase
      .channel("chat_messages_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as ChatMessage]);
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "chat_messages" },
        (payload) => {
          setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
    if (!error) {
      setNewMsg("");
      setReplyTo(null);
    }
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

  const handleReply = (msg: ChatMessage) => {
    setReplyTo(msg);
    inputRef.current?.focus();
  };

  const getInitial = (email: string) => email.charAt(0).toUpperCase();
  const getColor = (email: string) => {
    const colors = [
      "from-blue-500 to-blue-600",
      "from-purple-500 to-purple-600",
      "from-green-500 to-green-600",
      "from-amber-500 to-amber-600",
      "from-pink-500 to-pink-600",
      "from-cyan-500 to-cyan-600",
    ];
    let hash = 0;
    for (const ch of email) hash = ch.charCodeAt(0) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  if (!user) {
    return (
      <PageTransition>
        <div className="text-center py-20">
          <MessageCircle size={48} className="mx-auto mb-4 text-muted-foreground/30" />
          <h2 className="text-xl font-bold text-foreground mb-2">Login untuk Chat</h2>
          <p className="text-muted-foreground mb-4">Kamu perlu login untuk mengakses chat kelas</p>
          <Link to="/login" className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            Login Sekarang
          </Link>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      {/* Clear Chat Confirmation Modal */}
      <AnimatePresence>
        {showClearConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowClearConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
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
              <p className="text-sm text-muted-foreground mb-5">
                Semua pesan dalam chat kelas akan dihapus permanen untuk semua pengguna.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
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

      <div className="flex items-center justify-between mb-6">
        <div className="text-center flex-1">
          <MessageCircle size={40} className="mx-auto mb-3 text-primary" />
          <h1 className="text-3xl font-bold text-foreground mb-2">Chat Kelas</h1>
          <p className="text-muted-foreground">Diskusi dan berbagi info dengan teman sekelas</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowClearConfirm(true)}
            title="Clear semua chat"
            className="flex items-center gap-1.5 rounded-xl border border-destructive/30 px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 size={13} />
            Clear Chat
          </button>
        )}
      </div>

      <div className="max-w-3xl mx-auto flex flex-col rounded-2xl border border-border bg-card shadow-xl overflow-hidden" style={{ height: "65vh" }}>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={28} /></div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <Smile size={40} className="mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground">Belum ada pesan. Mulai percakapan!</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {messages.map((msg) => {
                const isMe = msg.user_id === user.id;
                const isDeleting = deletingId === msg.id;
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: isDeleting ? 0 : 1, y: 0, scale: isDeleting ? 0.95 : 1 }}
                    exit={{ opacity: 0, scale: 0.95, y: -5 }}
                    transition={{ duration: 0.2 }}
                    className={`flex gap-2 group ${isMe ? "flex-row-reverse" : ""}`}
                    onMouseEnter={() => setHoveredId(msg.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    {/* Avatar */}
                    <div className={`h-8 w-8 shrink-0 rounded-full bg-gradient-to-br ${getColor(msg.user_email)} flex items-center justify-center text-white text-xs font-bold self-end mb-5`}>
                      {getInitial(msg.user_email)}
                    </div>

                    {/* Bubble + actions */}
                    <div className={`max-w-[75%] flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                      <p className={`text-xs mb-1 ${isMe ? "text-right" : ""} text-muted-foreground`}>
                        {msg.user_email.split("@")[0]}
                      </p>

                      {/* Reply preview */}
                      {msg.reply_to_id && (
                        <div className={`mb-1 px-3 py-1.5 rounded-xl text-xs border-l-2 border-primary/50 bg-muted/60 text-muted-foreground max-w-full ${isMe ? "text-right border-l-0 border-r-2" : ""}`}>
                          <span className="font-medium text-primary/80">
                            {msg.reply_to_email?.split("@")[0]}
                          </span>
                          <p className="truncate opacity-80">{msg.reply_to_message}</p>
                        </div>
                      )}

                      {/* Message + action buttons row */}
                      <div className={`flex items-end gap-1.5 ${isMe ? "flex-row-reverse" : ""}`}>
                        <div className={`rounded-2xl px-4 py-2.5 text-sm ${isMe ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted text-foreground rounded-tl-sm"}`}>
                          {msg.message}
                        </div>

                        {/* Action buttons - visible on hover */}
                        <AnimatePresence>
                          {hoveredId === msg.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              transition={{ duration: 0.1 }}
                              className={`flex items-center gap-1 mb-1 ${isMe ? "flex-row-reverse" : ""}`}
                            >
                              {/* Reply button */}
                              <button
                                onClick={() => handleReply(msg)}
                                title="Balas pesan"
                                className="flex h-6 w-6 items-center justify-center rounded-full bg-muted hover:bg-muted-foreground/20 text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <Reply size={11} />
                              </button>

                              {/* Delete button - only own messages */}
                              {isMe && (
                                <button
                                  onClick={() => handleDelete(msg.id)}
                                  title="Hapus pesan"
                                  className="flex h-6 w-6 items-center justify-center rounded-full bg-muted hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                                >
                                  <Trash2 size={11} />
                                </button>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <p className={`text-[10px] mt-1 text-muted-foreground/60 ${isMe ? "text-right" : ""}`}>
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

        {/* Reply Preview Bar */}
        <AnimatePresence>
          {replyTo && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-border bg-muted/30 px-4 py-2 flex items-center gap-3"
            >
              <Reply size={14} className="text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-primary">{replyTo.user_email.split("@")[0]}</p>
                <p className="text-xs text-muted-foreground truncate">{replyTo.message}</p>
              </div>
              <button
                onClick={() => setReplyTo(null)}
                className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={12} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input */}
        <div className="border-t border-border p-4 bg-card">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={newMsg}
              onChange={(e) => setNewMsg(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder={replyTo ? `Balas ${replyTo.user_email.split("@")[0]}...` : "Ketik pesan..."}
              className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
            <button
              onClick={handleSend}
              disabled={sending || !newMsg.trim()}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-lg shadow-primary/20"
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}