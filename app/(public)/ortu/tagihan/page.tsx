"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ReceiptText, ChevronRight, CheckCircle2, Clock, XCircle, Wallet, Building2 } from "lucide-react";
import { api, type ApiEnvelope } from "@/lib/api";
import { ParentShell } from "@/components/ortu/ParentShell";
import { useParentGuard } from "@/lib/use-parent-guard";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type Invoice = { id: number; invoice_number?: string; total_amount?: number; due_date?: string | null; status: string };

const rp = (n?: number | null) => (n == null ? "-" : "Rp" + Number(n).toLocaleString("id-ID"));
const tgl = (s?: string | null) => (s ? new Date(s).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "-");
const isOverdue = (s?: string | null, status?: string) => !!s && status !== "lunas" && new Date(s) < new Date();

const ST: Record<string, { label: string; cls: string; accent: string; icon: React.ReactNode }> = {
    belum_bayar: { label: "Belum Bayar", cls: "border-amber-200 bg-amber-50 text-amber-700", accent: "bg-amber-400", icon: <Clock className="h-3.5 w-3.5" /> },
    menunggu_verifikasi: { label: "Menunggu Verifikasi", cls: "border-blue-200 bg-blue-50 text-blue-700", accent: "bg-blue-400", icon: <Clock className="h-3.5 w-3.5" /> },
    lunas: { label: "Lunas", cls: "border-emerald-200 bg-emerald-50 text-emerald-700", accent: "bg-emerald-400", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
    ditolak: { label: "Ditolak", cls: "border-red-200 bg-red-50 text-red-700", accent: "bg-red-400", icon: <XCircle className="h-3.5 w-3.5" /> },
};

export default function OrtuTagihan() {
    const { parent, ready } = useParentGuard();
    const selfManaged = !!parent?.selfManaged;

    const { data, isLoading } = useQuery({
        queryKey: ["ortu-invoices", parent?.studentId],
        enabled: !!parent?.studentId && !selfManaged,
        queryFn: async () =>
            (await api.post<ApiEnvelope<{ invoices: Invoice[] }>>("/bayar/tagihan", { student_id: parent?.studentId, phone: parent?.phone })).data.data.invoices,
    });

    if (!ready || !parent) {
        return (
            <ParentShell>
                <div className="space-y-4">
                    <Skeleton className="h-28 rounded-xl" />
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
                </div>
            </ParentShell>
        );
    }

    // Sekolah kelola pendaftaran & pembayaran sendiri → tidak ada tagihan di portal
    if (selfManaged) {
        return (
            <ParentShell>
                <PageHeader
                    title="Tagihan"
                    subtitle={parent?.schoolName ? `Pembayaran ananda dikelola oleh ${parent.schoolName}.` : "Pembayaran ananda dikelola oleh pihak sekolah."}
                />
                <Card className="mt-4 border-2 border-blue-200 bg-blue-50/60 p-10 text-center">
                    <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700"><Building2 className="h-6 w-6" /></span>
                    <p className="font-semibold text-blue-900">Pembayaran Dikelola Sekolah</p>
                    <p className="mx-auto mt-1.5 max-w-md text-sm text-blue-800">
                        Pendaftaran dan pembayaran ananda diurus langsung oleh pihak {parent?.schoolName ? <b>{parent.schoolName}</b> : "sekolah"}, jadi tidak ada tagihan yang perlu dibayar melalui portal ini.
                        Anda tetap bisa memantau progres, kehadiran, dan E-Rapot.
                    </p>
                    <Link href="/ortu/progres" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:underline">
                        Lihat Progres Belajar <ChevronRight className="h-4 w-4" />
                    </Link>
                </Card>
            </ParentShell>
        );
    }

    const list = data ?? [];
    const outstanding = list.filter((i) => i.status !== "lunas");
    const totalOutstanding = outstanding.reduce((sum, i) => sum + (i.total_amount ?? 0), 0);

    return (
        <ParentShell>
            <PageHeader title="Tagihan" subtitle="Daftar tagihan & pembayaran ananda." />

            {isLoading ? (
                <div className="space-y-4">
                    <Skeleton className="h-28 rounded-xl" />
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
                </div>
            ) : (
                <div className="mt-4 space-y-5">
                    {/* Ringkasan */}
                    <Card className={`border-2 p-5 ${outstanding.length ? "border-amber-200 bg-amber-50/60" : "border-emerald-200 bg-emerald-50/60"}`}>
                        <div className="flex items-center gap-4">
                            <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${outstanding.length ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                                {outstanding.length ? <Wallet className="h-6 w-6" /> : <CheckCircle2 className="h-6 w-6" />}
                            </span>
                            <div className="flex-1">
                                {outstanding.length ? (
                                    <>
                                        <div className="text-sm text-amber-800">Total tagihan belum lunas</div>
                                        <div className="text-2xl font-bold text-amber-700">{rp(totalOutstanding)}</div>
                                        <div className="text-xs text-amber-700">{outstanding.length} dari {list.length} tagihan</div>
                                    </>
                                ) : (
                                    <>
                                        <div className="text-lg font-semibold text-emerald-700">Semua tagihan lunas 🎉</div>
                                        <div className="text-xs text-emerald-700">{list.length} tagihan tercatat</div>
                                    </>
                                )}
                            </div>
                        </div>
                    </Card>

                    {/* Daftar */}
                    {list.length ? (
                        <div className="space-y-3">
                            {list.map((inv) => {
                                const st = ST[inv.status] ?? ST.belum_bayar;
                                const overdue = isOverdue(inv.due_date, inv.status);
                                return (
                                    <Link key={inv.id} href={`/ortu/tagihan/${inv.id}`} className="block">
                                        <Card className="group flex items-stretch gap-0 overflow-hidden border-2 transition hover:border-primary/40 hover:shadow-sm">
                                            <div className={`w-1.5 shrink-0 ${st.accent}`} />
                                            <div className="flex flex-1 items-center gap-4 p-4">
                                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><ReceiptText className="h-5 w-5" /></span>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="font-semibold">{inv.invoice_number ?? `Invoice #${inv.id}`}</span>
                                                        <Badge variant="outline" className={`gap-1 ${st.cls}`}>{st.icon} {st.label}</Badge>
                                                    </div>
                                                    <div className="mt-1 flex items-center gap-1.5 text-xs">
                                                        <span className={overdue ? "font-medium text-red-600" : "text-muted-foreground"}>
                                                            Jatuh tempo {tgl(inv.due_date)}{overdue ? " · lewat tempo" : ""}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="shrink-0 text-right">
                                                    <div className="font-bold text-primary">{rp(inv.total_amount)}</div>
                                                </div>
                                                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5" />
                                            </div>
                                        </Card>
                                    </Link>
                                );
                            })}
                        </div>
                    ) : (
                        <Card className="border-2 p-10 text-center text-sm text-muted-foreground">Belum ada tagihan.</Card>
                    )}
                </div>
            )}
        </ParentShell>
    );
}