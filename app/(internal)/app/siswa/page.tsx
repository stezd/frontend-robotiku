"use client";

import { useState } from "react";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { Search, Eye, ChevronLeft, ChevronRight, Loader2, Info, Plus, Download, FileText, Pencil } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api, apiError, type ApiEnvelope } from "@/lib/api";
import { InternalShell } from "@/components/internal/InternalShell";
import { PageHeader } from "@/components/ui/page-header";
import { DrawerHeader } from "@/components/ui/drawer-header";
import { StudentBiodataModal } from "@/components/student/StudentBiodataModal";
import { useAuth } from "@/lib/auth-store";
import { cn } from "@/lib/utils";

type Parent = { id: number; name: string; phone: string; greeting?: string | null; phone_alt?: string | null } | null;
type School = { id: number; name: string } | null;
type Kelas = { id: number; name: string };
type Log = { id: number; old_status: string | null; new_status: string; note: string | null; changed_by_type: string; changed_by: number | null; created_at: string };
type Student = {
    id: number; student_code: string; name: string; gender: "L" | "P"; status: string;
    registration_type: "mandiri" | "instansi"; school_grade: string | null; school_origin: string | null;
    birth_date: string | null; shirt_size: string | null; address?: string | null; allergy_notes: string | null;
    photo_permission: boolean; is_verified: boolean; created_at: string;
    parent: Parent; school: School; program?: { id: number; name: string } | null;
    classes?: Kelas[]; statusLogs?: Log[];
};

type Paginator = { data: Student[]; current_page: number; last_page: number; total: number };

const statusCls: Record<string, string> = {
    aktif: "bg-emerald-50 text-emerald-700 border-emerald-200",
    cuti: "bg-amber-50 text-amber-700 border-amber-200",
    nonaktif: "bg-slate-100 text-slate-600 border-slate-200",
    lulus: "bg-blue-50 text-blue-700 border-blue-200",
    berhenti: "bg-rose-50 text-rose-700 border-rose-200",
};

const genderLabel = (g?: string) => (g === "L" ? "Laki-laki" : g === "P" ? "Perempuan" : "—");
const tglLong = (s?: string | null) => (s ? new Date(s).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }) : "—");
const usia = (s?: string | null) => { if (!s) return null; const b = new Date(s), n = new Date(); let a = n.getFullYear() - b.getFullYear(); const m = n.getMonth() - b.getMonth(); if (m < 0 || (m === 0 && n.getDate() < b.getDate())) a--; return a; };
const filters = ["semua", "aktif", "cuti", "nonaktif", "lulus"];

