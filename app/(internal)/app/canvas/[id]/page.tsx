"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    ArrowLeft, FileText, Trash2, Plus, MessageSquarePlus, Percent, Banknote, Loader2, Image as ImageIcon, Upload,
    MapPin, Building2, CalendarClock, ExternalLink, X, AlertCircle, ZoomIn,
} from "lucide-react";
import dynamic from "next/dynamic";
import { api, apiError, type ApiEnvelope } from "@/lib/api";
import { InternalShell } from "@/components/internal/InternalShell";
import { useConfirm } from "@/components/ui/confirm";
import { FileDrop } from "@/components/ui/file-drop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthImage } from "@/components/ui/auth-image";
import { publicMediaUrl as fileUrl, protectedMediaUrl, protectedFileUrl } from "@/lib/media";

const MapPicker = dynamic(() => import("@/components/ui/map-picker"), { ssr: false });

type Note = { id: number; note: string; kind: string; photo: string | null; latitude: number | null; longitude: number | null; created_at: string; creator?: { name: string } };
type Log = { id: number; old_status: string | null; new_status: string; note: string | null; created_at: string };
type School = {
    id: number; name: string; address: string | null; pic_name: string | null; contact: string | null;
    bank_account: string | null; qris_image: string | null; photo: string | null;
    commission_percent: number; registration_fee: number; price_per_cycle: number;
    pipeline_status: string; is_mou: boolean; created_at: string;
    notes?: Note[]; status_logs?: Log[];
    latitude: number | null; longitude: number | null; geofence_radius: number;
};
type Mou = { id: number; file: string; periods: number; note: string | null; self_managed?: boolean; creator?: { name: string } };

// item yang dibuka di lightbox: protected → path (ambil blob ber-token), public → URL langsung
type ViewerItem = { protected: boolean; value: string };

const STATUS: Record<string, string> = { prospek: "Prospek", dalam_proses: "Dalam Proses", sudah_mou: "MoU", tidak_lanjut: "Tidak Lanjut" };
const STATUS_META: Record<string, { label: string; idle: string; active: string; badge: string }> = {
    prospek: { label: "Prospek", idle: "border-slate-200 text-slate-600", active: "border-slate-600 bg-slate-600 text-white", badge: "border-slate-200 bg-slate-50 text-slate-600" },
    dalam_proses: { label: "Dalam Proses", idle: "border-amber-200 text-amber-700", active: "border-amber-500 bg-amber-500 text-white", badge: "border-amber-200 bg-amber-50 text-amber-700" },
    sudah_mou: { label: "MoU", idle: "border-emerald-200 text-emerald-700", active: "border-emerald-600 bg-emerald-600 text-white", badge: "border-emerald-200 bg-emerald-50 text-emerald-700" },
    tidak_lanjut: { label: "Tidak Lanjut", idle: "border-red-200 text-red-600", active: "border-red-600 bg-red-600 text-white", badge: "border-red-200 bg-red-50 text-red-600" },
};
const ALLOWED_IMG = ["image/jpeg", "image/png"];
const rp = (n: number | string) => "Rp " + Number(n).toLocaleString("id-ID");
const tgl = (s: string) => new Date(s).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
const tglJam = (s: string) => new Date(s).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

function MiniMap({ lat, lng, className }: { lat: number; lng: number; className?: string }) {
    return <iframe title="peta" loading="lazy" className={className} src={`https://maps.google.com/maps?q=${lat},${lng}&t=k&z=16&output=embed`} />;
}

/* ------------------------------- LIGHTBOX ------------------------------- */
function Lightbox({ item, onClose }: { item: ViewerItem | null; onClose: () => void }) {
    const blob = useQuery({
        queryKey: ["lightbox", item?.value],
        enabled: !!item?.protected,
        queryFn: () => protectedMediaUrl(item!.value),
    });

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        if (item) window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [item, onClose]);

    if (!item) return null;
    const src = item.protected ? blob.data : item.value;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm" onClick={onClose}>
            <button onClick={onClose} className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20">
                <X className="h-5 w-5" />
            </button>
            {item.protected && !src ? (
                <Loader2 className="h-8 w-8 animate-spin text-white" />
            ) : (
                <img src={src} alt="Foto penuh" className="max-h-[90vh] max-w-[92vw] rounded-lg object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} />
            )}
        </div>
    );
}

