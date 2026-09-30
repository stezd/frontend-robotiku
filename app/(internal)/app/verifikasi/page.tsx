"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { Eye, Loader2, Check, X, MessageCircle, FileText, Trash2, User, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { api, apiError, type ApiEnvelope } from "@/lib/api";
import { protectedFileUrl } from "@/lib/media";
import { InternalShell } from "@/components/internal/InternalShell";
import { useConfirm } from "@/components/ui/confirm";
import { cn } from "@/lib/utils";
import { DrawerHeader } from "@/components/ui/drawer-header";

const rupiah = (n: number | string) => "Rp" + Math.round(Number(n)).toLocaleString("id-ID");
type Payment = {
    id: number; invoice_id: number; uploader_type: string; status: "menunggu_verifikasi" | "diverifikasi" | "ditolak"; created_at: string;
    invoice: { invoice_number: string; total_amount: string; student: { name: string; student_code: string } };
};
type Paginator = { data: Payment[]; current_page: number; last_page: number; total: number };

const tabs = [
    { key: "menunggu_verifikasi", label: "Menunggu" },
    { key: "diverifikasi", label: "Diverifikasi" },
    { key: "ditolak", label: "Ditolak" },
];
const statusCls: Record<string, string> = {
    menunggu_verifikasi: "bg-amber-50 text-amber-700 border-amber-200",
    diverifikasi: "bg-emerald-50 text-emerald-700 border-emerald-200",
    ditolak: "bg-rose-50 text-rose-700 border-rose-200",
};

function VerifikasiInner() {
    const qc = useQueryClient();
    const [status, setStatus] = useState("menunggu_verifikasi");
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState<Payment | null>(null);

    const list = useQuery({
        queryKey: ["payments", { status, page }],
        queryFn: async () => (await api.get("/bayar/payments", { params: { status, page } })).data.data as Paginator,
        placeholderData: keepPreviousData,
    });

    const verify = useMutation({
        mutationFn: async ({ id, action, notes }: { id: number; action: "approve" | "reject"; notes?: string }) =>
            (await api.post(`/bayar/payments/${id}/verify`, { action, notes })).data,
        onSuccess: () => qc.invalidateQueries({ queryKey: ["payments"] }),
        onError: (e: unknown) => {
            const axiosErr = e as { response?: { status: number; data: { message: string } } };
            const msg = axiosErr?.response?.status === 422
                ? (axiosErr.response.data.message ?? "Alasan wajib diisi untuk penolakan.")
                : apiError(e);
            alert(msg);
        },
    });

    const p = list.data;
    const rows = p?.data ?? [];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">Verifikasi Pembayaran</h1>
                <p className="text-sm text-muted-foreground">Periksa bukti bayar lalu setujui atau tolak. Pendaftar baru jadi siswa setelah diverifikasi.</p>
            </div>

            <div className="flex gap-2">
                {tabs.map((t) => (
                    <Button key={t.key} size="sm" variant={status === t.key ? "default" : "outline"} onClick={() => { setStatus(t.key); setPage(1); }}>{t.label}</Button>
                ))}
            </div>

            <Card className="overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow><TableHead>Siswa</TableHead><TableHead>Invoice</TableHead><TableHead className="text-right">Jumlah</TableHead><TableHead>Pengunggah</TableHead><TableHead>Tanggal</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                        {list.isLoading && Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-9 w-full" /></TableCell></TableRow>
                        ))}
                        {rows.map((pay) => (
                            <TableRow key={pay.id} className="cursor-pointer" onClick={() => setSelected(pay)}>
                                <TableCell>
                                    <p className="font-medium leading-none">{pay.invoice.student.name}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">{pay.invoice.student.student_code}</p>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">{pay.invoice.invoice_number}</TableCell>
                                <TableCell className="text-right font-medium">{rupiah(pay.invoice.total_amount)}</TableCell>
                                <TableCell className="text-sm capitalize text-muted-foreground">{pay.uploader_type === "school_admin" ? "Admin Sekolah" : "Orang Tua"}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{pay.created_at?.slice(0, 10)}</TableCell>
                                <TableCell><Badge variant="outline" className={cn("capitalize", statusCls[pay.status])}>{pay.status.replace("_", " ")}</Badge></TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        {pay.status === "menunggu_verifikasi" && (
                                            <>
                                                <Button size="icon" variant="ghost" className="text-emerald-600 hover:text-emerald-700" disabled={verify.isPending}
                                                    onClick={(e) => { e.stopPropagation(); verify.mutate({ id: pay.id, action: "approve" }); }}>
                                                    {verify.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                                </Button>
                                                <Button size="icon" variant="ghost" className="text-rose-600 hover:text-rose-700" disabled={verify.isPending}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const notes = window.prompt("Alasan penolakan:");
                                                        if (notes !== null) verify.mutate({ id: pay.id, action: "reject", notes: notes || undefined });
                                                    }}>
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </>
                                        )}
                                        <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelected(pay); }}>
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        {!list.isLoading && rows.length === 0 && <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Tidak ada data.</TableCell></TableRow>}
                    </TableBody>
                </Table>
                {p && (
                    <div className="flex items-center justify-between border-t p-4 text-sm text-muted-foreground">
                        <span>Total {p.total} · Halaman {p.current_page}/{p.last_page}</span>
                        <div className="flex gap-1">
                            <Button size="icon" variant="outline" disabled={p.current_page <= 1} onClick={() => setPage((x) => x - 1)}>‹</Button>
                            <Button size="icon" variant="outline" disabled={p.current_page >= p.last_page} onClick={() => setPage((x) => x + 1)}>›</Button>
                        </div>
                    </div>
                )}
            </Card>

            <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
                <SheetContent className="w-full overflow-y-auto p-6 sm:max-w-xl">
                    {selected && <Detail payment={selected} onDone={() => { setSelected(null); qc.invalidateQueries({ queryKey: ["payments"] }); }} />}
                </SheetContent>
            </Sheet>
        </div>
    );
}