function SiswaInner() {
    const qc = useQueryClient();
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("semua");
    const [tipe, setTipe] = useState("semua");
    const [verifikasi, setVerifikasi] = useState("verified");
    const [page, setPage] = useState(1);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const reset = () => setPage(1);
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const sid = searchParams.get("student");
        setSelectedId(sid ? Number(sid) : null);
    }, [searchParams]);

    const list = useQuery({
        queryKey: ["siswa", { search, status, tipe, verifikasi, page }],
        queryFn: async () =>
            (await api.get("/siswa", {
                params: {
                    search: search || undefined,
                    status: status === "semua" ? undefined : status,
                    registration_type: tipe === "semua" ? undefined : tipe,
                    verification_status: verifikasi === "semua" ? "all" : verifikasi,
                    page,
                },
            })).data.data as Paginator,
        placeholderData: keepPreviousData,
    });

    const detail = useQuery({
        queryKey: ["siswa-detail", selectedId],
        enabled: !!selectedId,
        queryFn: async () => (await api.get<ApiEnvelope<Student>>(`/siswa/${selectedId}`)).data.data,
    });

    const exportFile = useMutation({
        mutationFn: async (type: "excel" | "pdf") => {
            const res = await api.get(`/siswa/export/${type}`, {
                params: {
                    search: search || undefined,
                    status: status === "semua" ? undefined : status,
                    registration_type: tipe === "semua" ? undefined : tipe,
                    verification_status: verifikasi === "semua" ? "all" : verifikasi,
                },
                responseType: "blob",
            });
            const url = URL.createObjectURL(res.data as Blob);
            const a = document.createElement("a"); a.href = url; a.download = type === "excel" ? "data-siswa.xlsx" : "data-siswa.pdf"; a.click(); URL.revokeObjectURL(url);
        },
    });

    const p = list.data;
    const rows = p?.data ?? [];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Data Siswa"
                subtitle="Kelola data siswa, status, dan riwayat perubahan."
                action={
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" disabled={exportFile.isPending} onClick={() => exportFile.mutate("excel")}><Download className="mr-2 h-4 w-4" /> Excel</Button>
                        <Button variant="outline" disabled={exportFile.isPending} onClick={() => exportFile.mutate("pdf")}><FileText className="mr-2 h-4 w-4" /> PDF</Button>
                        <Button asChild><Link href="/daftar"><Plus className="mr-2 h-4 w-4" /> Siswa Baru</Link></Button>
                    </div>
                }
            />

            <Card className="overflow-hidden">
                <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="relative w-full lg:w-80">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            className="pl-9"
                            placeholder="Cari nama atau kode siswa…"
                            aria-label="Cari nama atau kode siswa"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); reset(); }}
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {filters.map((f) => (
                            <Button key={f} size="sm" variant={status === f ? "default" : "outline"} className="capitalize" onClick={() => { setStatus(f); reset(); }}>{f}</Button>
                        ))}
                        <Select value={verifikasi} onValueChange={(v) => { setVerifikasi(v ?? "verified"); reset(); }}>
                            <SelectTrigger className="h-8 w-[155px]" aria-label="Filter status verifikasi"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="verified">Terverifikasi</SelectItem>
                                <SelectItem value="unverified">Belum Verifikasi</SelectItem>
                                <SelectItem value="semua">Semua Verifikasi</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={tipe} onValueChange={(v) => { setTipe(v ?? "semua"); reset(); }}>
                            <SelectTrigger className="h-8 w-[130px]" aria-label="Filter tipe pendaftaran"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="semua">Semua tipe</SelectItem>
                                <SelectItem value="mandiri">Mandiri</SelectItem>
                                <SelectItem value="instansi">Instansi</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Siswa</TableHead>
                            <TableHead>Tipe</TableHead>
                            <TableHead>Sekolah / Asal</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {list.isLoading && Array.from({ length: 6 }).map((_, i) => (
                            <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-9 w-full" /></TableCell></TableRow>
                        ))}
                        {rows.map((s) => (
                            <TableRow key={s.id} className="cursor-pointer" onClick={() => setSelectedId(s.id)}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-9 w-9"><AvatarFallback>{s.name[0]}</AvatarFallback></Avatar>
                                        <div><p className="font-medium leading-none">{s.name}</p><p className="mt-1 text-xs text-muted-foreground">{s.student_code}</p></div>
                                    </div>
                                </TableCell>
                                <TableCell><Badge variant="secondary" className="capitalize">{s.registration_type}</Badge></TableCell>
                                <TableCell className="text-sm text-muted-foreground">{s.school?.name ?? s.school_origin ?? "—"}</TableCell>
                                <TableCell><Badge variant="outline" className={cn("capitalize", statusCls[s.status])}>{s.status}</Badge></TableCell>
                                <TableCell className="text-right">
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        aria-label={`Lihat detail ${s.name}`}
                                        onClick={(e) => { e.stopPropagation(); setSelectedId(s.id); }}
                                    >
                                        <Eye className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {!list.isLoading && rows.length === 0 && (
                            <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">Tidak ada siswa.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>

                {p && (
                    <div className="flex items-center justify-between border-t p-4 text-sm text-muted-foreground">
                        <span>Total {p.total} · Halaman {p.current_page}/{p.last_page}</span>
                        <div className="flex gap-1">
                            <Button
                                size="icon"
                                variant="outline"
                                aria-label="Halaman sebelumnya"
                                disabled={p.current_page <= 1}
                                onClick={() => setPage((x) => x - 1)}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                size="icon"
                                variant="outline"
                                aria-label="Halaman berikutnya"
                                disabled={p.current_page >= p.last_page}
                                onClick={() => setPage((x) => x + 1)}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            <Sheet open={!!selectedId} onOpenChange={(o) => { if (!o) { setSelectedId(null); if (searchParams.get("student")) router.replace("/app/siswa"); } }}>
                <SheetContent className="w-full overflow-y-auto p-6 sm:max-w-xl">
                    {detail.isLoading && <div className="grid h-full place-items-center"><Loader2 className="h-6 w-6 animate-spin" /></div>}
                    {detail.data && <Detail key={detail.data.id} student={detail.data} onChanged={() => { detail.refetch(); qc.invalidateQueries({ queryKey: ["siswa"] }); }} />}
                </SheetContent>
            </Sheet>
        </div>
    );
}

function Detail({ student, onChanged }: { student: Student; onChanged: () => void }) {
    const actor = useAuth((s) => s.actor);
    const canEdit = actor?.kind === "user" && ["super_admin", "admin"].includes(actor.role);
    const [editOpen, setEditOpen] = useState(false);
    const [status, setStatus] = useState(student.status);
    const [note, setNote] = useState("");
    const [err, setErr] = useState<string | null>(null);

    const change = useMutation({
        mutationFn: async () => (await api.patch(`/siswa/${student.id}/status`, { status, note: note || undefined })).data,
        onSuccess: () => { setErr(null); setNote(""); onChanged(); },
        onError: (e: any) => setErr(e?.response?.status === 422 ? (e.response.data.message ?? "Status tidak berubah.") : apiError(e)),
    });

    const info: { l: string; v: React.ReactNode }[] = [
        { l: "Jenis kelamin", v: genderLabel(student.gender) },
        { l: "Tanggal lahir", v: student.birth_date ? `${tglLong(student.birth_date)}${usia(student.birth_date) != null ? ` · ${usia(student.birth_date)} th` : ""}` : "—" },
        { l: "Ukuran baju", v: student.shirt_size || "—" },
        { l: "Program", v: student.program?.name ?? "—" },
        { l: "Tipe pendaftaran", v: student.registration_type },
        { l: "Asal sekolah", v: student.school?.name ?? student.school_origin ?? "—" },
        { l: "Kelas asal", v: student.school_grade ?? "—" },
        { l: "Alamat domisili", v: student.address || "—" },
        { l: "Izin foto/video", v: student.photo_permission ? "Diizinkan" : "Tidak diizinkan" },
        { l: "Kelas Robotiku", v: student.classes?.map((c) => c.name).join(", ") || "—" },
        { l: "Terdaftar sejak", v: tglLong(student.created_at) },
        { l: "Orang tua", v: student.parent ? `${student.parent.greeting ? student.parent.greeting + " " : ""}${student.parent.name}` : "—" },
        { l: "No. WhatsApp", v: student.parent?.phone ?? "—" },
        { l: "No. Alternatif", v: student.parent?.phone_alt ?? "—" },
    ];

    return (
        <div>
            <DrawerHeader
                title={student.name}
                subtitle={student.student_code}
                badge={
                    <div className="flex items-center gap-1.5">
                        {!student.is_verified && <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">Belum verifikasi</Badge>}
                        <Badge variant="outline" className={cn("capitalize", statusCls[student.status])}>{student.status}</Badge>
                    </div>
                }
                action={
                    canEdit ? (
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 font-medium"
                            onClick={() => setEditOpen(true)}
                        >
                            <Pencil className="h-3.5 w-3.5" />
                            <span>Edit Biodata</span>
                        </Button>
                    ) : null
                }
            />

            {canEdit && (
                <StudentBiodataModal
                    open={editOpen}
                    onOpenChange={setEditOpen}
                    student={{
                        ...student,
                        program_id: student.program?.id,
                    }}
                    endpoint={`/siswa/${student.id}`}
                    onSuccess={onChanged}
                />
            )}

            <div className="space-y-7">
                <div className="grid grid-cols-2 gap-3">
                    {info.map((i) => (
                        <div key={i.l} className="rounded-lg border bg-muted/30 p-3">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">{i.l}</p>
                            <p className="mt-1 text-sm font-medium capitalize">{i.v}</p>
                        </div>
                    ))}
                </div>

                {student.allergy_notes && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                        <span className="font-medium">Catatan alergi: </span>{student.allergy_notes}
                    </div>
                )}

                <div className="rounded-xl border p-4">
                    <p className="mb-3 text-sm font-semibold">Manajemen Status</p>
                    <div className="flex gap-3">
                        <Select value={status} onValueChange={(v) => setStatus(v ?? student.status)}>
                            <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="aktif">Aktif</SelectItem>
                                <SelectItem value="cuti">Cuti</SelectItem>
                                <SelectItem value="nonaktif">Nonaktif</SelectItem>
                                <SelectItem value="lulus">Lulus</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button disabled={status === student.status || change.isPending} onClick={() => change.mutate()}>
                            {change.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update"}
                        </Button>
                    </div>
                    <Textarea className="mt-3" rows={2} placeholder="Catatan perubahan (opsional)" value={note} onChange={(e) => setNote(e.target.value)} />
                    {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
                    <p className="mt-3 flex items-start gap-1 text-xs text-muted-foreground"><Info className="h-3.5 w-3.5" /> Perubahan tercatat permanen di riwayat (immutable).</p>
                </div>

                <div>
                    <p className="mb-4 text-sm font-semibold">Riwayat Status (Immutable)</p>
                    <div className="relative space-y-5 pl-4 before:absolute before:inset-y-0 before:left-[5px] before:w-px before:bg-border">
                        {student.statusLogs?.map((log) => (
                            <div key={log.id} className="relative">
                                <span className={cn("absolute -left-[14px] top-1 h-3 w-3 rounded-full border-2 border-background",
                                    log.new_status === "aktif" ? "bg-emerald-500" : log.new_status === "cuti" ? "bg-amber-500" : log.new_status === "lulus" ? "bg-blue-500" : "bg-slate-400")} />
                                <p className="text-sm font-medium capitalize">{log.old_status ? `${log.old_status} → ${log.new_status}` : `Pendaftaran (${log.new_status})`}</p>
                                <p className="text-xs text-muted-foreground">Oleh: {log.changed_by_type === "school_admin" ? "Admin Sekolah" : "Staf"} • {log.created_at?.slice(0, 16).replace("T", " ")}</p>
                                {log.note && <p className="mt-2 inline-block rounded-lg bg-muted/40 p-2 text-sm">{log.note}</p>}
                            </div>
                        ))}
                        {(!student.statusLogs || student.statusLogs.length === 0) && <p className="text-sm text-muted-foreground">Belum ada perubahan status.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function Page() {
    return <InternalShell><SiswaInner /></InternalShell>;
}