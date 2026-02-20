import { useState, useEffect, useRef } from "react";
import { MessageCircle, Send, Loader2, Smile } from "lucide-react";
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
}

export default function ChatKelas() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

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
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMsg.trim() || !user) return;
    setSending(true);
    const { error } = await supabase.from("chat_messages").insert({
      user_id: user.id,
      user_email: user.email || "Unknown",
      message: newMsg.trim(),
    });
    if (!error) setNewMsg("");
    setSending(false);
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
      <div className="text-center mb-6">
        <MessageCircle size={40} className="mx-auto mb-3 text-primary" />
        <h1 className="text-3xl font-bold text-foreground mb-2">Chat Kelas</h1>
        <p className="text-muted-foreground">Diskusi dan berbagi info dengan teman sekelas</p>
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
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}
                  >
                    <div className={`h-8 w-8 shrink-0 rounded-full bg-gradient-to-br ${getColor(msg.user_email)} flex items-center justify-center text-white text-xs font-bold`}>
                      {getInitial(msg.user_email)}
                    </div>
                    <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"}`}>
                      <p className={`text-xs mb-1 ${isMe ? "text-right" : ""} text-muted-foreground`}>
                        {msg.user_email.split("@")[0]}
                      </p>
                      <div className={`rounded-2xl px-4 py-2.5 text-sm ${isMe ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted text-foreground rounded-tl-sm"}`}>
                        {msg.message}
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

        {/* Input */}
        <div className="border-t border-border p-4 bg-card">
          <div className="flex gap-2">
            <input
              value={newMsg}
              onChange={(e) => setNewMsg(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Ketik pesan..."
              className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
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