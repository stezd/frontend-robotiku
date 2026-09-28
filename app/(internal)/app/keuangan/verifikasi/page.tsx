"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { Eye, Loader2, Check, X, Building2, Receipt, Percent, Landmark } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ProofView } from "@/components/ui/proof-view";
import { api, apiError, type ApiEnvelope } from "@/lib/api";
import { InternalShell } from "@/components/internal/InternalShell";
import { cn } from "@/lib/utils";

const rp = (n: number | string) => "Rp " + Math.round(Number(n)).toLocaleString("id-ID");

type InvoiceMini = { id: number; invoice_number: string; total_amount: string };
type Settlement = {
    id: number;
    school: { id: number; name: string };
    gross_amount: number;
    commission_percent: string | number;
    commission_amount: number;
    net_amount: number;
    status: "menunggu_verifikasi" | "diverifikasi" | "ditolak";
    proof_file: string | null;
    note: string | null;
    created_at: string;
    verified_at: string | null;
    invoices: InvoiceMini[];
};
type Paginator = { data: Settlement[]; current_page: number; last_page: number; total: number };

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

function VerifikasiSetoranInner() {
    const qc = useQueryClient();
    const [status, setStatus] = useState("menunggu_verifikasi");
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState<Settlement | null>(null);

    const list = useQuery({
        queryKey: ["keuangan-setoran", { status, page }],
        queryFn: async () => (await api.get<ApiEnvelope<Paginator>>("/keuangan/setoran", { params: { status, page } })).data.data,
        placeholderData: keepPreviousData,
    });

    const verify = useMutation({
        mutationFn: async ({ id, action, note }: { id: number; action: "approve" | "reject"; note?: string }) =>
            (await api.post(`/keuangan/setoran/${id}/verifikasi`, { action, note })).data,
        onSuccess: () => qc.invalidateQueries({ queryKey: ["keuangan-setoran"] }),
        onError: (e: unknown) => {
            const axiosErr = e as { response?: { status: number; data: { message: string } } };
            const msg = axiosErr?.response?.status === 422
                ? (axiosErr.response.data.message ?? "Catatan wajib diisi untuk penolakan.")
                : apiError(e);
            alert(msg);
        },
    });

    const p = list.data;
    const rows = p?.data ?? [];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">Verifikasi Setoran Sekolah</h1>
                <p className="text-sm text-muted-foreground">Periksa bukti transfer setoran dari admin sekolah lalu setujui atau tolak.</p>
            </div>

            <div className="flex gap-2">
                {tabs.map((t) => (
                    <Button key={t.key} size="sm" variant={status === t.key ? "default" : "outline"} onClick={() => { setStatus(t.key); setPage(1); }}>{t.label}</Button>
                ))}
            </div>

            <Card className="overflow-hidden rounded-2xl border-2">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            <TableHead>Sekolah</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead>Tanggal</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {list.isLoading && Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-9 w-full" /></TableCell></TableRow>
                        ))}
                        {rows.map((s) => (
                            <TableRow key={s.id} className="cursor-pointer transition-colors hover:bg-muted/40" onClick={() => setSelected(s)}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                            <Building2 className="h-4 w-4" />
                                        </span>
                                        <div className="min-w-0">
                                            <p className="truncate font-medium leading-none">{s.school.name}</p>
                                            <p className="mt-1 text-xs text-muted-foreground">Setoran #{s.id} · {s.invoices.length} invoice</p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right font-semibold tabular-nums">{rp(s.net_amount)}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{s.created_at?.slice(0, 10)}</TableCell>
                                <TableCell><Badge variant="outline" className={cn("capitalize", statusCls[s.status])}>{s.status.replace(/_/g, " ")}</Badge></TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        {s.status === "menunggu_verifikasi" && (
                                            <>
                                                <Button size="icon" variant="ghost" className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700" disabled={verify.isPending}
                                                    onClick={(e) => { e.stopPropagation(); verify.mutate({ id: s.id, action: "approve" }); }}>
                                                    {verify.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                                </Button>
                                                <Button size="icon" variant="ghost" className="text-rose-600 hover:bg-rose-50 hover:text-rose-700" disabled={verify.isPending}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const note = window.prompt("Alasan penolakan:");
                                                        if (note !== null) verify.mutate({ id: s.id, action: "reject", note: note || undefined });
                                                    }}>
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </>
                                        )}
                                        <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelected(s); }}>
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        {!list.isLoading && rows.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="py-14 text-center text-muted-foreground">
                                    <Landmark className="mx-auto mb-2 h-8 w-8 opacity-40" />
                                    <span className="text-sm">Tidak ada setoran.</span>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                {p && (
                    <div className="flex items-center justify-between border-t bg-muted/20 p-4 text-sm text-muted-foreground">
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
                    {selected && <Detail settlement={selected} onDone={() => { setSelected(null); qc.invalidateQueries({ queryKey: ["keuangan-setoran"] }); }} />}
                </SheetContent>
            </Sheet>
        </div>
    );
}

function Detail({ settlement, onDone }: { settlement: Settlement; onDone: () => void }) {
    const [note, setNote] = useState("");
    const [err, setErr] = useState<string | null>(null);

    const verify = useMutation({
        mutationFn: async (action: "approve" | "reject") => (await api.post(`/keuangan/setoran/${settlement.id}/verifikasi`, { action, note: note || undefined })).data,
        onSuccess: onDone,
        onError: (e: unknown) => {
            const axiosErr = e as { response?: { status: number; data: { message: string } } };
            setErr(axiosErr?.response?.status === 422 ? (axiosErr.response.data.message ?? "Catatan wajib diisi untuk penolakan.") : apiError(e));
        },
    });

    const pending = settlement.status === "menunggu_verifikasi";
    const tanggal = settlement.created_at ? new Date(settlement.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }) : "—";

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b pb-4">
                <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold">{settlement.school.name}</h2>
                    <p className="text-xs text-muted-foreground">Setoran #{settlement.id} · {tanggal}</p>
                </div>
                <Badge variant="outline" className={cn("shrink-0 capitalize", statusCls[settlement.status])}>{settlement.status.replace(/_/g, " ")}</Badge>
            </div>

            {/* Ringkasan */}
            <div className="rounded-xl border p-5">
                <div className="flex items-end justify-between gap-3">
                    <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total disetor</p>
                        <p className="mt-1 text-3xl font-bold tracking-tight text-foreground">{rp(settlement.net_amount)}</p>
                    </div>
                    <Badge variant="secondary" className="shrink-0 gap-1"><Building2 className="h-3 w-3" /> {settlement.invoices.length} invoice</Badge>
                </div>
                <div className="mt-4 space-y-1.5 border-t pt-3 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Bruto</span><span className="font-medium">{rp(settlement.gross_amount)}</span></div>
                    <div className="flex justify-between text-emerald-700"><span className="inline-flex items-center gap-1"><Percent className="h-3 w-3" /> Komisi sekolah ({settlement.commission_percent}%)</span><span>− {rp(settlement.commission_amount)}</span></div>
                    {settlement.verified_at && <div className="flex justify-between"><span className="text-muted-foreground">Diverifikasi</span><span>{new Date(settlement.verified_at).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}</span></div>}
                    {settlement.status === "ditolak" && settlement.note && <p className="mt-1 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">Alasan ditolak: {settlement.note}</p>}
                </div>
            </div>

            {/* Invoice dalam setoran */}
            <div>
                <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Receipt className="h-4 w-4" /> Invoice dalam Setoran</p>
                <div className="overflow-hidden rounded-xl border">
                    <table className="w-full text-sm">
                        <tbody>
                            {settlement.invoices.map((i) => (
                                <tr key={i.id} className="border-b last:border-0">
                                    <td className="px-3 py-2 font-mono text-xs">{i.invoice_number}</td>
                                    <td className="px-3 py-2 text-right">{rp(i.total_amount)}</td>
                                </tr>
                            ))}
                            {settlement.invoices.length === 0 && (
                                <tr><td className="px-3 py-4 text-center text-xs text-muted-foreground">Tidak ada invoice.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Bukti transfer */}
            <div>
                <p className="mb-2 text-sm font-semibold">Bukti Transfer</p>
                <ProofView path={settlement.proof_file} className="min-h-[220px] w-full" />
            </div>

            {/* Verifikasi */}
            {pending && (
                <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
                    <div>
                        <label className="mb-1.5 block text-sm font-medium">Catatan <span className="text-xs font-normal text-muted-foreground">(wajib jika menolak)</span></label>
                        <Textarea rows={3} placeholder="Tulis alasan bila menolak…" value={note} onChange={(e) => setNote(e.target.value)} className="bg-background" />
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
        </div>
    );
}

export default function Page() {
    return <InternalShell><VerifikasiSetoranInner /></InternalShell>;
}