export default function CanvasDetailPage() {
    const { id } = useParams<{ id: string }>();
    const qc = useQueryClient();
    const key = ["canvas", id];
    const [viewer, setViewer] = useState<ViewerItem | null>(null);

    const { data: s, isLoading } = useQuery({
        queryKey: key,
        queryFn: async () => (await api.get<ApiEnvelope<School>>(`/canvas/schools/${id}`)).data.data,
    });
    const { data: mous } = useQuery({
        queryKey: ["canvas-mou", id],
        queryFn: async () => (await api.get<ApiEnvelope<Mou[]>>(`/canvas/schools/${id}/mou`)).data.data,
    });

    const invalidate = () => {
        qc.invalidateQueries({ queryKey: key });
        qc.invalidateQueries({ queryKey: ["canvas-mou", id] });
        qc.invalidateQueries({ queryKey: ["canvas"] });
    };

    return (
        <InternalShell>
            <div className="w-full">
                <Link href="/app/canvas" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-4 w-4" /> Kembali ke Canvas
                </Link>

                {isLoading || !s ? (
                    <div className="space-y-6"><Skeleton className="h-40 w-full rounded-xl" /><Skeleton className="h-96 w-full rounded-xl" /></div>
                ) : (
                    <div className="space-y-6">
                        {/* HEADER */}
                        <Card className="overflow-hidden shadow-sm border-slate-200/60">
                            <div className="flex flex-col gap-4 border-b bg-gradient-to-r from-blue-100/60 to-transparent p-5 sm:flex-row sm:items-center sm:p-6">
                                <div className="flex min-w-0 flex-1 items-center gap-4">
                                    <button type="button" onClick={() => s.photo && setViewer({ protected: false, value: fileUrl(s.photo)! })}
                                        className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted text-muted-foreground disabled:cursor-default"
                                        disabled={!s.photo} title={s.photo ? "Lihat foto sekolah" : undefined}>
                                        {fileUrl(s.photo) ? <img src={fileUrl(s.photo)!} alt={s.name} className="h-full w-full cursor-zoom-in object-cover" /> : <Building2 className="h-7 w-7" />}
                                    </button>
                                    <div className="min-w-0">
                                        <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">{s.name}</h1>
                                        <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5 shrink-0" /> {s.address || "Alamat belum diisi"}</p>
                                    </div>
                                </div>
                                <Badge variant="outline" className={`shrink-0 text-sm ${STATUS_META[s.pipeline_status]?.badge}`}>{STATUS[s.pipeline_status]}</Badge>
                            </div>
                            <div className="grid grid-cols-2 divide-x divide-y sm:grid-cols-4 sm:divide-y-0">
                                <Stat label="Komisi Sekolah" value={`${s.commission_percent}%`} />
                                <Stat label="SPP / periode" value={rp(s.price_per_cycle)} />
                                <Stat label="Biaya Daftar" value={rp(s.registration_fee)} />
                                <Stat label="Dokumen MoU" value={String(mous?.length ?? 0)} />
                            </div>
                        </Card>

                        {/* KONTEN */}
                        <div className="grid gap-6 lg:grid-cols-3">
                            {/* Kolom kiri — pengaturan */}
                            <div className="space-y-6 lg:col-span-1">
                                <StatusCard school={s} onDone={invalidate} />
                                <Card className="p-5 shadow-sm border-slate-200/60">
                                    <h3 className="mb-3 text-sm font-semibold">Informasi</h3>
                                    <dl className="space-y-2 text-sm">
                                        <Row label="PIC" value={s.pic_name} />
                                        <Row label="No. WA" value={s.contact} />
                                        <Row label="Rekening" value={s.bank_account} />
                                    </dl>
                                </Card>
                                <CommissionCard school={s} onDone={invalidate} />
                                <HargaCard school={s} onDone={invalidate} />
                                <MediaCard school={s} onDone={invalidate} onView={setViewer} />
                            </div>

                            {/* Kolom kanan — lokasi, MoU, catatan, log */}
                            <div className="space-y-6 lg:col-span-2">
                                <LocationCard school={s} onDone={invalidate} />
                                <MouCard schoolId={s.id} mous={mous ?? []} onDone={invalidate} />
                                <NotesCard school={s} onDone={invalidate} onView={setViewer} />
                                <LogCard logs={s.status_logs ?? []} />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <Lightbox item={viewer} onClose={() => setViewer(null)} />
        </InternalShell>
    );
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className="p-4 sm:p-5">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="mt-1 text-lg font-bold">{value}</div>
        </div>
    );
}

function Row({ label, value }: { label: string; value: string | null }) {
    return <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{label}</dt><dd className="min-w-0 truncate text-right font-medium">{value || "—"}</dd></div>;
}

function LocationCard({ school, onDone }: { school: School; onDone: () => void }) {
    const [lat, setLat] = useState<number | null>(school.latitude ?? null);
    const [lng, setLng] = useState<number | null>(school.longitude ?? null);
    const [radius, setRadius] = useState(String(school.geofence_radius ?? 500));

    const save = useMutation({
        mutationFn: async () => api.put(`/canvas/schools/${school.id}`, {
            name: school.name, latitude: lat, longitude: lng, geofence_radius: Number(radius),
        }),
        onSuccess: onDone,
    });

    return (
        <Card className="p-5 shadow-sm border-slate-200/60">
            <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold"><MapPin className="h-4 w-4" /> Lokasi & Radius (Absensi GPS)</h3>
            <MapPicker lat={lat} lng={lng} radius={Number(radius) || 500} onChange={(la: number, ln: number) => { setLat(la); setLng(ln); }} />
            <div className="mt-3 flex items-end gap-2">
                <div className="flex-1">
                    <Label className="text-xs">Radius (meter)</Label>
                    <Input type="number" min={50} max={5000} value={radius} onChange={(e) => setRadius(e.target.value)} />
                </div>
                <Button disabled={lat == null || lng == null || save.isPending} onClick={() => save.mutate()}>
                    {save.isPending ? "Menyimpan…" : "Simpan Lokasi"}
                </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Trainer harus dalam radius ini saat "Mulai Sesi" untuk kelas instansi sekolah ini.</p>
        </Card>
    );
}

function StatusCard({ school, onDone }: { school: School; onDone: () => void }) {
    const [sel, setSel] = useState(school.pipeline_status);
    const [note, setNote] = useState("");
    const change = useMutation({
        mutationFn: async () => api.patch(`/canvas/schools/${school.id}/status`, { pipeline_status: sel, note: note || undefined }),
        onSuccess: () => { setNote(""); onDone(); },
    });
    return (
        <Card className="p-5 shadow-sm border-slate-200/60">
            <h3 className="mb-3 text-sm font-semibold">Status Pipeline</h3>
            <div className="grid grid-cols-2 gap-2">
                {Object.entries(STATUS_META).map(([k, m]) => (
                    <button key={k} type="button" onClick={() => setSel(k)}
                        className={`rounded-lg border-2 px-3 py-2.5 text-xs font-bold transition ${sel === k ? m.active : `bg-white ${m.idle} hover:bg-muted/40`}`}>
                        {m.label}
                    </button>
                ))}
            </div>
            <Input className="mt-3" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Catatan perubahan (opsional)" />
            <Button className="mt-3 w-full" disabled={sel === school.pipeline_status || change.isPending} onClick={() => change.mutate()}>
                {change.isPending ? "Menyimpan…" : "Simpan Status"}
            </Button>
            {sel === "sudah_mou" && <p className="mt-2 text-xs text-emerald-600">Status MoU memunculkan sekolah di daftar via instansi.</p>}
        </Card>
    );
}

function CommissionCard({ school, onDone }: { school: School; onDone: () => void }) {
    const [val, setVal] = useState(String(school.commission_percent));
    const save = useMutation({
        mutationFn: async () => api.patch(`/canvas/schools/${school.id}/commission`, { commission_percent: Number(val) }),
        onSuccess: onDone,
    });
    return (
        <Card className="p-5 shadow-sm border-slate-200/60">
            <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold"><Percent className="h-4 w-4" /> Komisi Sekolah</h3>
            <div className="flex items-center gap-2">
                <Input type="number" min={0} max={100} value={val} onChange={(e) => setVal(e.target.value)} className="w-24" />
                <span className="text-sm text-muted-foreground">%</span>
                <Button size="sm" disabled={save.isPending} onClick={() => save.mutate()} className="ml-auto">Simpan</Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Jatah sekolah dari tiap tagihan siswa instansi.</p>
        </Card>
    );
}

function HargaCard({ school, onDone }: { school: School; onDone: () => void }) {
    const [reg, setReg] = useState(String(school.registration_fee ?? 0));
    const [cyc, setCyc] = useState(String(school.price_per_cycle ?? 0));
    const save = useMutation({
        mutationFn: async () => api.put(`/canvas/schools/${school.id}`, { name: school.name, registration_fee: Number(reg), price_per_cycle: Number(cyc) }),
        onSuccess: onDone,
    });
    return (
        <Card className="p-5 shadow-sm border-slate-200/60">
            <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold"><Banknote className="h-4 w-4" /> Harga (Instansi)</h3>
            <div className="space-y-2.5">
                <div><Label className="text-xs">Biaya daftar</Label><Input type="number" min={0} value={reg} onChange={(e) => setReg(e.target.value)} /></div>
                <div><Label className="text-xs">Harga per periode (SPP)</Label><Input type="number" min={0} value={cyc} onChange={(e) => setCyc(e.target.value)} /></div>
                <Button size="sm" className="w-full" disabled={save.isPending} onClick={() => save.mutate()}>Simpan Harga</Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Ditagih ke siswa instansi ({rp(cyc || 0)}/periode).</p>
        </Card>
    );
}

function MediaCard({ school, onDone, onView }: { school: School; onDone: () => void; onView: (v: ViewerItem) => void }) {
    const [busy, setBusy] = useState<"photo" | "qris_image" | null>(null);
    const [err, setErr] = useState<string | null>(null);

    const upload = async (file: File, field: "photo" | "qris_image") => {
        setErr(null);
        if (!ALLOWED_IMG.includes(file.type)) { setErr("Format tidak didukung — gunakan JPG atau PNG."); return; }
        if (file.size > 5 * 1024 * 1024) { setErr("Ukuran file melebihi 5MB."); return; }

        setBusy(field);
        try {
            const fd = new FormData(); fd.append("image", file);
            const { data } = await api.post<ApiEnvelope<{ path: string }>>("/canvas/upload", fd);
            await api.put(`/canvas/schools/${school.id}`, { name: school.name, [field]: data.data.path });
            onDone();
        } catch (e) {
            setErr(apiError(e, "Gagal mengunggah gambar."));
        } finally {
            setBusy(null);
        }
    };

    return (
        <Card className="p-5 shadow-sm border-slate-200/60">
            <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold"><ImageIcon className="h-4 w-4" /> Foto & QRIS</h3>
            <div className="grid grid-cols-2 gap-3">
                <MediaSlot label="Foto Sekolah" src={fileUrl(school.photo)} loading={busy === "photo"}
                    onPick={(f) => upload(f, "photo")} onView={() => school.photo && onView({ protected: false, value: fileUrl(school.photo)! })} />
                <MediaSlot label="QRIS / Rekening" src={fileUrl(school.qris_image)} loading={busy === "qris_image"}
                    onPick={(f) => upload(f, "qris_image")} onView={() => school.qris_image && onView({ protected: false, value: fileUrl(school.qris_image)! })} />
            </div>
            {err && (
                <div className="mt-3 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{err}</span>
                </div>
            )}
            <p className="mt-2 text-[11px] text-muted-foreground">Format JPG atau PNG, maks 5MB. Klik gambar untuk lihat penuh.</p>
        </Card>
    );
}

function MediaSlot({ label, src, loading, onPick, onView }: { label: string; src: string | null; loading: boolean; onPick: (f: File) => void; onView: () => void }) {
    const inputRef = useRef<HTMLInputElement>(null);
    return (
        <div>
            <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
            <div className="group relative flex aspect-square items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-muted-foreground/25 bg-muted/20">
                {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : src ? (
                    <>
                        <button type="button" onClick={onView} className="relative h-full w-full cursor-zoom-in">
                            <img src={src} alt={label} className="h-full w-full object-cover" />
                            <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/30 group-hover:opacity-100">
                                <ZoomIn className="h-6 w-6 text-white" />
                            </span>
                        </button>
                        <button type="button" onClick={() => inputRef.current?.click()}
                            className="absolute bottom-1.5 right-1.5 rounded-md bg-black/60 px-2 py-1 text-[10px] font-medium text-white hover:bg-black/75">
                            Ganti
                        </button>
                    </>
                ) : (
                    <button type="button" onClick={() => inputRef.current?.click()} className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary">
                        <Upload className="h-5 w-5" /><span className="text-[11px]">Unggah</span>
                    </button>
                )}
                <input ref={inputRef} type="file" accept="image/jpeg,image/png" className="hidden"
                    onClick={(e) => { (e.target as HTMLInputElement).value = ""; }}
                    onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])} />
            </div>
        </div>
    );
}

