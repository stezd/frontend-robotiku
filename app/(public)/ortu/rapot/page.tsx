"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Award, ChevronRight } from "lucide-react";
import { api, type ApiEnvelope } from "@/lib/api";
import { ParentShell } from "@/components/ortu/ParentShell";
import { useParentGuard } from "@/lib/use-parent-guard";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Rapot = {
    id: number; semester: number; year: number;
    skill_building: string; skill_imagination: string; skill_creativity: string; skill_logic: string;
};
const GRADE_CLS: Record<string, string> = { A: "bg-emerald-500", B: "bg-lime-500", C: "bg-amber-500", D: "bg-orange-500", E: "bg-red-500" };

export default function OrtuRapot() {
    const { parent, ready } = useParentGuard();

    const { data, isLoading } = useQuery({
        queryKey: ["ortu-rapot", parent?.studentId],
        enabled: !!parent?.studentId,
        queryFn: async () =>
            (await api.post<ApiEnvelope<Rapot[]>>("/e-rapot/parent", { student_id: parent?.studentId, phone: parent?.phone })).data.data,
    });

    if (!ready || !parent) {
        return (
            <ParentShell>
                <div className="space-y-4">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
            </ParentShell>
        );
    }

    return (
        <ParentShell>
            <PageHeader
                title="E-Rapot"
                subtitle={parent?.schoolName ? `Perkembangan ananda di ${parent.schoolName} per semester.` : "Perkembangan skill & sikap ananda per semester."}
            />
            {isLoading ? (
                <div className="space-y-4">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
            ) : (
                <div className="mt-4 space-y-4">
                    {data?.length ? (
                        data.map((r) => (
                            <Link key={r.id} href={`/ortu/rapot/${r.id}`} className="block">
                                <Card className="group flex items-center gap-4 border-2 p-4 transition hover:border-primary/40 hover:shadow-sm">
                                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Award className="h-6 w-6" /></span>
                                    <div className="min-w-0 flex-1">
                                        <div className="font-semibold">Semester {r.semester} · {r.year}</div>
                                        <div className="mt-1.5 flex items-center gap-1.5">
                                            {[r.skill_building, r.skill_imagination, r.skill_creativity, r.skill_logic].map((g, i) => (
                                                <span key={i} className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white ${GRADE_CLS[g] ?? "bg-slate-400"}`}>{g}</span>
                                            ))}
                                            <span className="ml-1 text-xs text-muted-foreground">nilai skill</span>
                                        </div>
                                    </div>
                                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5" />
                                </Card>
                            </Link>
                        ))
                    ) : (
                        <Card className="border-2 p-10 text-center text-sm text-muted-foreground">Belum ada E-Rapot.</Card>
                    )}
                </div>
            )}
        </ParentShell>
    );
}