function Detail({ payment, onDone }: { payment: Payment; onDone: () => void }) {
    const confirm = useConfirm();
    const [notes, setNotes] = useState("");
    const [err, setErr] = useState<string | null>(null);

    const proof = useQuery({
        queryKey: ["proof", payment.id],
        queryFn: async () => {
            const { url, mime } = await protectedFileUrl(`/bayar/payments/${payment.id}/proof`);
            return { url, isPdf: mime.includes("pdf") };
        },
    });
    const verify = useMutation({
        mutationFn: async (action: "approve" | "reject") => (await api.post(`/bayar/payments/${payment.id}/verify`, { action, notes: notes || undefined })).data,
        onSuccess: onDone,
        onError: (e: any) => setErr(e?.response?.status === 422 ? (e.response.data.message ?? "Alasan wajib diisi untuk penolakan.") : apiError(e)),
    });
    const wa = useMutation({ mutationFn: async () => (await api.get<ApiEnvelope<{ url: string }>>(`/bayar/invoices/${payment.invoice_id}/wa`)).data.data, onSuccess: (d) => window.open(d.url, "_blank") });
    const del = useMutation({
        mutationFn: async () => api.delete(`/bayar/payments/${payment.id}`),
        onSuccess: onDone,
        onError: (e: any) => setErr(apiError(e, "Gagal menghapus pendaftaran.")),
    });

    const onDelete = async () => {
        const ok = await confirm({
            title: "Hapus pendaftaran?",
            description: `Pendaftaran ${payment.invoice.student.name} beserta tagihan & bukti bayarnya akan dihapus permanen. Hanya bisa untuk yang belum terverifikasi.`,
            confirmText: "Hapus", variant: "destructive",
        });
        if (ok) del.mutate();
    };

    const pending = payment.status === "menunggu_verifikasi";
    const canDelete = payment.status !== "diverifikasi";
    const uploader = payment.uploader_type === "school_admin" ? "Admin Sekolah" : "Orang Tua";
    const tanggal = payment.created_at ? new Date(payment.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }) : "—";

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b pb-4">
                <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold">{payment.invoice.student.name}</h2>
                    <p className="font-mono text-xs text-muted-foreground">{payment.invoice.invoice_number}</p>
                </div>
                <Badge variant="outline" className={cn("shrink-0 capitalize", statusCls[payment.status])}>{payment.status.replace("_", " ")}</Badge>
            </div>

            {/* Ringkasan tagihan */}
            <div className="rounded-xl border p-5">
                <div className="flex items-end justify-between gap-3">
                    <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Jumlah tagihan</p>
                        <p className="mt-1 text-3xl font-bold tracking-tight text-foreground">{rupiah(payment.invoice.total_amount)}</p>
                    </div>
                    <Badge variant="secondary" className="shrink-0 gap-1"><User className="h-3 w-3" /> {uploader}</Badge>
                </div>
                <div className="mt-4 flex items-center gap-6 border-t pt-3 text-sm">
                    <div><span className="text-muted-foreground">Tanggal upload</span><div className="font-medium">{tanggal}</div></div>
                </div>
            </div>

            {/* Bukti bayar */}
            <div>
                <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold">Bukti Pembayaran</p>
                    {proof.data && !proof.data.isPdf && (
                        <a href={proof.data.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                            <ExternalLink className="h-3 w-3" /> Buka penuh
                        </a>
                    )}
                </div>
                <div className="flex min-h-[220px] items-center justify-center overflow-hidden rounded-xl border bg-muted/30">
                    {proof.isLoading && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
                    {proof.data && (proof.data.isPdf
                        ? <a href={proof.data.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-6 text-sm font-medium text-primary">
                            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10"><FileText className="h-5 w-5" /></span> Buka bukti (PDF)
                        </a>
                        : <a href={proof.data.url} target="_blank" rel="noreferrer" className="block w-full"><img src={proof.data.url} alt="Bukti pembayaran" className="max-h-[440px] w-full object-contain" /></a>)}
                </div>
            </div>

            {/* Tagih WA */}
            <Button variant="outline" className="w-full" disabled={wa.isPending} onClick={() => wa.mutate()}>
                {wa.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageCircle className="mr-2 h-4 w-4" />} Tagih via WhatsApp
            </Button>

            {/* Verifikasi */}
            {pending && (
                <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
                    <div>
                        <label className="mb-1.5 block text-sm font-medium">Catatan <span className="text-xs font-normal text-muted-foreground">(wajib jika menolak)</span></label>
                        <Textarea rows={3} placeholder="Tulis alasan bila menolak…" value={notes} onChange={(e) => setNotes(e.target.value)} className="bg-background" />
                    </div>
                    {err && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>}
                    <div className="grid grid-cols-2 gap-3">
                        <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={verify.isPending} onClick={() => { setErr(null); verify.mutate("approve"); }}>
                            {verify.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />} Setujui
                        </Button>
                        <Button variant="destructive" disabled={verify.isPending} onClick={() => { setErr(null); verify.mutate("reject"); }}>
                            <X className="mr-2 h-4 w-4" /> Tolak
                        </Button>
                    </div>
                </div>
            )}

            {/* Zona hapus */}
            {canDelete && (
                <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4">
                    <p className="text-sm font-semibold text-rose-700">Hapus Pendaftaran</p>
                    <p className="mt-1 text-xs text-muted-foreground">Belum terverifikasi (belum menjadi siswa). Hapus jika batal / tidak jadi bayar.</p>
                    {!pending && err && <p className="mt-2 text-sm text-destructive">{err}</p>}
                    <Button variant="outline" size="sm" className="mt-3 border-rose-300 bg-white text-rose-600 hover:bg-rose-100 hover:text-rose-700" disabled={del.isPending} onClick={onDelete}>
                        {del.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />} Hapus Pendaftaran
                    </Button>
                </div>
            )}
        </div>
    );
}

export default function Page() {
    return <InternalShell><VerifikasiInner /></InternalShell>;
}