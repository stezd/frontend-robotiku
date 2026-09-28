"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    Wallet, ReceiptText, Percent, Building2, Clock,
    ArrowUp, ArrowDown, Minus, Calendar, ChevronRight,
} from "lucide-react";
import {
    BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
    Tooltip, ResponsiveContainer, Legend, CartesianGrid,
} from "recharts";
import { api, type ApiEnvelope } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────

interface DashboardData {
    pendapatan_bulan_ini: number;
    pendapatan_tahun_ini: number;
    tagihan_outstanding: number;
    rata_rata_komisi: number;
    sekolah_aktif: number;
    menunggu_verifikasi: number;
    pendapatan_per_bulan: { month: string; total: number }[];
    status_pembayaran_global: { belum_bayar: number; lunas: number };
    tagihan_outstanding_per_sekolah: { school_name: string; total: number }[];
    komisi_per_sekolah: { school_name: string; commission_percent: string }[];
    setoran_terbaru: { school_name: string; net_amount: number; created_at: string; status: string }[];
}

interface TrendItem {
    current: number;
    previous: number;
    percent_change: number;
}

type TrendData = Record<string, TrendItem>;

// ─── Constants ────────────────────────────────────────────────────

const PERIODS = [
    { key: "minggu_ini", label: "Minggu Ini" },
    { key: "bulan_ini", label: "Bulan Ini" },
    { key: "3_bulan", label: "3 Bulan" },
    { key: "tahun_ini", label: "Tahun Ini" },
    { key: "custom", label: "Custom Range" },
] as const;

const PIE_COLORS = ["#f59e0b", "#22c55e"];


const statusCls: Record<string, string> = {
    menunggu_verifikasi: "bg-amber-50 text-amber-700 border-amber-200",
    diverifikasi: "bg-emerald-50 text-emerald-700 border-emerald-200",
    ditolak: "bg-rose-50 text-rose-700 border-rose-200",
};

// ─── Helpers ──────────────────────────────────────────────────────

const rp = (n: number) => "Rp " + Math.round(n).toLocaleString("id-ID");

// ─── Sub-components ───────────────────────────────────────────────

