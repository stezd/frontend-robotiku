"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ArrowLeft, ClipboardList, CalendarCheck, GraduationCap, Wallet, Download, Loader2, UserRound, Pencil } from "lucide-react";
import { api, type ApiEnvelope } from "@/lib/api";
import { SchoolShell } from "@/components/sekolah/SchoolShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StudentBiodataModal } from "@/components/student/StudentBiodataModal";

type Att = { id: number; status: string; score: string | null; trainer_name: string | null; attended_at: string };
type Progress = {
    student: { id: number; name: string; student_code: string; status: string };
    summary: { hadir: number; izin: number; tidak_hadir: number; total_sesi: number };
    attendances: Att[];
};
type Bio = {
    id: number;
    name: string;
    student_code: string;
    gender: "L" | "P";
    birth_date: string | null;
    shirt_size: string | null;
    school_origin?: string | null;
    school_grade: string | null;
    address?: string | null;
    allergy_notes: string | null;
    photo_permission: boolean;
    registration_type: string;
    created_at: string;
    program_id?: number | null;
    parent?: {
        name: string | null;
        phone: string | null;
        greeting?: string | null;
        phone_alt?: string | null;
    } | null;
    program?: { id?: number; name: string } | null;
};
type Rapot = {
    id: number; semester: number; year: number;
    skill_building: string; skill_imagination: string; skill_creativity: string; skill_logic: string;
    behavior_punctual: string; behavior_stay: string; behavior_communication: string; behavior_responsibility: string;
};
type Invoice = { id: number; invoice_number?: string; total_amount?: number; due_date?: string | null; status: string };
type Paginator<T> = { data: T[] };

const rp = (n?: number | null) => (n == null ? "-" : "Rp" + Number(n).toLocaleString("id-ID"));
const tgl = (s?: string | null) => (s ? new Date(s).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "-");
const tglLong = (s?: string | null) => (s ? new Date(s).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }) : "-");
const genderLabel = (g?: string) => (g === "L" ? "Laki-laki" : g === "P" ? "Perempuan" : "-");
const usia = (s?: string | null) => { if (!s) return null; const b = new Date(s), n = new Date(); let a = n.getFullYear() - b.getFullYear(); const m = n.getMonth() - b.getMonth(); if (m < 0 || (m === 0 && n.getDate() < b.getDate())) a--; return a; };

const SST: Record<string, { label: string; cls: string }> = {
    aktif: { label: "Aktif", cls: "border-emerald-200 bg-emerald-50 text-emerald-700" },
    cuti: { label: "Cuti", cls: "border-amber-200 bg-amber-50 text-amber-700" },
    nonaktif: { label: "Nonaktif", cls: "border-slate-200 bg-slate-100 text-slate-600" },
    lulus: { label: "Lulus", cls: "border-blue-200 bg-blue-50 text-blue-700" },
    berhenti: { label: "Berhenti", cls: "border-red-200 bg-red-50 text-red-700" },
};
const ATT: Record<string, string> = { hadir: "Hadir", izin: "Izin", sakit: "Sakit", tanpa_keterangan: "Tanpa Ket.", tidak_hadir: "Tidak Hadir" };
const ATT_CLS: Record<string, string> = {
    hadir: "border-emerald-200 bg-emerald-50 text-emerald-700", izin: "border-blue-200 bg-blue-50 text-blue-700",
    sakit: "border-amber-200 bg-amber-50 text-amber-700", tanpa_keterangan: "border-red-200 bg-red-50 text-red-700", tidak_hadir: "border-red-200 bg-red-50 text-red-700",
};
const GRADE_CLS: Record<string, string> = { A: "bg-emerald-500", B: "bg-lime-500", C: "bg-amber-500", D: "bg-orange-500", E: "bg-red-500" };
const ASPEK: { key: keyof Rapot; label: string; group: string }[] = [
    { key: "skill_building", label: "Building", group: "Skill" },
    { key: "skill_imagination", label: "Imagination", group: "Skill" },
    { key: "skill_creativity", label: "Creativity", group: "Skill" },
    { key: "skill_logic", label: "Logic Thinking", group: "Skill" },
    { key: "behavior_punctual", label: "Tepat Waktu", group: "Sikap" },
    { key: "behavior_stay", label: "Tidak Pulang Awal", group: "Sikap" },
    { key: "behavior_communication", label: "Komunikasi", group: "Sikap" },
    { key: "behavior_responsibility", label: "Tanggung Jawab", group: "Sikap" },
];
const PIE = { hadir: "#10b981", izin: "#3b82f6", tidak_hadir: "#ef4444" };

