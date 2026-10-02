"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Upload, Loader2, CheckCircle2, Clock, XCircle, ReceiptText, FileCheck2, Building2 } from "lucide-react";
import { api, type ApiEnvelope } from "@/lib/api";
import { ParentShell } from "@/components/ortu/ParentShell";
import { useParentGuard } from "@/lib/use-parent-guard";
import { ProofView } from "@/components/ui/proof-view";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type Payment = { id: number; proof_file: string; status: string; notes: string | null; created_at: string };
type Invoice = {
    id: number; invoice_number?: string; base_amount?: number; registration_fee?: number | null;
    discount_amount?: number; total_amount?: number; due_date?: string | null; status: string;
    payments?: Payment[];
};
type PaymentInfo = {
    scheme: "v1_direct" | "v2_school" | "v3_collective";
    type: string;
    school_name?: string;
    bank_account?: string | null;
    qris_image?: string | null;
    banner?: string;
    bank_accounts?: { id: number; bank_name: string; account_number: string; account_holder: string }[];
};

const rp = (n?: number | null) => (n == null ? "-" : "Rp" + Number(n).toLocaleString("id-ID"));
const tgl = (s?: string | null) => (s ? new Date(s).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }) : "-");
const tglJam = (s: string) => new Date(s).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const ST: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    belum_bayar: { label: "Belum Bayar", cls: "border-amber-200 bg-amber-50 text-amber-700", icon: <Clock className="h-4 w-4" /> },
    menunggu_verifikasi: { label: "Menunggu Verifikasi", cls: "border-blue-200 bg-blue-50 text-blue-700", icon: <Clock className="h-4 w-4" /> },
    lunas: { label: "Lunas", cls: "border-emerald-200 bg-emerald-50 text-emerald-700", icon: <CheckCircle2 className="h-4 w-4" /> },
    ditolak: { label: "Ditolak", cls: "border-red-200 bg-red-50 text-red-700", icon: <XCircle className="h-4 w-4" /> },
};
const PST: Record<string, { label: string; cls: string }> = {
    menunggu_verifikasi: { label: "Menunggu Verifikasi", cls: "border-blue-200 bg-blue-50 text-blue-700" },
    diverifikasi: { label: "Diverifikasi", cls: "border-emerald-200 bg-emerald-50 text-emerald-700" },
    ditolak: { label: "Ditolak", cls: "border-red-200 bg-red-50 text-red-700" },
};

