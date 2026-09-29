"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, Loader2, Award, FileText, PenLine } from "lucide-react";
import { api, type ApiEnvelope } from "@/lib/api";
import { ParentShell } from "@/components/ortu/ParentShell";
import { useParentGuard } from "@/lib/use-parent-guard";
import { AuthImage } from "@/components/ui/auth-image";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type Rapot = {
    id: number; semester: number; year: number; comments: string | null; signature_image: string | null;
    skill_building: string; skill_imagination: string; skill_creativity: string; skill_logic: string;
    behavior_punctual: string; behavior_stay: string; behavior_communication: string; behavior_responsibility: string;
};

const SKILLS: { key: keyof Rapot; label: string }[] = [
    { key: "skill_building", label: "Building" },
    { key: "skill_imagination", label: "Imagination" },
    { key: "skill_creativity", label: "Creativity" },
    { key: "skill_logic", label: "Logic Thinking" },
];
const BEHAV: { key: keyof Rapot; label: string }[] = [
    { key: "behavior_punctual", label: "Tepat Waktu" },
    { key: "behavior_stay", label: "Tidak Pulang Awal" },
    { key: "behavior_communication", label: "Komunikasi" },
    { key: "behavior_responsibility", label: "Tanggung Jawab" },
];
const GRADE_CLS: Record<string, string> = { A: "bg-emerald-500", B: "bg-lime-500", C: "bg-amber-500", D: "bg-orange-500", E: "bg-red-500" };
const GRADE_LABEL: Record<string, string> = { A: "Sangat Baik", B: "Baik", C: "Cukup", D: "Kurang", E: "Sangat Kurang" };

export default function DetailRapot({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { parent, ready } = useParentGuard();
    const [busy, setBusy] = useState(false);

    const { data, isLoading } = useQuery({
        queryKey: ["ortu-rapot", parent?.studentId],
        enabled: !!parent?.studentId,
        queryFn: async () =>
            (await api.post<ApiEnvelope<Rapot[]>>("/e-rapot/parent", { student_id: parent?.studentId, phone: parent?.phone })).data.data,
    });

    if (!ready || !parent) {
        return (
            <ParentShell>
                <div className="space-y-4">
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-72 rounded-xl" />
                </div>
            </ParentShell>
        );
    }

    const r = data?.find((x) => String(x.id) === id);

    const download = async () => {
        if (!r || !parent) return;
        setBusy(true);
        try {
            const res = await api.post(`/e-rapot/${r.id}/parent-pdf`, { phone: parent.phone }, { responseType: "blob" });
            const url = URL.createObjectURL(res.data as Blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `e-rapot-semester-${r.semester}-${r.year}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } finally {
            setBusy(false);
        }
    };

    return (
        <ParentShell>
            <Link href="/ortu/rapot" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" /> Kembali ke E-Rapot
            </Link>

            {isLoading ? (
                <Skeleton className="h-96 rounded-xl" />
            ) : !r ? (
                <Card className="border-2 p-10 text-center text-sm text-muted-foreground">E-Rapot tidak ditemukan.</Card>
            ) : (
                <Card className="overflow-hidden border-2">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-primary/5 p-5">
                        <div className="flex items-center gap-3">
                            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary"><Award className="h-6 w-6" /></span>
                            <div>
                                <div className="text-lg font-semibold">Semester {r.semester}</div>
                                <div className="text-xs text-muted-foreground">Tahun Ajaran {r.year}</div>
                            </div>
                        </div>
                        <Button size="sm" variant="outline" disabled={busy} onClick={download}>
                            {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />} Unduh PDF
                        </Button>
                    </div>

                    <div className="grid gap-6 p-5 sm:grid-cols-2">
                        <Section title="Penilaian Skill" items={SKILLS} r={r} />
                        <Section title="Penilaian Sikap (Behaviour)" items={BEHAV} r={r} />
                    </div>

                    {r.comments && (
                        <div className="border-t p-5">
                            <div className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground"><FileText className="h-3.5 w-3.5" /> Catatan Trainer</div>
                            <p className="text-sm">{r.comments}</p>
                        </div>
                    )}

                    {r.signature_image && (
                        <div className="border-t p-5">
                            <div className="mb-2 flex items-center gap-1 text-xs font-medium text-muted-foreground"><PenLine className="h-3.5 w-3.5" /> Tanda Tangan Trainer</div>
                            <AuthImage path={r.signature_image} alt="tanda tangan" className="h-24 rounded border bg-white object-contain p-2" />
                        </div>
                    )}

                    <div className="flex flex-wrap gap-x-4 gap-y-1 border-t bg-muted/30 px-5 py-2 text-[11px] text-muted-foreground">
                        {(["A", "B", "C", "D", "E"] as const).map((g) => (
                            <span key={g} className="inline-flex items-center gap-1"><span className={`h-2.5 w-2.5 rounded-full ${GRADE_CLS[g]}`} /> {g} = {GRADE_LABEL[g]}</span>
                        ))}
                    </div>
                </Card>
            )}
        </ParentShell>
    );
}

function Section({ title, items, r }: { title: string; items: { key: keyof Rapot; label: string }[]; r: Rapot }) {
    return (
        <div>
            <h4 className="mb-3 text-sm font-semibold">{title}</h4>
            <ul className="space-y-2">
                {items.map((it) => {
                    const g = String(r[it.key] ?? "-");
                    return (
                        <li key={String(it.key)} className="flex items-center justify-between rounded-md border px-3 py-2.5 text-sm">
                            <span>{it.label}</span>
                            <span className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">{GRADE_LABEL[g] ?? ""}</span>
                                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white ${GRADE_CLS[g] ?? "bg-slate-400"}`}>{g}</span>
                            </span>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}