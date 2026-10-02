"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import {
    Building2,
    Handshake,
    MapPin,
    Clock,
    ArrowUpRight,
    CheckCircle2,
    Target,
    Calendar,
    Layers,
    History,
    TrendingUp,
} from "lucide-react";
import { InternalShell } from "@/components/internal/InternalShell";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const MONTHS = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

interface MarketingDashboardData {
    kpi: {
        prospekAktif: number;
        menungguFollowUp: number;
        mouBulanIni: number;
        mouTotal?: number;
        kunjunganBulanIni: number;
        kunjunganTotal?: number;
        targetKunjungan: number;
        period?: "bulan_ini" | "all_time";
        month?: number | null;
        year?: number | null;
    };
    status: Array<{
        name: string;
        value: number;
    }>;
    prioritas: Array<{
        id: number;
        name: string;
        status: string;
        last_touch: string;
    }>;
}

export default function MarketingDashboardPage() {
    const now = new Date();
    const [period, setPeriod] = useState<"bulan_ini" | "all_time">("bulan_ini");
    const [month, setMonth] = useState<number>(now.getMonth() + 1);
    const [year, setYear] = useState<number>(now.getFullYear());

    const { data, isLoading } = useQuery<MarketingDashboardData>({
        queryKey: ["canvas-dashboard-marketing", period, period === "bulan_ini" ? `${month}-${year}` : "all"],
        queryFn: async () => {
            const params: Record<string, string | number> = { period };
            if (period === "bulan_ini") {
                params.month = month;
                params.year = year;
            }
            return (await api.get("/canvas/dashboard-marketing", { params })).data.data;
        },
    });

    if (isLoading || !data) {
        return (
            <InternalShell>
                <div className="space-y-6">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <Skeleton className="h-7 w-48" />
                            <Skeleton className="mt-1 h-4 w-72" />
                        </div>
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-8 w-44" />
                            <Skeleton className="h-8 w-28" />
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Card key={i}>
                                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-4 w-4 rounded-full" />
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <Skeleton className="h-8 w-16" />
                                    <Skeleton className="h-3 w-32" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <div className="grid gap-4 lg:grid-cols-5">
                        <Card className="lg:col-span-3">
                            <CardHeader>
                                <Skeleton className="h-5 w-40" />
                                <Skeleton className="h-4 w-60" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-[220px] w-full" />
                            </CardContent>
                        </Card>
                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <Skeleton className="h-5 w-36" />
                                <Skeleton className="h-4 w-52" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-[220px] w-full" />
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <Skeleton className="h-5 w-44" />
                            <Skeleton className="h-4 w-80" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-40 w-full" />
                        </CardContent>
                    </Card>
                </div>
            </InternalShell>
        );
    }

    const { kpi, status, prioritas } = data;
    const isAllTime = period === "all_time";
    const selectedMonthName = MONTHS[month - 1];

    const safeTarget = Math.max(1, kpi.targetKunjungan);
    const pencapaianKunjungan = Math.min(100, Math.round((kpi.kunjunganBulanIni / safeTarget) * 100));
    const sisaKunjungan = Math.max(0, kpi.targetKunjungan - kpi.kunjunganBulanIni);
    const totalPipeline = status.reduce((acc, curr) => acc + curr.value, 0);

    const mouDisplay = isAllTime ? (kpi.mouTotal ?? kpi.mouBulanIni) : kpi.mouBulanIni;
    const kunjunganDisplay = isAllTime ? (kpi.kunjunganTotal ?? kpi.kunjunganBulanIni) : kpi.kunjunganBulanIni;
    const kunjunganPerMou = (mouDisplay > 0 && kunjunganDisplay > 0)
        ? (kunjunganDisplay / mouDisplay).toFixed(1)
        : "-";

    return (
        <InternalShell>
            <div className="space-y-6">
                {/* Header dengan Opsi Periode (Per Bulan / All Time) */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <PageHeader
                        title="Dashboard Marketing"
                        subtitle="Ringkasan aktivitas kanvas, status pipeline, dan prioritas follow-up sekolah mitra."
                    />

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Segmented Control Filter Periode */}
                        <div className="inline-flex items-center rounded-lg border bg-muted/50 p-1 text-xs">
                            <button
                                type="button"
                                onClick={() => setPeriod("bulan_ini")}
                                className={cn(
                                    "flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-all cursor-pointer",
                                    !isAllTime
                                        ? "bg-background text-foreground shadow-xs"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Calendar className="h-3.5 w-3.5" />
                                Per Bulan
                            </button>
                            <button
                                type="button"
                                onClick={() => setPeriod("all_time")}
                                className={cn(
                                    "flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-all cursor-pointer",
                                    isAllTime
                                        ? "bg-background text-foreground shadow-xs"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <History className="h-3.5 w-3.5" />
                                Semua Waktu
                            </button>
                        </div>

                        {/* Pemilih Bulan & Tahun ketika mode Per Bulan aktif */}
                        {!isAllTime && (
                            <div className="flex items-center gap-1.5">
                                <select
                                    value={month}
                                    onChange={(e) => setMonth(Number(e.target.value))}
                                    className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                                    aria-label="Pilih Bulan"
                                >
                                    {MONTHS.map((m, idx) => (
                                        <option key={idx + 1} value={idx + 1}>
                                            {m}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    value={year}
                                    onChange={(e) => setYear(Number(e.target.value))}
                                    className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                                    aria-label="Pilih Tahun"
                                >
                                    {[2024, 2025, 2026, 2027].map((y) => (
                                        <option key={y} value={y}>
                                            {y}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <Button variant="outline" size="sm" asChild>
                            <Link href="/app/canvas">
                                Pipeline Canvas
                                <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Baris 1: Key Metrics */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Prospek Aktif</CardTitle>
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-semibold tracking-tight tabular-nums">
                                {kpi.prospekAktif}
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Tahap prospek &amp; penjajakan
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Perlu Tindak Lanjut</CardTitle>
                            <Clock className={`h-4 w-4 ${kpi.menungguFollowUp > 0 ? "text-amber-500" : "text-muted-foreground"}`} />
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-baseline justify-between">
                                <div className="text-2xl font-semibold tracking-tight tabular-nums">
                                    {kpi.menungguFollowUp}
                                </div>
                                {kpi.menungguFollowUp > 0 ? (
                                    <Badge variant="outline" className="text-amber-600 border-amber-200 dark:border-amber-900/50">
                                        Perlu Atensi
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="text-emerald-600 border-emerald-200 dark:border-emerald-900/50">
                                        Lancar
                                    </Badge>
                                )}
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                                &gt; 7 hari tanpa interaksi
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                {isAllTime ? "Total MoU (All Time)" : `MoU (${selectedMonthName})`}
                            </CardTitle>
                            <Handshake className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-semibold tracking-tight tabular-nums">
                                {mouDisplay}
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {isAllTime ? "Total kemitraan resmi sepanjang waktu" : `Resmi disepakati di ${selectedMonthName} ${year}`}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                {isAllTime ? "Total Kunjungan" : "Kunjungan Lapangan"}
                            </CardTitle>
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-2xl font-semibold tracking-tight tabular-nums">
                                    {kunjunganDisplay}
                                </span>
                                {!isAllTime && (
                                    <span className="text-xs text-muted-foreground">
                                        / {kpi.targetKunjungan} target
                                    </span>
                                )}
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {isAllTime
                                    ? "Total kunjungan pertemuan tercatat"
                                    : `Capaian ${pencapaianKunjungan}% di ${selectedMonthName} ${year}`}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Baris 2: Pipeline Distribution & Target / Akumulasi Progress */}
                <div className="grid gap-4 lg:grid-cols-5">
                    {/* Pipeline Stage Funnel */}
                    <Card className="lg:col-span-3">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-base font-semibold">Distribusi Pipeline Kemitraan</CardTitle>
                                    <CardDescription>
                                        Sebaran {totalPipeline} sekolah mitra pada tahapan kanvas aktif
                                    </CardDescription>
                                </div>
                                <Layers className="h-4 w-4 text-muted-foreground" />
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Visual stage segments */}
                            <div className="grid grid-cols-3 gap-2 pt-1">
                                {status.map((item) => {
                                    const percentage = totalPipeline > 0 ? Math.round((item.value / totalPipeline) * 100) : 0;
                                    return (
                                        <div key={item.name} className="rounded-lg border bg-muted/30 p-3">
                                            <span className="text-xs font-medium text-muted-foreground">{item.name}</span>
                                            <div className="mt-1 flex items-baseline justify-between">
                                                <span className="text-lg font-semibold tabular-nums">{item.value}</span>
                                                <span className="text-xs text-muted-foreground tabular-nums">{percentage}%</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Horizontal Bar Chart */}
                            <div className="h-[180px] w-full pt-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        layout="vertical"
                                        data={status}
                                        margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
                                    >
                                        <XAxis type="number" hide />
                                        <YAxis
                                            dataKey="name"
                                            type="category"
                                            axisLine={false}
                                            tickLine={false}
                                            fontSize={12}
                                            width={100}
                                            className="fill-muted-foreground font-medium"
                                        />
                                        <Tooltip
                                            cursor={{ fill: "currentColor", opacity: 0.05 }}
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const row = payload[0].payload;
                                                    const pct = totalPipeline > 0 ? Math.round((row.value / totalPipeline) * 100) : 0;
                                                    return (
                                                        <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                                                            <p className="font-semibold text-popover-foreground">{row.name}</p>
                                                            <p className="text-muted-foreground mt-0.5">
                                                                <span className="font-medium text-foreground">{row.value} sekolah</span> ({pct}%)
                                                            </p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Bar
                                            dataKey="value"
                                            fill="var(--primary)"
                                            radius={[0, 4, 4, 0]}
                                            barSize={24}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Target / Kinerja Aktivitas Card */}
                    <Card className="lg:col-span-2 flex flex-col justify-between">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-base font-semibold">
                                        {isAllTime ? "Ringkasan Kinerja Kemitraan" : "Progres Target Kunjungan"}
                                    </CardTitle>
                                    <CardDescription>
                                        {isAllTime ? "Akumulasi aktivitas sepanjang waktu" : `Sasaran operasional ${selectedMonthName} ${year}`}
                                    </CardDescription>
                                </div>
                                {isAllTime ? (
                                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                    <Target className="h-4 w-4 text-muted-foreground" />
                                )}
                            </div>
                        </CardHeader>

                        {!isAllTime ? (
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <div className="flex items-baseline justify-between text-sm">
                                        <span className="text-muted-foreground">Capaian Kunjungan</span>
                                        <span className="font-semibold tabular-nums text-foreground">{pencapaianKunjungan}%</span>
                                    </div>
                                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                                        <div
                                            className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                                            style={{ width: `${pencapaianKunjungan}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 border-t pt-4">
                                    <div className="space-y-1">
                                        <span className="text-xs text-muted-foreground">Kunjungan Berjalan</span>
                                        <p className="text-lg font-semibold tabular-nums">{kpi.kunjunganBulanIni}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-xs text-muted-foreground">Target Bulanan</span>
                                        <p className="text-lg font-semibold tabular-nums">{kpi.targetKunjungan}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-xs text-muted-foreground">Sisa Kunjungan</span>
                                        <p className="text-lg font-semibold tabular-nums text-foreground">
                                            {sisaKunjungan === 0 ? "Target Terpenuhi" : `${sisaKunjungan} lagi`}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-xs text-muted-foreground">Status Aktivitas</span>
                                        <p className="text-xs font-medium text-foreground mt-1">
                                            {pencapaianKunjungan >= 100
                                                ? "Target tercapai"
                                                : pencapaianKunjungan >= 50
                                                ? "Sesuai ritme"
                                                : "Perlu percepatan"}
                                        </p>
                                    </div>
                                </div>

                                <p className="text-xs text-muted-foreground border-t pt-3">
                                    {sisaKunjungan > 0
                                        ? `Diperlukan ${sisaKunjungan} kunjungan lagi sebelum akhir bulan untuk memenuhi kuota target.`
                                        : "Target kuota kunjungan untuk periode bulan ini telah tercapai."}
                                </p>
                            </CardContent>
                        ) : (
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
                                        <span className="text-xs text-muted-foreground">Total Kunjungan</span>
                                        <p className="text-2xl font-bold tabular-nums text-foreground">{kunjunganDisplay}</p>
                                        <p className="text-[11px] text-muted-foreground">Log pertemuan lapangan</p>
                                    </div>
                                    <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
                                        <span className="text-xs text-muted-foreground">Total MoU</span>
                                        <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{mouDisplay}</p>
                                        <p className="text-[11px] text-muted-foreground">Kemitraan resmi aktif</p>
                                    </div>
                                </div>

                                <div className="border-t pt-4 space-y-2">
                                    <div className="flex items-baseline justify-between text-xs">
                                        <span className="text-muted-foreground">Rasio Efektivitas Kunjungan per MoU:</span>
                                        <span className="font-semibold text-foreground tabular-nums">
                                            {kunjunganPerMou} kunjungan / MoU
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                                        Statistik di atas merangkum seluruh catatan interaksi tatap muka dan konversi kesepakatan MoU sejak sekolah pertama kali didaftarkan.
                                    </p>
                                </div>
                            </CardContent>
                        )}
                    </Card>
                </div>

                {/* Baris 3: Prioritas Follow-Up */}
                <Card>
                    <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <CardTitle className="text-base font-semibold">Prioritas Tindak Lanjut</CardTitle>
                                {prioritas.length > 0 && (
                                    <Badge variant="secondary" className="font-normal text-xs">
                                        {prioritas.length} sekolah
                                    </Badge>
                                )}
                            </div>
                            <CardDescription className="mt-1">
                                Sekolah status &apos;Dalam Proses&apos; yang belum dikunjungi lebih dari 7 hari.
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {prioritas.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nama Sekolah Mitra</TableHead>
                                        <TableHead>Status Pipeline</TableHead>
                                        <TableHead>Interaksi Terakhir</TableHead>
                                        <TableHead className="text-right">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {prioritas.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium text-foreground">
                                                {item.name}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-xs font-normal">
                                                    {item.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                    <Clock className="h-3.5 w-3.5" />
                                                    <span>{item.last_touch}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="outline" size="sm" asChild>
                                                    <Link href={`/app/canvas/${item.id}`}>
                                                        Buka Canvas
                                                        <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="rounded-full bg-emerald-50 dark:bg-emerald-950/40 p-3 mb-3">
                                    <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <p className="text-sm font-medium text-foreground">Tidak Ada Antrean Mendesak</p>
                                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                                    Seluruh sekolah mitra berstatus dalam proses telah dikunjungi dalam 7 hari terakhir.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </InternalShell>
    );
}