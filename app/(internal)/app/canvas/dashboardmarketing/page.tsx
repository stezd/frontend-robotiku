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
    Calendar,
    History,
    TrendingUp,
} from "lucide-react";
import { InternalShell } from "@/components/internal/InternalShell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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

    const isAllTime = period === "all_time";
    const selectedMonthName = MONTHS[month - 1];

    const { data, isLoading } = useQuery<MarketingDashboardData>({
        queryKey: ["canvas-dashboard-marketing", period, !isAllTime ? `${month}-${year}` : "all"],
        queryFn: async () => {
            const params: Record<string, string | number> = { period };
            if (!isAllTime) {
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
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <Skeleton className="h-8 w-56" />
                            <Skeleton className="mt-1 h-4 w-72" />
                        </div>
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-8 w-24" />
                            <Skeleton className="h-8 w-28" />
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Card key={i}>
                                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                                    <Skeleton className="h-4 w-28" />
                                    <Skeleton className="h-4 w-4" />
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <Skeleton className="h-8 w-20" />
                                    <Skeleton className="h-3 w-32" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <div className="grid gap-4 lg:grid-cols-5">
                        <Card className="lg:col-span-3">
                            <CardHeader>
                                <Skeleton className="h-5 w-44" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-[200px] w-full" />
                            </CardContent>
                        </Card>
                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <Skeleton className="h-5 w-40" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-[200px] w-full" />
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <Skeleton className="h-5 w-44" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-36 w-full" />
                        </CardContent>
                    </Card>
                </div>
            </InternalShell>
        );
    }

    const { kpi, status, prioritas } = data;

    const safeTarget = Math.max(1, kpi.targetKunjungan);
    const pencapaianKunjungan = Math.min(100, Math.round((kpi.kunjunganBulanIni / safeTarget) * 100));
    const sisaKunjungan = Math.max(0, kpi.targetKunjungan - kpi.kunjunganBulanIni);
    const totalPipeline = status.reduce((acc, curr) => acc + curr.value, 0);

    const mouDisplay = isAllTime ? (kpi.mouTotal ?? kpi.mouBulanIni) : kpi.mouBulanIni;
    const kunjunganDisplay = isAllTime ? (kpi.kunjunganTotal ?? kpi.kunjunganBulanIni) : kpi.kunjunganBulanIni;
    const kunjunganPerMou = (mouDisplay > 0 && kunjunganDisplay > 0)
        ? (kunjunganDisplay / mouDisplay).toFixed(1)
        : "-";

    const cards = [
        {
            label: "Prospek Aktif",
            value: kpi.prospekAktif,
            subtitle: "Tahap prospek & penjajakan",
            icon: Building2,
        },
        {
            label: "Perlu Tindak Lanjut",
            value: (
                <div className="flex items-baseline justify-between">
                    <span>{kpi.menungguFollowUp}</span>
                    {kpi.menungguFollowUp > 0 ? (
                        <Badge variant="outline" className="text-amber-600 border-amber-200 dark:border-amber-900/50 text-[11px] font-normal">
                            Perlu Atensi
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="text-emerald-600 border-emerald-200 dark:border-emerald-900/50 text-[11px] font-normal">
                            Lancar
                        </Badge>
                    )}
                </div>
            ),
            subtitle: "> 7 hari tanpa kunjungan",
            icon: Clock,
        },
        {
            label: isAllTime ? "Total MoU (All Time)" : `MoU (${selectedMonthName})`,
            value: mouDisplay,
            subtitle: isAllTime ? "Total kemitraan resmi tercatat" : `MoU di ${selectedMonthName} ${year}`,
            icon: Handshake,
        },
        {
            label: isAllTime ? "Total Kunjungan (All Time)" : "Kunjungan Lapangan",
            value: (
                <div className="flex items-baseline gap-1.5">
                    <span>{kunjunganDisplay}</span>
                    {!isAllTime && (
                        <span className="text-xs text-muted-foreground font-normal">
                            / {kpi.targetKunjungan} target
                        </span>
                    )}
                </div>
            ),
            subtitle: isAllTime
                ? "Total pertemuan lapangan tercatat"
                : `Capaian ${pencapaianKunjungan}% di ${selectedMonthName} ${year}`,
            icon: MapPin,
        },
    ];

    return (
        <InternalShell>
            <div className="space-y-6">
                {/* Header: Konsisten dengan SuperAdmin Dashboard */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">Dashboard Marketing</h1>
                        <p className="text-sm text-muted-foreground">
                            Ringkasan performa pipeline sekolah mitra dan target operasional canvas.
                        </p>
                    </div>

                    {/* Filter Periode & Aksi Cepat */}
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            size="sm"
                            variant={!isAllTime ? "default" : "outline"}
                            onClick={() => setPeriod("bulan_ini")}
                        >
                            <Calendar className="mr-1.5 h-3.5 w-3.5" />
                            Bulan Ini
                        </Button>
                        <Button
                            size="sm"
                            variant={isAllTime ? "default" : "outline"}
                            onClick={() => setPeriod("all_time")}
                        >
                            <History className="mr-1.5 h-3.5 w-3.5" />
                            Semua Waktu
                        </Button>

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
                                <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Baris 1: Metric Cards - Konsisten dengan SuperAdmin Dashboard */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {cards.map(({ label, value, subtitle, icon: Icon }) => (
                        <Card key={label}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
                                <Icon className="h-4 w-4 text-primary" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-semibold tracking-tight tabular-nums">
                                    {value}
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Baris 2: Pipeline Sekolah (Canvas) & Target/Akumulasi */}
                <div className="grid gap-4 lg:grid-cols-5">
                    {/* Pipeline Sekolah - Konsisten dengan pola SuperAdmin */}
                    <Card className="lg:col-span-3">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div>
                                <CardTitle className="text-base font-semibold">Pipeline Sekolah (Canvas)</CardTitle>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Total {totalPipeline} sekolah mitra pada tahapan kanvas
                                </p>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-2">
                            {/* Format Badge Pills sesuai persis dengan SuperAdmin Dashboard */}
                            <div className="flex flex-wrap gap-3">
                                {status.map((p) => {
                                    const percentage = totalPipeline > 0 ? Math.round((p.value / totalPipeline) * 100) : 0;
                                    return (
                                        <div key={p.name} className="flex items-center gap-2 rounded-lg border px-4 py-2">
                                            <span className="text-sm text-muted-foreground">{p.name}</span>
                                            <Badge variant="secondary">{p.value}</Badge>
                                            <span className="text-xs text-muted-foreground">({percentage}%)</span>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Grafik Horizontal Batang Distribusi */}
                            <div className="h-[150px] w-full pt-1">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        layout="vertical"
                                        data={status}
                                        margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
                                    >
                                        <XAxis type="number" hide />
                                        <YAxis
                                            dataKey="name"
                                            type="category"
                                            axisLine={false}
                                            tickLine={false}
                                            fontSize={12}
                                            width={90}
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
                                            barSize={20}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Sisi Kanan: Target Bulanan vs Kinerja Akumulatif */}
                    <Card className="lg:col-span-2 flex flex-col justify-between">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div>
                                <CardTitle className="text-base font-semibold">
                                    {isAllTime ? "Kinerja Kemitraan (All Time)" : "Target Kunjungan Bulanan"}
                                </CardTitle>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {isAllTime ? "Akumulasi aktivitas sepanjang waktu" : `Target ${selectedMonthName} ${year}`}
                                </p>
                            </div>
                            {isAllTime ? (
                                <TrendingUp className="h-4 w-4 text-primary" />
                            ) : (
                                <MapPin className="h-4 w-4 text-primary" />
                            )}
                        </CardHeader>

                        {!isAllTime ? (
                            <CardContent className="space-y-4 pt-2">
                                <div className="space-y-2">
                                    <div className="flex items-baseline justify-between text-sm">
                                        <span className="text-muted-foreground">Pencapaian Kuota</span>
                                        <span className="font-semibold tabular-nums text-foreground">{pencapaianKunjungan}%</span>
                                    </div>
                                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                        <div
                                            className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                                            style={{ width: `${pencapaianKunjungan}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    <div className="flex flex-col rounded-lg border p-3">
                                        <span className="text-xs text-muted-foreground">Realisasi</span>
                                        <span className="text-lg font-semibold tabular-nums mt-0.5">{kpi.kunjunganBulanIni}</span>
                                        <span className="text-[11px] text-muted-foreground">Kunjungan</span>
                                    </div>
                                    <div className="flex flex-col rounded-lg border p-3">
                                        <span className="text-xs text-muted-foreground">Target Bulanan</span>
                                        <span className="text-lg font-semibold tabular-nums mt-0.5">{kpi.targetKunjungan}</span>
                                        <span className="text-[11px] text-muted-foreground">Kunjungan</span>
                                    </div>
                                </div>

                                <div className="rounded-lg border px-3 py-2 text-xs text-muted-foreground">
                                    {sisaKunjungan > 0
                                        ? `Diperlukan ${sisaKunjungan} kunjungan lagi untuk memenuhi target bulan ini.`
                                        : "Target kuota kunjungan untuk periode bulan ini telah tercapai."}
                                </div>
                            </CardContent>
                        ) : (
                            <CardContent className="space-y-4 pt-2">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex flex-col rounded-lg border p-3">
                                        <span className="text-xs text-muted-foreground">Total Kunjungan</span>
                                        <span className="text-lg font-semibold tabular-nums mt-0.5">{kunjunganDisplay}</span>
                                        <span className="text-[11px] text-muted-foreground">Tatap muka</span>
                                    </div>
                                    <div className="flex flex-col rounded-lg border p-3">
                                        <span className="text-xs text-muted-foreground">Total MoU</span>
                                        <span className="text-lg font-semibold tabular-nums mt-0.5 text-emerald-600 dark:text-emerald-400">
                                            {mouDisplay}
                                        </span>
                                        <span className="text-[11px] text-muted-foreground">Resmi sepakat</span>
                                    </div>
                                </div>

                                <div className="rounded-lg border px-3 py-2.5 space-y-1">
                                    <div className="flex items-baseline justify-between text-xs">
                                        <span className="text-muted-foreground">Efektivitas Interaksi:</span>
                                        <span className="font-semibold text-foreground tabular-nums">
                                            {kunjunganPerMou} kunjungan / MoU
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground">
                                        Rata-rata frekuensi kunjungan lapangan yang dibutuhkan untuk closing 1 sekolah mitra.
                                    </p>
                                </div>
                            </CardContent>
                        )}
                    </Card>
                </div>

                {/* Baris 3: Prioritas Follow-Up */}
                <Card>
                    <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-4">
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-base font-semibold">Prioritas Tindak Lanjut</CardTitle>
                            {prioritas.length > 0 && <Badge variant="secondary">{prioritas.length}</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Sekolah mitra status &apos;Dalam Proses&apos; yang belum dikunjungi lebih dari 7 hari.
                        </p>
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
                                                        <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
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