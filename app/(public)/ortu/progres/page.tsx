"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, ChevronRight, ImageIcon } from "lucide-react";
import { api, type ApiEnvelope } from "@/lib/api";
import { ParentShell } from "@/components/ortu/ParentShell";
import { useParentGuard } from "@/lib/use-parent-guard";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type Att = { id: number; status: string; report: string | null; has_photo: boolean; attended_at: string };
type Progress = {
    student: { id: number; name: string; student_code: string; status: string; school?: string | null };
    summary: { hadir: number; izin: number; tidak_hadir: number; total_sesi: number };
    attendances: Att[];
};

const ST: Record<string, { label: string; cls: string; dot: string }> = {
    hadir: { label: "Hadir", cls: "border-emerald-200 bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
    izin: { label: "Izin", cls: "border-blue-200 bg-blue-50 text-blue-700", dot: "bg-blue-500" },
    sakit: { label: "Sakit", cls: "border-amber-200 bg-amber-50 text-amber-700", dot: "bg-amber-500" },
    tanpa_keterangan: { label: "Tanpa Keterangan", cls: "border-red-200 bg-red-50 text-red-700", dot: "bg-red-500" },
    tidak_hadir: { label: "Tidak Hadir", cls: "border-red-200 bg-red-50 text-red-700", dot: "bg-red-500" },
};

const tgl = (s: string) => new Date(s).toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

export default function OrtuProgres() {
    const { parent, ready } = useParentGuard();

    const { data, isLoading } = useQuery({
        queryKey: ["ortu-progres", parent?.studentId],
        enabled: !!parent?.studentId,
        queryFn: async () =>
            (await api.post<ApiEnvelope<Progress>>("/murid/progress", { student_id: parent?.studentId, phone: parent?.phone })).data.data,
    });

    if (!ready || !parent) {
        return (
            <ParentShell>
                <div className="space-y-4">
                    <Skeleton className="h-28 rounded-xl" />
                    <Skeleton className="h-64 rounded-xl" />
                </div>
            </ParentShell>
        );
    }

    const sum = data?.summary;
    const total = sum?.total_sesi ?? 0;
    const persenHadir = total > 0 ? Math.round(((sum?.hadir ?? 0) / total) * 100) : 0;
    const schoolName = parent?.schoolName || data?.student?.school;

    return (
        <ParentShell>
            <PageHeader
                title="Progres Belajar"
                subtitle={data ? `${data.student.name} · ${data.student.student_code}${schoolName ? ` · ${schoolName}` : ""}` : "Riwayat kehadiran & catatan trainer."}
            />

            {isLoading || !data || !sum ? (
                <div className="space-y-4">
                    <Skeleton className="h-28 rounded-xl" />
                    <Skeleton className="h-64 rounded-xl" />
                </div>
            ) : (
                <div className="mt-4 space-y-6">
                    {/* Ringkasan */}
                    <Card className="border-2 p-5">
                        <div className="mb-3 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm font-semibold"><CalendarCheck className="h-4 w-4" /> Ringkasan Kehadiran</div>
                            <span className="text-sm font-semibold text-emerald-600">{persenHadir}% hadir</span>
                        </div>
                        <div className="flex h-3 overflow-hidden rounded-full bg-muted">
                            {total > 0 && (["hadir", "izin", "tidak_hadir"] as const).map((k) =>
                                sum[k] > 0 ? <div key={k} className={ST[k].dot} style={{ width: `${(sum[k] / total) * 100}%` }} /> : null
                            )}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {(["hadir", "izin", "tidak_hadir"] as const).map((k) => (
                                <span key={k} className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">
                                    <span className={`h-2 w-2 rounded-full ${ST[k].dot}`} /> {ST[k].label} {sum[k]}
                                </span>
                            ))}
                            <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold">Total {total} sesi</span>
                        </div>
                    </Card>

                    {/* Timeline (klik → detail) */}
                    <div className="space-y-3">
                        {data.attendances.length ? (
                            data.attendances.map((a) => {
                                const m = ST[a.status] ?? ST.tidak_hadir;
                                return (
                                    <Link key={a.id} href={`/ortu/progres/${a.id}`} className="block">
                                        <Card className="group overflow-hidden border-2 transition hover:border-primary/40 hover:shadow-sm">
                                            <div className="flex items-center">
                                                <div className={`w-1.5 shrink-0 self-stretch ${m.dot}`} />
                                                <div className="min-w-0 flex-1 p-4">
                                                    <div className="text-sm font-medium">{tgl(a.attended_at)}</div>
                                                    <div className="mt-1 flex items-center gap-2">
                                                        <Badge variant="outline" className={m.cls}>{m.label}</Badge>
                                                        {a.has_photo && (
                                                            <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                                                                <ImageIcon className="h-3 w-3" /> Foto
                                                            </span>
                                                        )}
                                                        {a.report && <span className="truncate text-xs text-muted-foreground">Ada catatan trainer</span>}
                                                    </div>
                                                </div>
                                                <ChevronRight className="mr-3 h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5" />
                                            </div>
                                        </Card>
                                    </Link>
                                );
                            })
                        ) : (
                            <Card className="border-2 p-10 text-center text-sm text-muted-foreground">Belum ada riwayat sesi.</Card>
                        )}
                    </div>
                </div>
            )}
        </ParentShell>
    );
}