function MouCard({ schoolId, mous, onDone }: { schoolId: number; mous: Mou[]; onDone: () => void }) {
    const confirm = useConfirm();
    const [open, setOpen] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [periods, setPeriods] = useState("5");
    const [note, setNote] = useState("");
    const [selfManaged, setSelfManaged] = useState(false);

    const add = useMutation({
        mutationFn: async () => {
            const fd = new FormData();
            fd.append("file", file!); fd.append("periods", periods);
            fd.append("self_managed", selfManaged ? "1" : "0");
            if (note) fd.append("note", note);
            return api.post(`/canvas/schools/${schoolId}/mou`, fd);
        },
        onSuccess: () => { setFile(null); setPeriods("5"); setNote(""); setSelfManaged(false); setOpen(false); onDone(); },
    });
    const del = useMutation({ mutationFn: async (id: number) => api.delete(`/canvas/mou/${id}`), onSuccess: onDone });

    const onDelete = async (m: Mou) => {
        if (await confirm({ title: "Hapus MoU?", description: "Dokumen MoU ini akan dihapus.", confirmText: "Hapus", variant: "destructive" })) del.mutate(m.id);
    };
    const download = async (m: Mou) => {
        // presigned URL dibuat dengan Content-Disposition: attachment → browser tetap mengunduh lintas origin
        const { url } = await protectedFileUrl(`/canvas/mou/${m.id}/file`);
        const a = document.createElement("a"); a.href = url; a.download = `mou-${m.id}`; a.click();
        if (url.startsWith("blob:")) URL.revokeObjectURL(url);
    };

    return (
        <Card className="p-5 shadow-sm border-slate-200/60">
            <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-1.5 text-sm font-semibold"><FileText className="h-4 w-4" /> Dokumen MoU</h3>
                <Button size="sm" variant="outline" onClick={() => setOpen((o) => !o)}><Plus className="mr-1 h-4 w-4" /> Tambah MoU</Button>
            </div>

            {open && (
                <div className="mb-4 space-y-3 rounded-lg border bg-muted/30 p-3">
                    <FileDrop accept=".pdf,image/*" label="Dokumen MoU" hint="PDF/JPG/PNG, maks 5MB" value={file} onPick={setFile} />
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <div className="flex-1"><Label className="text-xs">Jumlah periode</Label><Input type="number" min={1} value={periods} onChange={(e) => setPeriods(e.target.value)} className="h-9" /></div>
                        <div className="flex-[2]"><Label className="text-xs">Catatan</Label><Input value={note} onChange={(e) => setNote(e.target.value)} className="h-9" /></div>
                    </div>
                    <label className="flex items-start gap-2 rounded-md border bg-background p-2.5 text-xs">
                        <input type="checkbox" checked={selfManaged} onChange={(e) => setSelfManaged(e.target.checked)} className="mt-0.5 h-4 w-4 accent-primary" />
                        <span>
                            <span className="font-semibold">Sekolah kelola pendaftaran &amp; pembayaran sendiri</span>
                            <span className="block text-muted-foreground">Tagihan tiap periode langsung jadi kewajiban sekolah (ortu tidak membayar via sistem, tapi tetap bisa buka dashboard).</span>
                        </span>
                    </label>
                    <div className="flex justify-end">
                        <Button size="sm" disabled={!file || add.isPending} onClick={() => add.mutate()}>
                            {add.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan MoU"}
                        </Button>
                    </div>
                </div>
            )}

            {mous.length ? (
                <ul className="space-y-2">
                    {mous.map((m) => (
                        <li key={m.id} className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm">
                            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <div className="min-w-0 flex-1">
                                <div className="truncate font-medium">
                                    {m.periods} periode {m.note ? `· ${m.note}` : ""}
                                    {m.self_managed && <span className="ml-2 rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-700">KELOLA SENDIRI</span>}
                                </div>
                                <div className="text-xs text-muted-foreground">{m.creator?.name ?? "—"}</div>
                            </div>
                            <Button size="sm" variant="ghost" onClick={() => download(m)}>Unduh</Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => onDelete(m)}><Trash2 className="h-4 w-4" /></Button>
                        </li>
                    ))}
                </ul>
            ) : <p className="text-sm text-muted-foreground">Belum ada MoU.</p>}
        </Card>
    );
}

