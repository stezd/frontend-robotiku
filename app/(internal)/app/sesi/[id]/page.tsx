"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Camera, X, Loader2, StopCircle, CheckCircle2, MapPin, RefreshCw, ChevronDown, AlertTriangle, Users, CalendarDays } from "lucide-react";
import { api, apiError, type ApiEnvelope } from "@/lib/api";
import { InternalShell } from "@/components/internal/InternalShell";
import { AuthImage } from "@/components/ui/auth-image";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const MapPreview = dynamic(() => import("@/components/ui/map-preview"), { ssr: false });

type StatusV = "hadir" | "izin" | "sakit" | "tanpa_keterangan";
type Row = { id: number; name: string; student_code: string; status: StatusV | null; score: string | null; report: string | null; photo: string | null };
type Resp = { session: { id: number; status: "started" | "ended"; is_manual: boolean; class_id: number }; students: Row[] };

const STATUS: { v: StatusV; label: string; cls: string; active: string; dot: string }[] = [
    { v: "hadir", label: "Hadir", cls: "border-emerald-200 text-emerald-700", active: "border-emerald-600 bg-emerald-600 text-white", dot: "bg-emerald-500" },
    { v: "izin", label: "Izin", cls: "border-blue-200 text-blue-700", active: "border-blue-600 bg-blue-600 text-white", dot: "bg-blue-500" },
    { v: "sakit", label: "Sakit", cls: "border-amber-200 text-amber-700", active: "border-amber-500 bg-amber-500 text-white", dot: "bg-amber-500" },
    { v: "tanpa_keterangan", label: "Alpa", cls: "border-red-200 text-red-700", active: "border-red-600 bg-red-600 text-white", dot: "bg-red-500" },
];
const SCORES = ["A", "B", "C", "D", "E"];
const meta = (s: StatusV) => STATUS.find((x) => x.v === s)!;
const initials = (n: string) => n.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

export default function SesiDetail() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [endOpen, setEndOpen] = useState(false);

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ["sesi", id],
        retry: false,
        queryFn: async () => (await api.get<ApiEnvelope<Resp>>(`/sesi/${id}/murid`)).data.data,
    });

    const isManual = !!data?.session.is_manual;
    const finished = data?.session.status === "ended";
    const locked = finished && !isManual; // sesi manual selalu bisa diedit
    const backHref = data ? `/app/sesi/kelas/${data.session.class_id}` : "/app/sesi";

    const marked = data?.students.filter((s) => s.status).length ?? 0;
    const total = data?.students.length ?? 0;
    const pct = total ? Math.round((marked / total) * 100) : 0;

    const manualEnd = useMutation({
        mutationFn: async () => api.post(`/sesi/${id}/selesai`, {}),
        onSuccess: () => refetch(),
    });

    return (
        <InternalShell>
            <div className="mx-auto max-w-4xl pb-8">
                <Link href={backHref} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Kembali ke daftar sesi</Link>

                <Card className="sticky top-16 z-10 mb-4 overflow-hidden border-2 md:top-4">
                    <div className="flex items-center justify-between gap-3 p-4">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h1 className="text-lg font-semibold">Absensi Sesi</h1>
                                {isManual && <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700"><CalendarDays className="mr-1 h-3 w-3" /> Manual</Badge>}
                            </div>
                            <p className="flex items-center gap-1 text-sm text-muted-foreground"><Users className="h-3.5 w-3.5" /> {marked}/{total} murid ditandai</p>
                        </div>
                        {finished ? (
                            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700"><CheckCircle2 className="mr-1 h-3 w-3" /> Selesai</Badge>
                        ) : isManual ? (
                            <Button size="sm" variant="outline" disabled={manualEnd.isPending} onClick={() => manualEnd.mutate()}>
                                {manualEnd.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-4 w-4" />} Tandai Selesai
                            </Button>
                        ) : (
                            <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => setEndOpen(true)}><StopCircle className="mr-1.5 h-4 w-4" /> Selesai</Button>
                        )}
                    </div>
                    <div className="h-2 bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} /></div>
                </Card>

                {error ? (
                    <Card className="flex flex-col items-center gap-2 border-2 p-8 text-center">
                        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-600"><AlertTriangle className="h-5 w-5" /></span>
                        <p className="text-sm font-medium text-red-600">Gagal memuat sesi</p>
                        <p className="text-xs text-muted-foreground">{apiError(error, "Terjadi kesalahan.")}</p>
                        <Button size="sm" variant="outline" className="mt-1" onClick={() => refetch()}><RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Coba lagi</Button>
                    </Card>
                ) : isLoading || !data ? (
                    <div className="grid gap-3 md:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>
                ) : data.students.length ? (
                    <div className="grid gap-3 md:grid-cols-2">
                        {data.students.map((r) => <StudentCard key={r.id} sessionId={id} row={r} locked={locked} onSaved={refetch} />)}
                    </div>
                ) : (
                    <Card className="border-2 p-10 text-center text-sm text-muted-foreground">Tidak ada murid aktif di kelas ini.</Card>
                )}
            </div>

            <EndDialog open={endOpen} sessionId={id} classId={data?.session.class_id} onClose={() => setEndOpen(false)} />
        </InternalShell>
    );
}

