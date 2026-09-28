"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Building2, Handshake, MapPinned, Users, TrendingUp, Settings, CalendarDays, History } from "lucide-react";
import { useAuth } from "@/lib/auth-store";
import { InternalShell } from "@/components/internal/InternalShell";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function CanvasAnalitikPage() {
    const actor = useAuth((s) => s.actor);
    const isSuperAdmin = actor?.kind === "user" && actor.role === "super_admin";

    // Tarik data asli dari Backend Laravel
    const { data: realData, isLoading } = useQuery({
        queryKey: ['canvas-analitik'],
        queryFn: async () => (await api.get("/canvas/analitik")).data.data,
    });

    const queryClient = useQueryClient();
    const [isSettingOpen, setIsSettingOpen] = useState(false);
    const [targetKunjungan, setTargetKunjungan] = useState("20");
    const [isSaving, setIsSaving] = useState(false);
    const [trendFilter, setTrendFilter] = useState<"tahun_ini" | "tahun_lalu">("tahun_ini");

    const handleOpenSetting = () => {
        // Setel nilai inputan sesuai dengan data asli dari database saat modal dibuka
        setTargetKunjungan(String(realData?.kpi?.target_kunjungan_bulanan || 20));
        setIsSettingOpen(true);
    };

    const handleSaveTarget = async () => {
        try {
            setIsSaving(true);
            await api.post("/canvas/target-kunjungan", { target: Number(targetKunjungan) });
            alert(`Target kunjungan berhasil diubah menjadi ${targetKunjungan} per Marketing.`);
            setIsSettingOpen(false);
            queryClient.invalidateQueries({ queryKey: ['canvas-analitik'] });
        } catch (error) {
            alert("Gagal menyimpan target ke server.");
        } finally {
            setIsSaving(false);
        }
    };

    // Tampilkan indikator loading tanpa merusak layout sidebar
    if (isLoading || !realData) {
        return (
            <InternalShell>
                <div className="flex h-[60vh] items-center justify-center">
                    <span className="animate-pulse text-sm font-medium text-muted-foreground">Memuat data analitik...</span>
                </div>
            </InternalShell>
        );
    }

    return (
        <InternalShell>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
                <PageHeader title="Analitik Canvas" subtitle="Pemantauan kinerja makro dan hasil pipeline sekolah mitra." />
                
                {isSuperAdmin && (
                    <Button onClick={handleOpenSetting} variant="outline" className="shadow-sm">
                        <Settings className="mr-2 h-4 w-4" /> Atur Target KPI
                    </Button>
                )}
            </div>

            <div className="space-y-6">
                {/* BARIS 1: KPI SCORECARD DENGAN LABEL WAKTU */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <Kpi icon={<Building2 />} label="Total Sekolah" value={realData.kpi.total} timeframe="Sepanjang Waktu" tint="bg-blue-50 text-blue-600" />
                    <Kpi icon={<Handshake />} label="Sudah MoU" value={realData.kpi.mou} timeframe="Sepanjang Waktu" tint="bg-emerald-50 text-emerald-600" />
                    <Kpi icon={<TrendingUp />} label="Konversi Global" value={`${realData.kpi.konversi}%`} timeframe="Sepanjang Waktu" tint="bg-violet-50 text-violet-600" />
                    <Kpi icon={<MapPinned />} label="Total Kunjungan" value={realData.kpi.kunjungan} timeframe="Bulan Ini" tint="bg-amber-50 text-amber-600" />
                    <Kpi icon={<Users />} label="Canvaser Aktif" value={realData.kpi.canvaser_aktif} timeframe="Bulan Ini" tint="bg-slate-100 text-slate-600" />
                </div>

                {/* BARIS 2: GRAFIK CORONG & TREN */}
                <div className="grid gap-4 lg:grid-cols-5">
                    {/* Kiri (60%) */}
                    <div className="lg:col-span-3">
                        <ChartCard title="Distribusi Tahapan Pipeline" subtitle="Kondisi Saat Ini (Real-time)">
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart layout="vertical" data={realData.status} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={100} axisLine={false} tickLine={false} fontSize={12} className="font-medium text-slate-600" />
                                    <Tooltip cursor={{ fill: 'rgba(0,0,0,0.03)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    <Bar dataKey="value" fill="#0476d9" radius={[0, 6, 6, 0]} barSize={36} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartCard>
                    </div>

                    {/* Kanan (40%) - Dengan Filter Tahun */}
                    <div className="lg:col-span-2">
                        <ChartCard 
                            title="Tren Penambahan MoU" 
                            action={
                                <select 
                                    value={trendFilter} 
                                    onChange={(e) => setTrendFilter(e.target.value as "tahun_ini" | "tahun_lalu")}
                                    className="h-8 rounded-md border border-slate-200 bg-slate-50 px-2 text-xs font-medium text-slate-600 outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                                >
                                    <option value="tahun_ini">Tahun Ini</option>
                                    <option value="tahun_lalu">Tahun Lalu</option>
                                </select>
                            }
                        >
                            <ResponsiveContainer width="100%" height={260}>
                                <AreaChart data={realData.tren[trendFilter]}>
                                    <defs>
                                        <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                                            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="bulan" fontSize={12} axisLine={false} tickLine={false} />
                                    <YAxis allowDecimals={false} fontSize={12} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    <Area type="monotone" dataKey="jumlah" stroke="#10b981" fill="url(#cg)" strokeWidth={3} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </ChartCard>
                    </div>
                </div>

                {/* BARIS 3: TABEL PERFORMA CANVASER */}
                <Card className="overflow-hidden border-t-4 border-t-brand shadow-sm">
                    <div className="border-b p-5">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-800">Papan Peringkat Performa Canvaser</h3>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Perbandingan efektivitas dan mobilitas antar personel Marketing.</p>
                    </div>
                    {realData.per_canvaser && realData.per_canvaser.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead>
                                    <tr className="bg-slate-50/70 text-xs uppercase tracking-wide text-slate-500">
                                        <th className="px-5 py-4 font-semibold">Nama Canvaser</th>
                                        <th className="px-5 py-4 font-semibold">Total Prospek</th>
                                        <th className="px-5 py-4 font-semibold">Berhasil MoU</th>
                                        <th className="px-5 py-4 font-semibold">Log Kunjungan <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-800">Bulan Ini</span></th>
                                        <th className="px-5 py-4 font-semibold">Rasio Konversi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {realData.per_canvaser.map((c: any, i: number) => (
                                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-5 py-4 font-semibold text-slate-800">{c.name}</td>
                                            <td className="px-5 py-4 font-medium text-slate-600">{c.total} Sekolah</td>
                                            <td className="px-5 py-4 font-medium text-emerald-600">{c.mou} Deal</td>
                                            <td className="px-5 py-4 font-medium text-amber-600">{c.kunjungan} Kali</td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                                                        <div className="h-full rounded-full bg-brand" style={{ width: `${c.konversi}%` }} />
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-700">{c.konversi}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="p-6 text-center text-sm text-muted-foreground">Belum ada data canvaser aktif bulan ini.</p>
                    )}
                </Card>
            </div>

            {/* Dialog Pengaturan Target KPI */}
            <Dialog open={isSettingOpen} onOpenChange={setIsSettingOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Atur Target Kunjungan</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <p className="text-sm text-muted-foreground">
                            Angka ini akan menjadi indikator KPI wajib (100%) di Dasbor seluruh staf Marketing bulan ini.
                        </p>
                        <div className="space-y-2">
                            <Label htmlFor="target">Target Kunjungan per Bulan (per Orang)</Label>
                            <Input 
                                id="target" 
                                type="number" 
                                min={1} 
                                value={targetKunjungan} 
                                onChange={(e) => setTargetKunjungan(e.target.value)} 
                                className="font-semibold text-lg"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setIsSettingOpen(false)}>Batal</Button>
                        <Button type="button" onClick={handleSaveTarget} disabled={isSaving}>
                            {isSaving ? "Menyimpan..." : "Simpan Pengaturan"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </InternalShell>
    );
}

// KOMPONEN PENDUKUNG UI
function Kpi({ icon, label, value, timeframe, tint }: { icon: React.ReactNode; label: string; value: React.ReactNode; timeframe: string; tint: string }) {
    return (
        <Card className="p-5 rounded-2xl shadow-sm bg-white flex flex-col justify-between h-full">
            <div className="flex items-start justify-between">
                <div>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">{label}</div>
                    <div className="mt-2 text-3xl font-extrabold tracking-tight text-slate-800">{value}</div>
                </div>
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tint}`}>{icon}</span>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
                {timeframe === "Bulan Ini" ? <CalendarDays className="h-3 w-3" /> : <History className="h-3 w-3" />}
                {timeframe}
            </div>
        </Card>
    );
}

function ChartCard({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode }) {
    return (
        <Card className="p-5 rounded-2xl shadow-sm bg-white flex flex-col">
            <div className="mb-4 flex items-start justify-between">
                <div>
                    <h3 className="text-sm font-bold text-slate-800">{title}</h3>
                    {subtitle && (
                        <div className="mt-1 flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
                            <History className="h-3 w-3" /> {subtitle}
                        </div>
                    )}
                </div>
                {action && <div>{action}</div>}
            </div>
            <div className="flex-1">
                {children}
            </div>
        </Card>
    );
}