export default function DetailTagihan({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { parent, ready } = useParentGuard();
    const qc = useQueryClient();
    const [file, setFile] = useState<File | null>(null);
    const [msg, setMsg] = useState("");

    const { data: tagihanData, isLoading } = useQuery({
        queryKey: ["ortu-invoices", parent?.studentId],
        enabled: !!parent?.studentId,
        queryFn: async () =>
            (await api.post<ApiEnvelope<{ invoices: Invoice[]; payment_info?: PaymentInfo }>>("/bayar/tagihan", { student_id: parent?.studentId, phone: parent?.phone })).data.data,
    });

    const upload = useMutation({
        mutationFn: async () => {
            const fd = new FormData();
            fd.append("invoice_id", id);
            fd.append("phone", parent?.phone ?? "");
            fd.append("file", file!);
            return api.post("/bayar/upload", fd);
        },
        onSuccess: () => { setFile(null); setMsg(""); qc.invalidateQueries({ queryKey: ["ortu-invoices", parent?.studentId] }); },
        onError: (e: any) => setMsg(e?.response?.data?.message ?? "Gagal mengunggah bukti."),
    });

    if (!ready || !parent) {
        return (
            <ParentShell>
                <div className="space-y-4">
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-72 rounded-xl" />
                </div>
            </ParentShell>
        );
    }

    const inv = tagihanData?.invoices?.find((i) => String(i.id) === id);
    const paymentInfo = tagihanData?.payment_info;

    const st = inv ? ST[inv.status] ?? ST.belum_bayar : null;
    const canUpload = inv && (inv.status === "belum_bayar" || inv.status === "ditolak");
    const payments = inv?.payments ?? [];

    return (
        <ParentShell>
            <Link href="/ortu/tagihan" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" /> Kembali ke Tagihan
            </Link>

            {isLoading ? (
                <Skeleton className="h-96 rounded-xl" />
            ) : !inv ? (
                <Card className="border-2 p-10 text-center text-sm text-muted-foreground">Tagihan tidak ditemukan.</Card>
            ) : (
                <div className="space-y-5">
                    {/* Rincian */}
                    <Card className="overflow-hidden border-2">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-primary/5 p-5">
                            <div className="flex items-center gap-3">
                                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><ReceiptText className="h-5 w-5" /></span>
                                <div className="font-semibold">{inv.invoice_number ?? `Invoice #${inv.id}`}</div>
                            </div>
                            {st && <Badge variant="outline" className={`gap-1 ${st.cls}`}>{st.icon} {st.label}</Badge>}
                        </div>
                        <div className="space-y-2 p-5 text-sm">
                            <Row label="Biaya siklus" value={rp(inv.base_amount)} />
                            {inv.registration_fee != null && inv.registration_fee > 0 && <Row label="Biaya pendaftaran" value={rp(inv.registration_fee)} />}
                            {inv.discount_amount != null && inv.discount_amount > 0 && <Row label="Diskon" value={`− ${rp(inv.discount_amount)}`} tint="text-emerald-600" />}
                            <div className="my-2 border-t" />
                            <div className="flex items-center justify-between">
                                <span className="font-semibold">Total Tagihan</span>
                                <span className="text-lg font-bold text-primary">{rp(inv.total_amount)}</span>
                            </div>
                            <Row label="Jatuh tempo" value={tgl(inv.due_date)} />
                        </div>
                    </Card>

                    {/* Instruksi Tujuan Pembayaran */}
                    {canUpload && paymentInfo && (
                        paymentInfo.scheme === "v2_school" ? (
                            <Card className="border-2 border-blue-200 bg-blue-50/40 p-5">
                                <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-blue-900">
                                    <Building2 className="h-4 w-4" /> Rekening Pembayaran Sekolah
                                </h3>
                                <p className="mb-3 text-xs text-blue-800">
                                    Pembayaran ditransfer langsung ke rekening pihak {paymentInfo.school_name || "sekolah mitra"}, lalu unggah buktinya di bawah:
                                </p>
                                {paymentInfo.bank_account && (
                                    <div className="rounded-lg border border-blue-200 bg-white p-3 text-sm">
                                        <span className="block text-xs text-muted-foreground">Rekening Bank Sekolah:</span>
                                        <span className="font-semibold text-slate-800">{paymentInfo.bank_account}</span>
                                    </div>
                                )}
                                {paymentInfo.qris_image && (
                                    <div className="mt-3">
                                        <span className="mb-1 block text-xs text-muted-foreground">QRIS Sekolah:</span>
                                        <img src={paymentInfo.qris_image} alt="QRIS Sekolah" className="max-h-48 rounded-lg border bg-white p-2 object-contain" />
                                    </div>
                                )}
                            </Card>
                        ) : paymentInfo.scheme === "v1_direct" && paymentInfo.bank_accounts && paymentInfo.bank_accounts.length > 0 ? (
                            <Card className="border-2 border-purple-200 bg-purple-50/40 p-5">
                                <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-purple-900">
                                    <Building2 className="h-4 w-4" /> Rekening Resmi Robotiku
                                </h3>
                                <p className="mb-3 text-xs text-purple-800">
                                    Transfer sesuai nominal ke salah satu rekening resmi Robotiku berikut:
                                </p>
                                <div className="space-y-2">
                                    {paymentInfo.bank_accounts.map((b) => (
                                        <div key={b.id} className="flex items-center justify-between rounded-lg border border-purple-200 bg-white p-3 text-sm">
                                            <div>
                                                <span className="font-bold text-slate-800">{b.bank_name}</span>
                                                <span className="block text-xs text-muted-foreground">{b.account_holder}</span>
                                            </div>
                                            <span className="font-mono font-bold text-primary">{b.account_number}</span>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        ) : null
                    )}

                    {/* Riwayat bukti pembayaran */}
                    {payments.length > 0 && (
                        <Card className="border-2 p-5">
                            <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold"><FileCheck2 className="h-4 w-4" /> Bukti Pembayaran</h3>
                            <div className="space-y-3">
                                {payments.map((p) => {
                                    const ps = PST[p.status] ?? PST.menunggu_verifikasi;
                                    return (
                                        <div key={p.id} className="rounded-lg border p-3">
                                            <div className="mb-2 flex items-center justify-between gap-2">
                                                <span className="text-xs text-muted-foreground">{tglJam(p.created_at)}</span>
                                                <Badge variant="outline" className={ps.cls}>{ps.label}</Badge>
                                            </div>
                                            <ProofView path={p.proof_file} />
                                            {p.status === "ditolak" && p.notes && (
                                                <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">Alasan ditolak: {p.notes}</p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    )}

                    {/* Aksi upload / status */}
                    {inv.status === "lunas" ? (
                        <Card className="flex items-center gap-2 border-2 border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"><CheckCircle2 className="h-5 w-5" /> Tagihan sudah lunas. Terima kasih!</Card>
                    ) : inv.status === "menunggu_verifikasi" ? (
                        <Card className="flex items-center gap-2 border-2 border-blue-200 bg-blue-50 p-4 text-sm text-blue-700"><Clock className="h-5 w-5" /> Bukti bayar sedang diverifikasi Admin.</Card>
                    ) : (
                        <Card className="border-2 p-5">
                            <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold"><Upload className="h-4 w-4" /> {payments.length ? "Unggah Ulang Bukti" : "Unggah Bukti Pembayaran"}</h3>
                            {inv.status === "ditolak" && <p className="mb-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">Bukti sebelumnya ditolak. Silakan unggah ulang.</p>}
                            <input
                                type="file"
                                accept="image/jpeg,image/png,application/pdf"
                                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                                className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-foreground"
                            />
                            <p className="mt-1 text-xs text-muted-foreground">JPG / PNG / PDF, maks 5MB.</p>
                            {msg && <p className="mt-2 text-sm text-red-600">{msg}</p>}
                            <Button className="mt-3 w-full" disabled={!file || upload.isPending || !canUpload} onClick={() => upload.mutate()}>
                                {upload.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />} Kirim Bukti
                            </Button>
                        </Card>
                    )}
                </div>
            )}
        </ParentShell>
    );
}

function Row({ label, value, tint }: { label: string; value: string; tint?: string }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{label}</span>
            <span className={tint ?? ""}>{value}</span>
        </div>
    );
}