export default function SekolahMuridDetail({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [editOpen, setEditOpen] = useState(false);

    const progQ = useQuery({ queryKey: ["sekolah-murid-progress", id], queryFn: async () => (await api.get<ApiEnvelope<Progress>>(`/sekolah/murid/${id}/progress`)).data.data });
    const bioQ = useQuery({ queryKey: ["sekolah-murid-bio", id], queryFn: async () => (await api.get<ApiEnvelope<Bio>>(`/sekolah/murid/${id}`)).data.data });
    const rapotQ = useQuery({ queryKey: ["sekolah-murid-rapot", id], queryFn: async () => (await api.get<ApiEnvelope<Rapot[]>>(`/sekolah/murid/${id}/e-rapot`)).data.data });
    const invQ = useQuery({ queryKey: ["sekolah-murid-inv", id], queryFn: async () => (await api.get<ApiEnvelope<Paginator<Invoice>>>(`/bayar/sekolah/invoices?student_id=${id}&per_page=100`)).data.data.data });

    const p = progQ.data;
    const s = p?.summary;
    const total = s?.total_sesi ?? 0;
    const persen = total > 0 ? Math.round(((s?.hadir ?? 0) / total) * 100) : 0;
    const invoices = invQ.data ?? [];
    const belumLunas = invoices.filter((i) => i.status !== "lunas").length;

    const pie = s ? [
        { name: "Hadir", key: "hadir", value: s.hadir },
        { name: "Izin", key: "izin", value: s.izin },
        { name: "Tidak Hadir", key: "tidak_hadir", value: s.tidak_hadir },
    ].filter((d) => d.value > 0) : [];

    return (
        <SchoolShell>
            <Link href="/sekolah/murid" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" /> Kembali ke daftar murid
            </Link>

            {progQ.isLoading || !p || !s ? (
                <div className="space-y-4"><Skeleton className="h-24 rounded-xl" /><Skeleton className="h-72 rounded-xl" /></div>
            ) : (
                <div className="space-y-6">
                    {/* Header */}
                    <Card className="flex flex-wrap items-center gap-4 border-2 p-5">
                        <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-lg font-bold text-primary">
                            {p.student.name.charAt(0).toUpperCase()}
                        </span>
                        <div className="flex-1">
                            <div className="text-lg font-semibold">{p.student.name}</div>
                            <div className="text-sm text-muted-foreground">{p.student.student_code}</div>
                        </div>
                        {(() => {
                            const st = SST[p.student.status] ?? SST.nonaktif;
                            return <Badge variant="outline" className={st.cls}>{st.label}</Badge>;
                        })()}
                    </Card>

                    {/* Biodata pendaftaran */}
                    {bioQ.isLoading || !bioQ.data ? (
                        <Skeleton className="h-48 rounded-xl" />
                    ) : (
                        <Card className="border-2 p-5">
                            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                                <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                                    <UserRound className="h-4 w-4 text-primary" /> Biodata Murid
                                </h3>
                                <div className="flex items-center gap-3">
                                    <span className="hidden text-xs font-normal text-muted-foreground sm:inline">Data pendaftaran & wali</span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 gap-1.5 font-medium"
                                        onClick={() => setEditOpen(true)}
                                    >
                                        <Pencil className="h-3.5 w-3.5" />
                                        <span>Edit Biodata</span>
                                    </Button>
                                </div>
                            </div>
                            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                <DataItem label="Nama Lengkap" value={bioQ.data.name} />
                                <DataItem label="Kode Murid" value={<span className="font-mono">{bioQ.data.student_code}</span>} />
                                <DataItem label="Jenis Kelamin" value={genderLabel(bioQ.data.gender)} />
                                <DataItem label="Tanggal Lahir" value={bioQ.data.birth_date ? `${tglLong(bioQ.data.birth_date)}${usia(bioQ.data.birth_date) != null ? ` · ${usia(bioQ.data.birth_date)} th` : ""}` : "-"} />
                                <DataItem label="Ukuran Baju" value={bioQ.data.shirt_size} />
                                <DataItem label="Kelas Asal" value={bioQ.data.school_grade} />
                                <DataItem label="Asal Sekolah" value={bioQ.data.school_origin} />
                                <DataItem label="Program" value={bioQ.data.program?.name} />
                                <DataItem label="Alamat" value={bioQ.data.address} />
                                <DataItem label="Tipe Pendaftaran" value={<span className="capitalize">{bioQ.data.registration_type}</span>} />
                                <DataItem label="Izin Foto/Video" value={bioQ.data.photo_permission ? "Diizinkan" : "Tidak diizinkan"} />
                                <DataItem
                                    label="Orang Tua"
                                    value={
                                        bioQ.data.parent?.name
                                            ? `${bioQ.data.parent.greeting ? `${bioQ.data.parent.greeting} ` : ""}${bioQ.data.parent.name}`
                                            : "-"
                                    }
                                />
                                <DataItem label="No. WhatsApp" value={bioQ.data.parent?.phone} />
                                <DataItem label="No. Alternatif" value={bioQ.data.parent?.phone_alt} />
                                <DataItem label="Terdaftar Sejak" value={tglLong(bioQ.data.created_at)} />
                            </dl>
                            {bioQ.data.allergy_notes && (
                                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                                    <span className="font-medium">Catatan alergi: </span>{bioQ.data.allergy_notes}
                                </div>
                            )}

                            <StudentBiodataModal
                                open={editOpen}
                                onOpenChange={setEditOpen}
                                student={{
                                    ...bioQ.data,
                                    program_id: bioQ.data.program_id ?? bioQ.data.program?.id ?? null,
                                }}
                                endpoint={`/sekolah/murid/${id}`}
                                onSuccess={() => {
                                    bioQ.refetch();
                                    progQ.refetch();
                                }}
                            />
                        </Card>
                    )}

                    {/* KPI */}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <MiniKpi icon={<ClipboardList className="h-5 w-5" />} label="Total Sesi" value={total} tint="bg-slate-100 text-slate-700" />
                        <MiniKpi icon={<CalendarCheck className="h-5 w-5" />} label="Persentase Hadir" value={`${persen}%`} tint="bg-emerald-100 text-emerald-700" />
                        <MiniKpi icon={<GraduationCap className="h-5 w-5" />} label="Jumlah Rapor" value={rapotQ.data?.length ?? 0} tint="bg-blue-100 text-blue-700" />
                        <MiniKpi icon={<Wallet className="h-5 w-5" />} label="Tagihan Belum Lunas" value={belumLunas} tint="bg-amber-100 text-amber-700" />
                    </div>

                    <div className="grid gap-6 lg:grid-cols-3">
                        {/* Kehadiran donut */}
                        <Card className="border-2 p-5">
                            <h3 className="mb-3 text-sm font-semibold">Rekap Kehadiran</h3>
                            {pie.length ? (
                                <>
                                    <div className="h-44">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={pie} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={3}>
                                                    {pie.map((d) => <Cell key={d.key} fill={PIE[d.key as keyof typeof PIE]} />)}
                                                </Pie>
                                                <Tooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="mt-2 space-y-1">
                                        {pie.map((d) => (
                                            <div key={d.key} className="flex items-center justify-between text-sm">
                                                <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: PIE[d.key as keyof typeof PIE] }} /> {d.name}</span>
                                                <span className="font-medium">{d.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : <p className="py-10 text-center text-sm text-muted-foreground">Belum ada data.</p>}
                        </Card>

                        {/* Riwayat sesi */}
                        <Card className="border-2 p-5 lg:col-span-2">
                            <h3 className="mb-3 text-sm font-semibold">Riwayat Sesi Terbaru</h3>
                            {p.attendances.length ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                                                <th className="py-2 pr-3 font-medium">Tanggal</th>
                                                <th className="py-2 pr-3 font-medium">Status</th>
                                                <th className="py-2 pr-3 font-medium">Nilai</th>
                                                <th className="py-2 font-medium">Trainer</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {p.attendances.slice(0, 12).map((a) => (
                                                <tr key={a.id} className="border-b last:border-0">
                                                    <td className="py-2 pr-3">{tgl(a.attended_at)}</td>
                                                    <td className="py-2 pr-3"><Badge variant="outline" className={ATT_CLS[a.status] ?? ""}>{ATT[a.status] ?? a.status}</Badge></td>
                                                    <td className="py-2 pr-3">
                                                        {a.score ? <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ${GRADE_CLS[a.score] ?? "bg-slate-400"}`}>{a.score}</span> : <span className="text-muted-foreground">-</span>}
                                                    </td>
                                                    <td className="py-2 text-muted-foreground">{a.trainer_name ?? "-"}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : <p className="py-10 text-center text-sm text-muted-foreground">Belum ada sesi.</p>}
                        </Card>
                    </div>

                    {/* Rekap Nilai E-Rapot */}
                    <Card className="border-2 p-5">
                        <h3 className="mb-3 text-sm font-semibold">Rekap Nilai E-Rapot</h3>
                        {rapotQ.isLoading ? (
                            <Skeleton className="h-40 rounded-lg" />
                        ) : rapotQ.data?.length ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                                            <th className="py-2 pr-4 font-medium">Aspek</th>
                                            {rapotQ.data.map((r) => (
                                                <th key={r.id} className="px-3 py-2 text-center font-medium">
                                                    <div>S{r.semester} · {r.year}</div>
                                                    <PdfButton id={r.id} />
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ASPEK.map((asp, i) => (
                                            <tr key={String(asp.key)} className="border-b last:border-0">
                                                <td className="py-2 pr-4">
                                                    {i === 0 || ASPEK[i - 1].group !== asp.group ? <div className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">{asp.group}</div> : null}
                                                    {asp.label}
                                                </td>
                                                {rapotQ.data!.map((r) => {
                                                    const g = String(r[asp.key] ?? "-");
                                                    return <td key={r.id} className="px-3 py-2 text-center"><span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ${GRADE_CLS[g] ?? "bg-slate-400"}`}>{g}</span></td>;
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : <p className="py-8 text-center text-sm text-muted-foreground">Belum ada E-Rapot.</p>}
                    </Card>

                    {/* Rekap Tagihan */}
                    <Card className="border-2 p-5">
                        <h3 className="mb-3 text-sm font-semibold">Rekap Tagihan</h3>
                        {invQ.isLoading ? (
                            <Skeleton className="h-32 rounded-lg" />
                        ) : invoices.length ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                                            <th className="py-2 pr-3 font-medium">Invoice</th>
                                            <th className="py-2 pr-3 font-medium">Jatuh Tempo</th>
                                            <th className="py-2 pr-3 font-medium">Total</th>
                                            <th className="py-2 font-medium">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {invoices.map((inv) => (
                                            <tr key={inv.id} className="border-b last:border-0">
                                                <td className="py-2 pr-3 font-medium">{inv.invoice_number ?? `#${inv.id}`}</td>
                                                <td className="py-2 pr-3 text-muted-foreground">{tgl(inv.due_date)}</td>
                                                <td className="py-2 pr-3">{rp(inv.total_amount)}</td>
                                                <td className="py-2"><Badge variant="outline" className={inv.status === "lunas" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : inv.status === "menunggu_verifikasi" ? "border-blue-200 bg-blue-50 text-blue-700" : "border-amber-200 bg-amber-50 text-amber-700"}>{inv.status.replace(/_/g, " ")}</Badge></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : <p className="py-8 text-center text-sm text-muted-foreground">Belum ada tagihan.</p>}
                    </Card>
                </div>
            )}
        </SchoolShell>
    );
}

function DataItem({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 text-sm font-medium">{value || <span className="text-muted-foreground">-</span>}</dd>
        </div>
    );
}

function PdfButton({ id }: { id: number }) {
    const [busy, setBusy] = useState(false);
    const dl = async () => {
        setBusy(true);
        try {
            const res = await api.get(`/sekolah/e-rapot/${id}/pdf`, { responseType: "blob" });
            const url = URL.createObjectURL(res.data as Blob);
            const a = document.createElement("a"); a.href = url; a.download = `e-rapot-${id}.pdf`; a.click(); URL.revokeObjectURL(url);
        } finally { setBusy(false); }
    };
    return (
        <button onClick={dl} disabled={busy} className="mx-auto mt-1 flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-primary hover:bg-primary/10">
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />} PDF
        </button>
    );
}

function MiniKpi({ icon, label, value, tint }: { icon: React.ReactNode; label: string; value: React.ReactNode; tint: string }) {
    return (
        <Card className="border-2 p-4">
            <div className="flex items-center gap-3">
                <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${tint}`}>{icon}</span>
                <div><div className="text-xl font-bold leading-none">{value}</div><div className="mt-1 text-xs text-muted-foreground">{label}</div></div>
            </div>
        </Card>
    );
}