"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { CalendarCheck, Wallet, GraduationCap, ClipboardList, ChevronRight, CheckCircle2, Building2 } from "lucide-react";
import { api, type ApiEnvelope } from "@/lib/api";
import { ParentShell } from "@/components/ortu/ParentShell";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useParentGuard } from "@/lib/use-parent-guard";
import { useParent } from "@/lib/parent-store";

type Progress = {
    student: { id: number; name: string; student_code: string; status: string; school?: string | null };
    summary: { hadir: number; izin: number; tidak_hadir: number; total_sesi: number };
    attendances: unknown[];
};
type Invoice = { id: number; status: string };
type Rapot = { id: number };

const COLORS = { hadir: "#10b981", izin: "#3b82f6", tidak_hadir: "#ef4444" };

export default function OrtuDashboard() {
    const { parent, ready } = useParentGuard();
    const updateSchoolName = useParent((s) => s.updateSchoolName);
    const selfManaged = !!parent?.selfManaged;

    const progQ = useQuery({
        queryKey: ["ortu-progress", parent?.studentId],
        enabled: !!parent?.studentId,
        queryFn: async () =>
            (await api.post<ApiEnvelope<Progress>>("/murid/progress", { student_id: parent!.studentId, phone: parent!.phone })).data.data,
    });
    const invQ = useQuery({
        queryKey: ["ortu-invoices", parent?.studentId],
        enabled: !!parent?.studentId && !selfManaged,   // sekolah kelola-sendiri → tak ada tagihan
        queryFn: async () =>
            (await api.post<ApiEnvelope<{ invoices: Invoice[] }>>("/bayar/tagihan", { student_id: parent!.studentId, phone: parent!.phone })).data.data.invoices,
    });
    const rapotQ = useQuery({
        queryKey: ["ortu-rapot-count", parent?.studentId],
        enabled: !!parent?.studentId,
        queryFn: async () =>
            (await api.post<ApiEnvelope<Rapot[]>>("/e-rapot/parent", { student_id: parent!.studentId, phone: parent!.phone })).data.data,
    });

    useEffect(() => {
        if (progQ.data?.student?.school && !parent?.schoolName) {
            updateSchoolName(progQ.data.student.school);
        }
    }, [progQ.data?.student?.school, parent?.schoolName, updateSchoolName]);

    if (!ready || !parent) {
        return (
            <ParentShell>
                <Skeleton className="h-64 rounded-xl" />
            </ParentShell>
        );
    }

    const s = progQ.data?.summary;
    const belumLunas = (invQ.data ?? []).filter((i) => i.status !== "lunas").length;
    const rapotCount = rapotQ.data?.length ?? 0;
    const schoolName = parent?.schoolName || progQ.data?.student?.school;

    const pie = s
        ? [
            { name: "Hadir", key: "hadir", value: s.hadir },
            { name: "Izin", key: "izin", value: s.izin },
            { name: "Tidak Hadir", key: "tidak_hadir", value: s.tidak_hadir },
        ].filter((d) => d.value > 0)
        : [];

    const loading = progQ.isLoading;

    return (
        <ParentShell>
            <PageHeader
                title={progQ.data ? `Halo, ${progQ.data.student.name} 👋` : "Beranda"}
                subtitle={progQ.data ? `${progQ.data.student.student_code} · Status: ${progQ.data.student.status}` : "Ringkasan perkembangan ananda."}
            />

            {loading || !s ? (
                <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
                    <Skeleton className="h-72 rounded-xl" />
                </div>
            ) : (
                <div className="mt-4 space-y-6">
                    {/* KPI */}
                    <div className={`grid gap-4 sm:grid-cols-2 ${selfManaged ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}>
                        <Kpi href="/ortu/progres" icon={<ClipboardList className="h-5 w-5" />} label="Total Sesi" value={s.total_sesi} tint="bg-slate-100 text-slate-700" />
                        <Kpi href="/ortu/progres" icon={<CalendarCheck className="h-5 w-5" />} label="Hadir" value={s.hadir} tint="bg-emerald-100 text-emerald-700" />
                        {!selfManaged && <Kpi href="/ortu/tagihan" icon={<Wallet className="h-5 w-5" />} label="Tagihan Belum Lunas" value={belumLunas} tint="bg-amber-100 text-amber-700" />}
                        <Kpi href="/ortu/rapot" icon={<GraduationCap className="h-5 w-5" />} label="E-Rapot" value={rapotCount} tint="bg-blue-100 text-blue-700" />
                    </div>

                    <div className="grid gap-6 lg:grid-cols-3">
                        {/* Chart kehadiran */}
                        <Card className="flex flex-col justify-between border-2 p-5 lg:col-span-2">
                            <div>
                                <div className="mb-4 flex items-center justify-between">
                                    <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                                        <CalendarCheck className="h-4 w-4" /> Rekap Kehadiran
                                    </h3>
                                    <Link href="/ortu/progres" className="flex items-center gap-0.5 text-xs font-semibold text-primary hover:underline">
                                        Lihat Progres <ChevronRight className="h-3.5 w-3.5" />
                                    </Link>
                                </div>
                                {pie.length ? (
                                    <div className="flex flex-col items-center gap-6 sm:flex-row">
                                        <div className="h-52 w-52">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie data={pie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                                                        {pie.map((d) => <Cell key={d.key} fill={COLORS[d.key as keyof typeof COLORS]} />)}
                                                    </Pie>
                                                    <Tooltip />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            {pie.map((d) => (
                                                <div key={d.key} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                                                    <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: COLORS[d.key as keyof typeof COLORS] }} /> {d.name}</span>
                                                    <span className="font-semibold">{d.value} sesi</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <p className="py-10 text-center text-sm text-muted-foreground">Belum ada data kehadiran.</p>
                                )}
                            </div>
                        </Card>

                        {/* Tagihan / info pembayaran */}
                        {selfManaged ? (
                            <Card className="flex flex-col border-2 p-5">
                                <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold"><Building2 className="h-4 w-4" /> Pembayaran</h3>
                                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                                    Pendaftaran &amp; pembayaran ananda dikelola langsung oleh pihak {schoolName ? <b>{schoolName}</b> : "sekolah"}, jadi tidak ada tagihan di portal ini.
                                </div>
                                <p className="mt-auto pt-3 text-xs text-muted-foreground">Hubungi pihak {schoolName || "sekolah"} untuk urusan biaya.</p>
                            </Card>
                        ) : (
                            <Card className="flex flex-col border-2 p-5">
                                <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold"><Wallet className="h-4 w-4" /> Tagihan</h3>
                                {belumLunas > 0 ? (
                                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                                        <div className="text-sm text-amber-800">Ada tagihan menunggu</div>
                                        <div className="mt-1 text-3xl font-bold text-amber-600">{belumLunas}</div>
                                        <div className="text-xs text-amber-700">tagihan belum lunas</div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                                        <CheckCircle2 className="h-5 w-5" /> Semua tagihan lunas
                                    </div>
                                )}
                                <Link href="/ortu/tagihan" className="mt-auto pt-3">
                                    <Button className="w-full" variant={belumLunas > 0 ? "default" : "outline"}>Buka Halaman Tagihan <ChevronRight className="ml-1 h-4 w-4" /></Button>
                                </Link>
                            </Card>
                        )}
                    </div>
                </div>
            )}
        </ParentShell>
    );
}

function Kpi({
    icon, label, value, tint, href,
}: {
    icon: React.ReactNode; label: string; value: number; tint: string; href?: string;
}) {
    const content = (
        <Card className={`border-2 p-4 transition-all duration-150 ${href ? "hover:border-primary/40 hover:shadow-sm" : ""}`}>
            <div className="flex items-center gap-3">
                <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${tint}`}>{icon}</span>
                <div>
                    <div className="text-2xl font-bold leading-none">{value}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{label}</div>
                </div>
            </div>
        </Card>
    );

    return href ? <Link href={href} className="block">{content}</Link> : content;
}