function NotesCard({ school, onDone, onView }: { school: School; onDone: () => void; onView: (v: ViewerItem) => void }) {
    const [kind, setKind] = useState<"audit" | "pertemuan">("pertemuan");
    const [note, setNote] = useState("");
    const [photo, setPhoto] = useState<File | null>(null);
    const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null);
    const [locBusy, setLocBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const isPertemuan = kind === "pertemuan";
    const valid = note.trim() && (!isPertemuan || (photo && loc));

    const ambilLokasi = () => {
        setErr(null);
        if (!navigator.geolocation) { setErr("Perangkat tidak mendukung GPS."); return; }
        setLocBusy(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => { setLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocBusy(false); },
            (e) => { setErr("Gagal mengambil lokasi: " + e.message); setLocBusy(false); },
            { enableHighAccuracy: true, timeout: 10000 },
        );
    };

    const add = useMutation({
        mutationFn: async () => {
            const fd = new FormData();
            fd.append("note", note); fd.append("kind", kind);
            if (photo) fd.append("photo", photo);
            if (loc) { fd.append("latitude", String(loc.lat)); fd.append("longitude", String(loc.lng)); }
            return api.post(`/canvas/schools/${school.id}/notes`, fd);
        },
        onSuccess: () => { setNote(""); setPhoto(null); setLoc(null); setErr(null); onDone(); },
        onError: (e) => setErr(apiError(e, "Gagal menyimpan catatan.")),
    });

    return (
        <Card className="p-5 shadow-sm border-slate-200/60">
            <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold"><MessageSquarePlus className="h-4 w-4" /> Catatan</h3>

            <div className="mb-4 space-y-3 rounded-lg border bg-muted/30 p-3">
                <div className="inline-flex rounded-lg border bg-background p-1">
                    {(["pertemuan", "audit"] as const).map((k) => (
                        <button key={k} onClick={() => setKind(k)} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${kind === k ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                            {k === "pertemuan" ? "Catatan Pertemuan" : "Audit"}
                        </button>
                    ))}
                </div>

                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Tulis catatan…"
                    className="w-full resize-y rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />

                {isPertemuan && (
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                            <Label className="mb-1 block text-xs">Foto kunjungan <span className="text-red-600">*</span></Label>
                            <FileDrop accept="image/*" label="Foto kunjungan" value={photo} onPick={setPhoto} />
                        </div>
                        <div>
                            <Label className="mb-1 block text-xs">Lokasi kedatangan <span className="text-red-600">*</span></Label>
                            {loc ? (
                                <div className="space-y-1.5">
                                    <MiniMap lat={loc.lat} lng={loc.lng} className="h-32 w-full rounded-lg border" />
                                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                        <span>{loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}</span>
                                        <button type="button" onClick={ambilLokasi} className="text-primary hover:underline">Perbarui</button>
                                    </div>
                                </div>
                            ) : (
                                <button type="button" onClick={ambilLokasi} disabled={locBusy}
                                    className="flex h-32 w-full flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed text-muted-foreground hover:border-primary/50 hover:bg-background">
                                    {locBusy ? <Loader2 className="h-6 w-6 animate-spin" /> : <MapPin className="h-6 w-6" />}
                                    <span className="text-xs">{locBusy ? "Mengambil lokasi…" : "Ambil Lokasi Saya"}</span>
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {err && <p className="text-sm text-red-600">{err}</p>}

                <div className="flex items-center justify-between">
                    {isPertemuan && !valid ? <span className="text-xs text-muted-foreground">Wajib foto & lokasi untuk catatan pertemuan.</span> : <span />}
                    <Button size="sm" disabled={!valid || add.isPending} onClick={() => add.mutate()}>
                        {add.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null} Tambah
                    </Button>
                </div>
            </div>

            {school.notes?.length ? (
                <ul className="space-y-3">
                    {school.notes.map((n) => (
                        <li key={n.id} className="rounded-lg border p-3">
                            <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <Badge variant="outline" className="text-[10px]">{n.kind === "pertemuan" ? "Pertemuan" : "Audit"}</Badge>
                                <span className="flex items-center gap-1"><CalendarClock className="h-3 w-3" /> {tglJam(n.created_at)}</span>
                                {n.creator?.name ? `· ${n.creator.name}` : ""}
                            </div>
                            <p className="whitespace-pre-wrap text-sm">{n.note}</p>
                            {(n.photo || n.latitude != null) && (
                                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                    {n.photo && (
                                        <button type="button" onClick={() => onView({ protected: true, value: n.photo! })}
                                            className="group relative block overflow-hidden rounded-lg border">
                                            <AuthImage path={n.photo} alt="lampiran" className="h-32 w-full cursor-zoom-in object-cover" />
                                            <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/30 group-hover:opacity-100">
                                                <ZoomIn className="h-6 w-6 text-white" />
                                            </span>
                                        </button>
                                    )}
                                    {n.latitude != null && n.longitude != null && (
                                        <div className="space-y-1">
                                            <MiniMap lat={n.latitude} lng={n.longitude} className="h-32 w-full rounded-lg border" />
                                            <a href={`https://www.openstreetmap.org/?mlat=${n.latitude}&mlon=${n.longitude}#map=17/${n.latitude}/${n.longitude}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"><ExternalLink className="h-3 w-3" /> Buka lokasi di peta</a>
                                        </div>
                                    )}
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            ) : <p className="text-sm text-muted-foreground">Belum ada catatan.</p>}
        </Card>
    );
}

function LogCard({ logs }: { logs: Log[] }) {
    if (!logs.length) return null;
    return (
        <Card className="p-5 shadow-sm border-slate-200/60">
            <h3 className="mb-3 text-sm font-semibold">Riwayat Status</h3>
            <ul className="space-y-2 text-sm">
                {logs.map((l) => (
                    <li key={l.id} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-muted-foreground">
                        <span className="font-medium text-foreground">{STATUS[l.old_status ?? ""] ?? "—"} → {STATUS[l.new_status]}</span>
                        {l.note ? `· ${l.note}` : ""} <span className="ml-auto text-xs">{tgl(l.created_at)}</span>
                    </li>
                ))}
            </ul>
        </Card>
    );
}