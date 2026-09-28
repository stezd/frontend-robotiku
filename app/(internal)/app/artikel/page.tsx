"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { Plus, Search, Pencil, Trash2, ExternalLink, Newspaper, ImageOff } from "lucide-react";
import { api, type ApiEnvelope } from "@/lib/api";
import { InternalShell } from "@/components/internal/InternalShell";
import { PageHeader } from "@/components/ui/page-header";
import { useConfirm } from "@/components/ui/confirm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Article = { id: number; title: string; slug: string; category: string | null; status: "draft" | "publish"; cover_image: string | null; created_at: string };
type Paginated = { data: Article[]; current_page: number; last_page: number; total: number };

const mediaUrl = (p?: string | null) => (!p ? null : /^https?:\/\/|^\//.test(p) ? p : `/api/v1/public-media/${p}`);
const tgl = (s: string) => new Date(s).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });

export default function ArtikelPage() {
    const router = useRouter();
    const qc = useQueryClient();
    const confirm = useConfirm();
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);

    const { data, isLoading } = useQuery({
        queryKey: ["artikel-admin", search, page],
        placeholderData: keepPreviousData,
        queryFn: async () => (await api.get<ApiEnvelope<Paginated>>("/admin/artikel", { params: { search: search || undefined, page } })).data.data,
    });

    const del = useMutation({
        mutationFn: async (id: number) => api.delete(`/admin/artikel/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["artikel-admin"] }),
        onError: (e: any) => alert(e?.response?.data?.message ?? "Gagal menghapus."),
    });
    const onDelete = async (a: Article) => {
        if (await confirm({ title: "Hapus artikel?", description: `"${a.title}" akan dihapus permanen.`, confirmText: "Hapus", variant: "destructive" })) del.mutate(a.id);
    };

    const rows = data?.data ?? [];

    return (
        <InternalShell>
            <PageHeader
                title="Artikel"
                subtitle="Kelola artikel untuk landing page."
                action={<Button onClick={() => router.push("/app/artikel/baru")}><Plus className="mr-1.5 h-4 w-4" /> Tulis Artikel</Button>}
            />

            <div className="mt-5 mb-4 relative max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Cari judul…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
            </div>

            {isLoading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}</div>
            ) : rows.length ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {rows.map((a) => {
                        const cover = mediaUrl(a.cover_image);
                        return (
                            <Card key={a.id} className="group flex flex-col overflow-hidden">
                                <div className="relative aspect-video bg-muted">
                                    {cover ? <img src={cover} alt={a.title} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-muted-foreground"><ImageOff className="h-8 w-8" /></div>}
                                    <span className="absolute left-2 top-2">
                                        {a.status === "publish"
                                            ? <Badge className="border-emerald-200 bg-emerald-100 text-emerald-700">Terbit</Badge>
                                            : <Badge variant="outline" className="bg-white/90">Draft</Badge>}
                                    </span>
                                </div>
                                <div className="flex flex-1 flex-col p-4">
                                    {a.category && <span className="mb-1 text-xs font-medium text-primary">{a.category}</span>}
                                    <h3 className="line-clamp-2 font-semibold leading-snug">{a.title}</h3>
                                    <p className="mt-1 text-xs text-muted-foreground">{tgl(a.created_at)}</p>
                                    <div className="mt-3 flex gap-1.5 border-t pt-3">
                                        <Button size="sm" variant="outline" className="flex-1" onClick={() => router.push(`/app/artikel/${a.id}`)}><Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit</Button>
                                        {a.status === "publish" && <Button asChild size="icon" variant="ghost" title="Lihat publik"><Link href={`/artikel/${a.slug}`} target="_blank"><ExternalLink className="h-4 w-4" /></Link></Button>}
                                        <Button size="icon" variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => onDelete(a)}><Trash2 className="h-4 w-4" /></Button>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <Card className="flex flex-col items-center gap-3 py-16 text-center">
                    <Newspaper className="h-10 w-10 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">Belum ada artikel.</p>
                    <Button onClick={() => router.push("/app/artikel/baru")}><Plus className="mr-1.5 h-4 w-4" /> Tulis Artikel Pertama</Button>
                </Card>
            )}

            {data && data.last_page > 1 && (
                <div className="mt-5 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Halaman {data.current_page} dari {data.last_page} · {data.total} artikel</span>
                    <div className="flex gap-2">
                        <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Sebelumnya</Button>
                        <Button size="sm" variant="outline" disabled={page >= data.last_page} onClick={() => setPage((p) => p + 1)}>Berikutnya</Button>
                    </div>
                </div>
            )}
        </InternalShell>
    );
}