function StudentCard({ sessionId, row, locked, onSaved }: { sessionId: string; row: Row; locked: boolean; onSaved: () => void }) {
    const [status, setStatus] = useState<StatusV | null>(row.status);
    const [score, setScore] = useState<string | null>(row.score);
    const [report, setReport] = useState(row.report ?? "");
    const [photo, setPhoto] = useState<File | null>(null);
    const [photoSaved, setPhotoSaved] = useState(false);
    const [open, setOpen] = useState(false);

    const preview = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);
    useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

    const pickPhoto = (f: File | null) => { setPhoto(f); setPhotoSaved(false); };

    const save = useMutation({
        mutationFn: async () => {
            const fd = new FormData();
            fd.append("student_id", String(row.id)); fd.append("status", status!);
            if (score) fd.append("score", score);
            if (report) fd.append("report", report);
            if (photo) fd.append("photo", photo);
            return api.post(`/sesi/${sessionId}/absensi`, fd);
        },
        onSuccess: () => { setPhotoSaved(true); onSaved(); },
    });

    const dirty = status !== row.status || score !== row.score || report !== (row.report ?? "") || (!!photo && !photoSaved);

    return (
        <Card className="overflow-hidden border-2">
            <div className={`h-1 ${row.status ? meta(row.status).dot : "bg-transparent"}`} />
            <div className="p-4">
                <div className="mb-3 flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{initials(row.name)}</span>
                    <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{row.name}</div>
                        <div className="font-mono text-xs text-muted-foreground">{row.student_code}</div>
                    </div>
                    {row.status && <Badge variant="outline" className={meta(row.status).cls}>{meta(row.status).label}</Badge>}
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                    {STATUS.map((s) => (
                        <button key={s.v} disabled={locked} onClick={() => setStatus(s.v)}
                            className={`rounded-md border px-2 py-2 text-xs font-semibold transition disabled:opacity-60 ${status === s.v ? s.active : `bg-white ${s.cls} hover:bg-muted/40`}`}>
                            {s.label}
                        </button>
                    ))}
                </div>

                <button disabled={locked} onClick={() => setOpen((o) => !o)} className="mt-2 flex items-center gap-1 text-xs font-medium text-primary disabled:opacity-60">
                    <ChevronDown className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`} /> Foto, Nilai & Laporan
                </button>

                {open && (
                    <div className="mt-2 space-y-2.5 border-t pt-2.5">
                        {status === "hadir" && (
                            <div>
                                <div className="mb-1 text-xs text-muted-foreground">Nilai</div>
                                <div className="flex gap-1.5">
                                    {SCORES.map((sc) => (
                                        <button key={sc} disabled={locked} onClick={() => setScore(score === sc ? null : sc)}
                                            className={`h-8 w-8 rounded-md border text-sm font-bold transition ${score === sc ? "border-primary bg-primary text-white" : "bg-white hover:bg-muted/40"}`}>{sc}</button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {preview ? (
                            <div className="relative overflow-hidden rounded-md border">
                                <img src={preview} alt="foto anak" className="aspect-video w-full object-cover" />
                                <button onClick={() => setPhoto(null)} className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"><X className="h-3.5 w-3.5" /></button>
                            </div>
                        ) : row.photo ? (
                            <div className="relative overflow-hidden rounded-md border">
                                <AuthImage path={row.photo} alt="foto anak" className="aspect-video w-full object-cover" />
                                {!locked && (
                                    <label className="absolute right-2 top-2 flex h-7 cursor-pointer items-center gap-1 rounded-full bg-black/60 px-2 text-xs text-white">
                                        <Camera className="h-3.5 w-3.5" /> Ganti
                                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => pickPhoto(e.target.files?.[0] ?? null)} />
                                    </label>
                                )}
                            </div>
                        ) : (
                            <label className={`flex items-center justify-center gap-2 rounded-md border-2 border-dashed py-3 text-xs text-muted-foreground transition ${locked ? "opacity-60" : "cursor-pointer hover:border-primary/50 hover:bg-muted/40"}`}>
                                <Camera className="h-4 w-4" /> Foto anak
                                <input type="file" accept="image/*" capture="environment" className="hidden" disabled={locked} onChange={(e) => pickPhoto(e.target.files?.[0] ?? null)} />
                            </label>
                        )}

                        <textarea disabled={locked} value={report} onChange={(e) => setReport(e.target.value)} rows={2} placeholder="Laporan / keterangan tertulis…"
                            className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary disabled:opacity-60" />
                    </div>
                )}

                {!locked && (
                    <Button size="sm" className="mt-3 w-full" disabled={!status || !dirty || save.isPending} onClick={() => save.mutate()}>
                        {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />} Simpan
                    </Button>
                )}
            </div>
        </Card>
    );
}

function EndDialog({ open, sessionId, classId, onClose }: { open: boolean; sessionId: string; classId?: number; onClose: () => void }) {
    const router = useRouter();
    const qc = useQueryClient();
    const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [locating, setLocating] = useState(false);
    const [photo, setPhoto] = useState<File | null>(null);
    const [msg, setMsg] = useState<string | null>(null);
    const preview = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);
    useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

    const getLoc = () => {
        setMsg(null); setLocating(true);
        navigator.geolocation.getCurrentPosition(
            (p) => { setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }); setLocating(false); },
            () => { setMsg("Gagal mengambil lokasi."); setLocating(false); }, { enableHighAccuracy: true, timeout: 10000 });
    };
    useEffect(() => { if (open) { setCoords(null); setPhoto(null); setMsg(null); getLoc(); } }, [open]);

    const end = useMutation({
        mutationFn: async () => {
            const fd = new FormData();
            fd.append("latitude", String(coords!.lat)); fd.append("longitude", String(coords!.lng)); fd.append("photo", photo!);
            return api.post(`/sesi/${sessionId}/selesai`, fd);
        },
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["kelas-sesi"] }); onClose(); router.push(classId ? `/app/sesi/kelas/${classId}` : "/app/sesi"); },
        onError: (e) => setMsg(apiError(e, "Gagal menyelesaikan sesi.")),
    });

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md">
                <DialogHeader><DialogTitle>Selesai Sesi</DialogTitle></DialogHeader>
                <div className="space-y-4">
                    <div>
                        <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium"><MapPin className="h-4 w-4" /> Lokasi selesai</span>
                        {locating ? <div className="flex h-[150px] items-center justify-center rounded-lg border bg-muted/30 text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mengambil lokasi…</div>
                            : coords ? <><MapPreview lat={coords.lat} lng={coords.lng} /><div className="mt-1.5 flex items-center justify-between"><span className="font-mono text-xs text-muted-foreground">{coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}</span><button onClick={getLoc} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"><RefreshCw className="h-3 w-3" /> Perbarui</button></div></>
                                : <div className="rounded-lg border border-dashed p-4 text-center"><Button size="sm" variant="outline" onClick={getLoc}>Ambil Lokasi</Button></div>}
                    </div>
                    <div>
                        <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium"><Camera className="h-4 w-4" /> Foto</span>
                        {preview ? <div className="relative overflow-hidden rounded-lg border"><img src={preview} alt="foto" className="aspect-[4/3] w-full object-cover" /><button onClick={() => setPhoto(null)} className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white"><X className="h-4 w-4" /></button></div>
                            : <label className="flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border-2 border-dashed py-7 text-sm text-muted-foreground hover:bg-muted/40"><Camera className="h-6 w-6" /> Ambil foto<input type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} /></label>}
                    </div>
                    {msg && <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{msg}</p>}
                    <Button className="w-full" disabled={!coords || !photo || end.isPending} onClick={() => { setMsg(null); end.mutate(); }}>
                        {end.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <StopCircle className="mr-2 h-4 w-4" />} Selesai & Kirim Notifikasi
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}