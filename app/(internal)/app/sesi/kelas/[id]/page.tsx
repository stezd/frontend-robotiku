"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, PlayCircle, CalendarPlus, MapPin, Camera, Loader2, RefreshCw, X, CheckCircle2, Clock, ChevronRight, CalendarDays } from "lucide-react";
import { api, apiError, type ApiEnvelope } from "@/lib/api";
import { InternalShell } from "@/components/internal/InternalShell";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Link from "next/link";

const MapPreview = dynamic(() => import("@/components/ui/map-preview"), { ssr: false });

type SessionRow = { id: number; week: number; status: string; is_manual: boolean; started_at: string; ended_at: string | null; hadir: number };
type ClassSessions = { class: { id: number; name: string; program: string | null; school: string | null; active_count: number }; sessions: SessionRow[] };
const tgl = (s: string) => new Date(s).toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

export default function KelasSesiPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [liveOpen, setLiveOpen] = useState(false);
    const [manualOpen, setManualOpen] = useState(false);

    const { data, isLoading } = useQuery({
        queryKey: ["kelas-sesi", id],
        queryFn: async () => (await api.get<ApiEnvelope<ClassSessions>>(`/sesi/kelas/${id}/list`)).data.data,
    });

    return (
        <InternalShell>
            <Link href="/app/sesi" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Kembali</Link>
            <PageHeader title={data?.class.name ?? "Sesi Kelas"} subtitle={data ? `${data.class.school ?? "Mandiri"} · ${data.class.program ?? "—"} · ${data.class.active_count} murid` : "Memuat…"} />

            <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={() => setLiveOpen(true)}><PlayCircle className="mr-1.5 h-4 w-4" /> Sesi Langsung</Button>
                <Button variant="outline" onClick={() => setManualOpen(true)}><CalendarPlus className="mr-1.5 h-4 w-4" /> Sesi Manual (Susulan)</Button>
            </div>

            <div className="mt-5 space-y-2.5">
                {isLoading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
                    : data?.sessions.length ? data.sessions.map((s) => {
                        const ended = s.status === "ended";
                        return (
                            <Card key={s.id} className="flex cursor-pointer items-center gap-3 border-2 p-4 transition hover:border-primary/40" onClick={() => router.push(`/app/sesi/${s.id}`)}>
                                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${s.is_manual ? "bg-amber-100 text-amber-700" : "bg-primary/10 text-primary"}`}>
                                    {s.is_manual ? <CalendarDays className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-medium">{tgl(s.started_at)}</span>
                                        <Badge variant="outline" className={s.is_manual ? "border-amber-200 bg-amber-50 text-amber-700" : "border-slate-200 bg-slate-50 text-slate-600"}>{s.is_manual ? "Manual" : "Langsung"}</Badge>
                                        <Badge variant="outline" className={ended ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-blue-200 bg-blue-50 text-blue-700"}>{ended ? "Selesai" : "Berlangsung"}</Badge>
                                    </div>
                                    <div className="mt-0.5 text-xs text-muted-foreground">Pekan {s.week} · {s.hadir} hadir</div>
                                </div>
                                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                            </Card>
                        );
                    }) : <Card className="p-10 text-center text-sm text-muted-foreground">Belum ada sesi. Buat sesi dulu untuk mulai absensi.</Card>}
            </div>

            {liveOpen && <LiveDialog classId={Number(id)} onClose={() => setLiveOpen(false)} onCreated={(sid) => router.push(`/app/sesi/${sid}`)} />}
            {manualOpen && <ManualDialog classId={Number(id)} onClose={() => setManualOpen(false)} onCreated={(sid) => router.push(`/app/sesi/${sid}`)} />}
        </InternalShell>
    );
}

/* --- Sesi Langsung: GPS + swafoto --- */
function LiveDialog({ classId, onClose, onCreated }: { classId: number; onClose: () => void; onCreated: (id: number) => void }) {
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
            () => { setMsg("Gagal mengambil lokasi. Izinkan akses GPS."); setLocating(false); }, { enableHighAccuracy: true, timeout: 10000 });
    };
    useEffect(() => { getLoc(); }, []);

    const start = useMutation({
        mutationFn: async () => {
            const fd = new FormData();
            fd.append("class_id", String(classId));
            fd.append("latitude", String(coords!.lat));
            fd.append("longitude", String(coords!.lng));
            fd.append("photo", photo!);
            return (await api.post<ApiEnvelope<{ id: number }>>("/sesi/mulai", fd)).data;
        },
        onSuccess: (res) => onCreated(res.data.id),
        onError: (e) => setMsg(apiError(e, "Gagal memulai sesi.")),
    });

    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md">
                <DialogHeader><DialogTitle>Sesi Langsung</DialogTitle></DialogHeader>
                <div className="space-y-4">
                    <div>
                        <div className="mb-1.5 flex items-center justify-between"><span className="flex items-center gap-1.5 text-sm font-medium"><MapPin className="h-4 w-4" /> Lokasi</span>{coords && <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700"><CheckCircle2 className="mr-1 h-3 w-3" /> Terkunci</Badge>}</div>
                        {locating ? <div className="flex h-[150px] items-center justify-center rounded-lg border bg-muted/30 text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mengambil lokasi…</div>
                            : coords ? <><MapPreview lat={coords.lat} lng={coords.lng} /><button onClick={getLoc} className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"><RefreshCw className="h-3 w-3" /> Perbarui</button></>
                                : <div className="rounded-lg border border-dashed p-4 text-center"><Button size="sm" variant="outline" onClick={getLoc}>Ambil Lokasi</Button></div>}
                    </div>
                    <div>
                        <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium"><Camera className="h-4 w-4" /> Foto Selfie</span>
                        {preview ? <div className="relative overflow-hidden rounded-lg border"><img src={preview} alt="selfie" className="aspect-[4/3] w-full object-cover" /><button onClick={() => setPhoto(null)} className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white"><X className="h-4 w-4" /></button></div>
                            : <label className="flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border-2 border-dashed py-8 text-sm text-muted-foreground hover:border-primary/50"><Camera className="h-6 w-6" /><span>Ambil foto</span><input type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} /></label>}
                    </div>
                    {msg && <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{msg}</p>}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Batal</Button>
                    <Button disabled={!coords || !photo || start.isPending} onClick={() => { setMsg(null); start.mutate(); }}>
                        {start.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />} Mulai & Absen
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/* --- Sesi Manual/Susulan: pilih tanggal --- */
function ManualDialog({ classId, onClose, onCreated }: { classId: number; onClose: () => void; onCreated: (id: number) => void }) {
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [msg, setMsg] = useState<string | null>(null);
    const create = useMutation({
        mutationFn: async () => (await api.post<ApiEnvelope<{ id: number }>>("/sesi/manual", { class_id: classId, date })).data,
        onSuccess: (res) => onCreated(res.data.id),
        onError: (e) => setMsg(apiError(e, "Gagal membuat sesi.")),
    });
    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader><DialogTitle>Sesi Manual (Susulan)</DialogTitle></DialogHeader>
                <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">Untuk kelas yang sudah lewat. Cukup pilih tanggal — tanpa GPS/foto.</p>
                    <div className="space-y-1.5">
                        <Label>Tanggal sesi</Label>
                        <Input type="date" max={new Date().toISOString().slice(0, 10)} value={date} onChange={(e) => setDate(e.target.value)} />
                    </div>
                    {msg && <p className="text-sm text-red-600">{msg}</p>}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Batal</Button>
                    <Button disabled={!date || create.isPending} onClick={() => { setMsg(null); create.mutate(); }}>
                        {create.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarPlus className="mr-2 h-4 w-4" />} Buat & Absen
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}