function TrendBadge({ trend }: { trend?: TrendItem }) {
    if (!trend) return (
        <span className="inline-flex items-center gap-1 text-xs text-gray-400">
            <Minus className="h-3 w-3" /> —
        </span>
    );
    const { percent_change } = trend;
    if (percent_change === 0) return (
        <span className="inline-flex items-center gap-1 text-xs text-gray-400">
            <Minus className="h-3 w-3" /> Tetap
        </span>
    );
    const pos = percent_change > 0;
    return (
        <span className={cn(
            "inline-flex items-center gap-1 text-xs font-medium",
            pos ? "text-emerald-600" : "text-rose-600",
        )}>
            {pos ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            {pos ? "+" : ""}{percent_change.toFixed(1)}%
        </span>
    );
}

function KpiCard({ icon, label, value, trend, tone }: {
    icon: React.ReactNode; label: string; value: React.ReactNode;
    trend?: TrendItem; tone: string;
}) {
    const t: Record<string, string> = {
        blue: "bg-blue-50 text-blue-600",
        green: "bg-emerald-50 text-emerald-600",
        amber: "bg-amber-50 text-amber-600",
        emerald: "bg-emerald-50 text-emerald-600",
        violet: "bg-violet-50 text-violet-600",
        rose: "bg-rose-50 text-rose-600",
    };
    return (
        <Card className="border-2 p-5">
            <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                    <div className="text-xs text-muted-foreground">{label}</div>
                    <div className="mt-1 text-2xl font-bold">{value}</div>
                    <div className="mt-1"><TrendBadge trend={trend} /></div>
                </div>
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${t[tone]}`}>{icon}</span>
            </div>
        </Card>
    );
}

function ChartCard({ title, children, isEmpty }: { title: string; children: React.ReactNode; isEmpty?: boolean }) {
    return (
        <Card className="border-2 p-5">
            <h3 className="mb-3 text-sm font-semibold">{title}</h3>
            {isEmpty ? (
                <div className="flex h-[260px] flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Calendar className="h-8 w-8" />
                    <span className="text-sm">Belum ada data</span>
                </div>
            ) : children}
        </Card>
    );
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
    return (
        <div className="space-y-2 p-5">
            {Array.from({ length: rows }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
            ))}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────

export function KeuanganDashboard() {
    const [period, setPeriod] = useState("bulan_ini");
    const [customStart, setCustomStart] = useState("");
    const [customEnd, setCustomEnd] = useState("");

    const isCustom = period === "custom";

    const params: Record<string, string> = isCustom
        ? { start_date: customStart, end_date: customEnd }
        : { period };

    const dash = useQuery({
        queryKey: ["keuangan-dashboard", params],
        queryFn: async () => (await api.get<ApiEnvelope<DashboardData>>("/keuangan/dashboard", { params })).data.data,
    });

    const trend = useQuery({
        queryKey: ["keuangan-trend"],
        queryFn: async () => (await api.get<ApiEnvelope<TrendData>>("/keuangan/dashboard/trend")).data.data,
    });

    const d = dash.data;
    const t = trend.data;
    const loading = dash.isLoading;

    const pendapatanPerBulan = d?.pendapatan_per_bulan ?? [];
    const statusPembayaran = d?.status_pembayaran_global
        ? [
            { name: "Belum Bayar", value: d.status_pembayaran_global.belum_bayar },
            { name: "Lunas", value: d.status_pembayaran_global.lunas },
        ]
        : [];
    const tagihanPerSekolah = d?.tagihan_outstanding_per_sekolah ?? [];
    const komisiPerSekolah = (d?.komisi_per_sekolah ?? []).map((s) => ({
        ...s,
        commission_percent: parseFloat(s.commission_percent),
    }));
    const setoranTerbaru = d?.setoran_terbaru ?? [];

    const periodSuffix: Record<string, string> = {
        minggu_ini: "Minggu Ini",
        bulan_ini: "Bulan Ini",
        "3_bulan": "3 Bulan Terakhir",
        tahun_ini: "Tahun Ini",
        custom: "(Periode Kustom)",
    };

    function kpiLabel(key: KpiKey): string {
        if (key === "pendapatan_bulan_ini") return `Pendapatan ${periodSuffix[period]}`;
        if (key === "tagihan_outstanding") return `Total Tagihan yang Belum Dibayar`;
        if (key === "rata_rata_komisi") return `Rata-rata Komisi`;
        if (key === "sekolah_aktif") return `Sekolah Aktif`;
        if (key === "menunggu_verifikasi") return `Menunggu Verifikasi`;
        return key;
    }

    type KpiKey = keyof Pick<DashboardData, "pendapatan_bulan_ini" | "tagihan_outstanding" | "rata_rata_komisi" | "sekolah_aktif" | "menunggu_verifikasi">;

    const kpiDefs: { key: KpiKey; label: () => string; icon: React.ReactNode; fmt: (n: number) => string; tone: string }[] = [
        { key: "pendapatan_bulan_ini", label: () => kpiLabel("pendapatan_bulan_ini"), icon: <Wallet className="h-5 w-5" />, fmt: rp, tone: "emerald" },
        { key: "tagihan_outstanding", label: () => kpiLabel("tagihan_outstanding"), icon: <ReceiptText className="h-5 w-5" />, fmt: rp, tone: "amber" },
        { key: "rata_rata_komisi", label: () => kpiLabel("rata_rata_komisi"), icon: <Percent className="h-5 w-5" />, fmt: (n: number) => `${n}%`, tone: "violet" },
        { key: "sekolah_aktif", label: () => kpiLabel("sekolah_aktif"), icon: <Building2 className="h-5 w-5" />, fmt: (n: number) => String(n), tone: "blue" },
        { key: "menunggu_verifikasi", label: () => kpiLabel("menunggu_verifikasi"), icon: <Clock className="h-5 w-5" />, fmt: (n: number) => String(n), tone: "amber" },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">Dashboard Keuangan</h1>
                <p className="text-sm text-muted-foreground">Ringkasan dan analitik keuangan Robotiku.</p>
            </div>

            {/* Time Range Filter */}
            <div className="flex flex-wrap items-center gap-2">
                {PERIODS.map((p) => (
                    <Button
                        key={p.key}
                        size="sm"
                        variant={period === p.key ? "default" : "outline"}
                        onClick={() => setPeriod(p.key)}
                    >
                        {p.label}
                    </Button>
                ))}
            </div>

            {isCustom && (
                <div className="flex flex-wrap items-center gap-3" suppressHydrationWarning>
                    <div className="flex items-center gap-2">
                        <label className="text-xs text-muted-foreground">Dari</label>
                        <input
                            type="date"
                            className="rounded-lg border px-3 py-1.5 text-sm"
                            value={customStart}
                            onChange={(e) => setCustomStart(e.target.value)}
                            suppressHydrationWarning
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-xs text-muted-foreground">Sampai</label>
                        <input
                            type="date"
                            className="rounded-lg border px-3 py-1.5 text-sm"
                            value={customEnd}
                            onChange={(e) => setCustomEnd(e.target.value)}
                            suppressHydrationWarning
                        />
                    </div>
                </div>
            )}

            {/* KPI Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {kpiDefs.map((k) => (
                    <KpiCard
                        key={k.key}
                        icon={k.icon}
                        label={k.label()}
                        value={loading ? <Skeleton className="h-7 w-28" /> : k.fmt(d?.[k.key] ?? 0)}
                        trend={t?.[k.key]}
                        tone={k.tone}
                    />
                ))}
            </div>

            {/* Charts Row 1 */}
            <div className="grid gap-4 lg:grid-cols-2">
                {/* Pendapatan per Bulan */}
                <ChartCard title="Pendapatan per Bulan" isEmpty={!loading && pendapatanPerBulan.length === 0}>
                    {loading ? (
                        <Skeleton className="h-[260px] w-full rounded-xl" />
                    ) : pendapatanPerBulan.length > 0 && (
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={pendapatanPerBulan} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                                <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis fontSize={12} tickLine={false} axisLine={false}
                                    tickFormatter={(v: number) => "Rp" + (v / 1_000_000).toFixed(0) + "jt"} />
                                <Tooltip formatter={(v) => rp(Number(v))} />
                                <Bar dataKey="total" fill="#0476d9" radius={[6, 6, 0, 0]} name="Pendapatan" />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>

                {/* Status Pembayaran Global */}
                <ChartCard title="Status Pembayaran Global" isEmpty={!loading && statusPembayaran.length === 0}>
                    {loading ? (
                        <Skeleton className="h-[260px] w-full rounded-xl" />
                    ) : statusPembayaran.length > 0 && (
                        <ResponsiveContainer width="100%" height={260}>
                            <PieChart>
                                <Pie data={statusPembayaran} dataKey="value" nameKey="name"
                                    innerRadius={60} outerRadius={90} paddingAngle={2}>
                                    {statusPembayaran.map((_, i) => (
                                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(v) => Number(v).toLocaleString("id-ID")} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>
            </div>

            {/* Charts Row 2 */}
            <div className="grid gap-4 lg:grid-cols-2">
                {/* Total Tagihan yang Belum Dibayar per Sekolah Top 10 */}
                <ChartCard title="Total Tagihan yang Belum Dibayar per Sekolah (Top 10)" isEmpty={!loading && tagihanPerSekolah.length === 0}>
                    {loading ? (
                        <Skeleton className="h-[260px] w-full rounded-xl" />
                    ) : tagihanPerSekolah.length > 0 && (
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={tagihanPerSekolah} layout="vertical" margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                                <XAxis type="number" fontSize={12} tickLine={false} axisLine={false}
                                    tickFormatter={(v: number) => "Rp" + (v / 1_000_000).toFixed(0) + "jt"} />
                                <YAxis type="category" dataKey="school_name" width={130} fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip formatter={(v) => rp(Number(v))} />
                                <Bar dataKey="total" fill="#f59e0b" radius={[0, 6, 6, 0]} name="Tagihan" />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>

                {/* Komisi per Sekolah */}
                <ChartCard title="Komisi per Sekolah" isEmpty={!loading && komisiPerSekolah.length === 0}>
                    {loading ? (
                        <Skeleton className="h-[260px] w-full rounded-xl" />
                    ) : komisiPerSekolah.length > 0 && (
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={komisiPerSekolah} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                                <XAxis dataKey="school_name" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis fontSize={12} tickLine={false} axisLine={false}
                                    tickFormatter={(v: number) => v + "%"} domain={[0, 100]} />
                                <Tooltip formatter={(v) => Number(v) + "%"} />
                                <Bar dataKey="commission_percent" fill="#8b5cf6" radius={[6, 6, 0, 0]} name="Komisi" />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>
            </div>

            {/* Insight Cards */}
            <div className="grid gap-4 sm:grid-cols-3">
                <Card className="border-2 p-5">
                    <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                            <Clock className="h-5 w-5" />
                        </span>
                        <div>
                            <div className="text-xs text-muted-foreground">Menunggu Verifikasi</div>
                            <div className="text-lg font-semibold">
                                {loading ? <Skeleton className="h-5 w-16" /> : `${d?.menunggu_verifikasi ?? 0} setoran`}
                            </div>
                        </div>
                    </div>
                </Card>

                <Link href="/app/keuangan/verifikasi" className="block">
                    <Card className="group border-2 p-5 transition-all hover:-translate-y-0.5 hover:shadow-md">
                        <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                <ReceiptText className="h-5 w-5" />
                            </span>
                            <div className="flex-1">
                                <div className="text-xs text-muted-foreground">Setoran Sekolah</div>
                                <div className="text-lg font-semibold">Kelola Setoran</div>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                        </div>
                    </Card>
                </Link>

                <Card className="border-2 p-5">
                    <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                            <Building2 className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                            <div className="text-xs text-muted-foreground">Sekolah Aktif</div>
                            <div className="truncate text-lg font-semibold">
                                {loading ? <Skeleton className="h-5 w-16" /> : `${d?.sekolah_aktif ?? 0} sekolah`}
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Setoran Terbaru Table */}
            <Card className="border-2">
                <div className="border-b px-5 py-3">
                    <h3 className="text-sm font-semibold">Setoran Terbaru</h3>
                </div>

                {loading ? (
                    <TableSkeleton rows={5} />
                ) : setoranTerbaru.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                        <Calendar className="mb-2 h-8 w-8" />
                        <span className="text-sm">Belum ada setoran</span>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Sekolah</TableHead>
                                <TableHead className="text-right">Nominal</TableHead>
                                <TableHead>Tanggal</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {setoranTerbaru.map((s, i) => (
                                <TableRow key={i}>
                                    <TableCell className="font-medium">{s.school_name}</TableCell>
                                    <TableCell className="text-right font-medium">{rp(s.net_amount)}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground">{s.created_at?.slice(0, 10)}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={cn("capitalize", statusCls[s.status] || "")}>
                                            {s.status.replace(/_/g, " ")}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </Card>
        </div>
    );
}
