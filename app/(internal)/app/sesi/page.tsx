"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap, Building2, Users, ChevronRight } from "lucide-react";
import { api, type ApiEnvelope } from "@/lib/api";
import { InternalShell } from "@/components/internal/InternalShell";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type Kelas = { id: number; name: string; program: { name: string } | null; school: { name: string } | null; active_count: number };

export default function SesiPage() {
    const router = useRouter();
    const { data, isLoading } = useQuery({ queryKey: ["sesi-kelas"], queryFn: async () => (await api.get<ApiEnvelope<Kelas[]>>("/sesi/kelas")).data.data });
    const today = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    return (
        <InternalShell>
            <PageHeader title="Sesi & Absensi" subtitle={today} />
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {isLoading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)
                    : data?.length ? data.map((k) => (
                        <Card key={k.id} className="flex flex-col border-2 p-5">
                            <div className="flex items-start gap-3">
                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><GraduationCap className="h-5 w-5" /></span>
                                <div className="min-w-0">
                                    <div className="truncate font-semibold leading-tight">{k.name}</div>
                                    <div className="mt-0.5 text-xs text-muted-foreground">{k.school?.name ?? "Mandiri"} · {k.program?.name ?? "—"}</div>
                                </div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-1.5">
                                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"><Building2 className="h-3 w-3" /> {k.school?.name ?? "Kantor"}</span>
                                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"><Users className="h-3 w-3" /> {k.active_count} murid</span>
                            </div>
                            <div className="mt-auto pt-4">
                                <Button className="w-full" onClick={() => router.push(`/app/sesi/kelas/${k.id}`)}>Buka Kelas <ChevronRight className="ml-1 h-4 w-4" /></Button>
                            </div>
                        </Card>
                    )) : <Card className="col-span-full p-12 text-center text-sm text-muted-foreground">Belum ada kelas.</Card>}
            </div>
        </InternalShell>
    );
}