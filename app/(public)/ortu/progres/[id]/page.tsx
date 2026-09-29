"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MessageSquareText, CalendarCheck, User, Star } from "lucide-react";
import { api, type ApiEnvelope } from "@/lib/api";
import { ParentShell } from "@/components/ortu/ParentShell";
import { useParentGuard } from "@/lib/use-parent-guard";
import { AuthImage } from "@/components/ui/auth-image";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type Att = { id: number; status: string; score: string | null; report: string | null; has_photo: boolean; photo: string | null; trainer_name: string | null; attended_at: string };
type Progress = { attendances: Att[] };

const ST: Record<string, { label: string; cls: string; dot: string }> = {
    hadir: { label: "Hadir", cls: "border-emerald-200 bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
    izin: { label: "Izin", cls: "border-blue-200 bg-blue-50 text-blue-700", dot: "bg-blue-500" },
    sakit: { label: "Sakit", cls: "border-amber-200 bg-amber-50 text-amber-700", dot: "bg-amber-500" },
    tanpa_keterangan: { label: "Tanpa Keterangan", cls: "border-red-200 bg-red-50 text-red-700", dot: "bg-red-500" },
    tidak_hadir: { label: "Tidak Hadir", cls: "border-red-200 bg-red-50 text-red-700", dot: "bg-red-500" },
};
const GRADE_CLS: Record<string, string> = { A: "bg-emerald-500", B: "bg-lime-500", C: "bg-amber-500", D: "bg-orange-500", E: "bg-red-500" };
const GRADE_LABEL: Record<string, string> = { A: "Sangat Baik", B: "Baik", C: "Cukup", D: "Kurang", E: "Sangat Kurang" };
const tgl = (s: string) => new Date(s).toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

export default function DetailProgres({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
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
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-64 rounded-xl" />
                </div>
            </ParentShell>
        );
    }

    const a = data?.attendances.find((x) => String(x.id) === id);
    const m = a ? ST[a.status] ?? ST.tidak_hadir : null;
    const g = a?.score ? String(a.score) : null;

    return (
        <ParentShell>
            <Link href="/ortu/progres" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" /> Kembali ke Progres
            </Link>

            {isLoading ? (
                <Skeleton className="h-80 rounded-xl" />
            ) : !a || !m ? (
                <Card className="border-2 p-10 text-center text-sm text-muted-foreground">Sesi tidak ditemukan.</Card>
            ) : (
                <Card className="overflow-hidden border-2">
                    <div className={`flex flex-wrap items-center justify-between gap-2 border-b p-5 ${m.cls}`}>
                        <div className="flex items-center gap-2 font-semibold"><CalendarCheck className="h-5 w-5" /> {tgl(a.attended_at)}</div>
                        <Badge variant="outline" className="border-black/10 bg-white/60">{m.label}</Badge>
                    </div>

                    {/* Meta: Nilai + Trainer */}
                    <div className="grid gap-3 p-5 sm:grid-cols-2">
                        <div className="flex items-center gap-3 rounded-lg border p-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted"><Star className="h-4 w-4" /></span>
                            <div>
                                <div className="text-xs text-muted-foreground">Nilai Sesi</div>
                                {g ? (
                                    <div className="flex items-center gap-2">
                                        <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ${GRADE_CLS[g] ?? "bg-slate-400"}`}>{g}</span>
                                        <span className="text-sm font-medium">{GRADE_LABEL[g] ?? "-"}</span>
                                    </div>
                                ) : (
                                    <div className="text-sm text-muted-foreground">Belum dinilai</div>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-3 rounded-lg border p-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted"><User className="h-4 w-4" /></span>
                            <div>
                                <div className="text-xs text-muted-foreground">Trainer</div>
                                <div className="text-sm font-medium">{a.trainer_name ?? "-"}</div>
                            </div>
                        </div>
                    </div>

                    {a.report && (
                        <div className="border-t p-5">
                            <div className="mb-2 flex items-center gap-1 text-xs font-medium text-muted-foreground"><MessageSquareText className="h-3.5 w-3.5" /> Catatan Trainer</div>
                            <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: a.report }} />
                        </div>
                    )}

                    {a.has_photo && a.photo && (
                        <div className="border-t p-5">
                            <div className="mb-2 text-xs font-medium text-muted-foreground">Dokumentasi</div>
                            <AuthImage path={a.photo} alt="dokumentasi sesi" className="max-h-96 w-full rounded-lg border object-contain" />
                        </div>
                    )}
                </Card>
            )}
        </ParentShell>
    );
}