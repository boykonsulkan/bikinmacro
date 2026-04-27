"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Clock, CheckCircle, AlertCircle, Filter, Search, User, Mail, Calendar } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export default function AdminFeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const fetchFeedbacks = async () => {
    try {
      const res = await fetch("/api/north/feedback");
      const data = await res.json();
      if (res.ok) {
        setFeedbacks(data);
      }
    } catch (err) {
      console.error("Error fetching feedbacks:", err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (feedbackId: string, newStatus: string) => {
    setUpdating(feedbackId);
    try {
      const res = await fetch("/api/north/feedback", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: feedbackId, status: newStatus }),
      });

      if (res.ok) {
        setFeedbacks(prev => 
          prev.map(f => f.id === feedbackId ? { ...f, status: newStatus } : f)
        );
      }
    } catch (err) {
      console.error("Error updating status:", err);
    } finally {
      setUpdating(null);
    }
  };

  const filteredFeedbacks = feedbacks.filter(f => {
    const matchesSearch = 
      f.content.toLowerCase().includes(searchTerm.toLowerCase()) || 
      f.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "all" || f.category === filterCategory;
    const matchesStatus = filterStatus === "all" || f.status === filterStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "resolved":
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-500/10 text-green-500 border border-green-500/20"><CheckCircle size={12} /> Selesai</span>;
      case "reviewed":
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20"><Clock size={12} /> Ditinjau</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20"><AlertCircle size={12} /> Pending</span>;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "bug": return "Bug";
      case "suggestion": return "Saran";
      case "complaint": return "Keluhan";
      default: return "Lainnya";
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Feedback User</h1>
          <p className="text-muted-foreground mt-1">Dengarkan apa yang dikatakan pengguna Anda.</p>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium bg-card border border-border px-4 py-2 rounded-xl">
          <MessageSquare className="w-4 h-4 text-primary" />
          <span>Total {feedbacks.length} masukan</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Cari pesan atau email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <select 
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 appearance-none focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          >
            <option value="all">Semua Kategori</option>
            <option value="suggestion">Saran</option>
            <option value="bug">Bug</option>
            <option value="complaint">Keluhan</option>
            <option value="other">Lainnya</option>
          </select>
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 appearance-none focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          >
            <option value="all">Semua Status</option>
            <option value="pending">Pending</option>
            <option value="reviewed">Ditinjau</option>
            <option value="resolved">Selesai</option>
          </select>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">User & Waktu</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Kategori</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Pesan</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      <span className="text-sm text-muted-foreground">Memuat data...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredFeedbacks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    Tidak ada masukan yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredFeedbacks.map((f) => (
                  <tr key={f.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 font-medium text-sm">
                          <Mail size={14} className="text-muted-foreground" />
                          {f.email}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                          <Calendar size={12} />
                          {format(new Date(f.created_at), "d MMM yyyy, HH:mm", { locale: id })}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md border ${
                        f.category === 'bug' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                        f.category === 'suggestion' ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' :
                        'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
                      }`}>
                        {getCategoryLabel(f.category)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm line-clamp-2 max-w-md group-hover:line-clamp-none transition-all">
                        {f.content}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(f.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        {f.status === 'pending' && (
                          <button 
                            onClick={() => updateStatus(f.id, 'reviewed')}
                            disabled={updating === f.id}
                            className="text-xs font-bold px-3 py-1.5 bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white rounded-lg transition-all"
                          >
                            Tinjau
                          </button>
                        )}
                        {f.status !== 'resolved' && (
                          <button 
                            onClick={() => updateStatus(f.id, 'resolved')}
                            disabled={updating === f.id}
                            className="text-xs font-bold px-3 py-1.5 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white rounded-lg transition-all"
                          >
                            Selesai
                          </button>
                        )}
                        {f.status === 'resolved' && (
                          <button 
                            onClick={() => updateStatus(f.id, 'pending')}
                            disabled={updating === f.id}
                            className="text-xs font-bold px-3 py-1.5 bg-zinc-500/10 text-zinc-500 hover:bg-zinc-500 hover:text-white rounded-lg transition-all"
                          >
                            Buka Kembali
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
