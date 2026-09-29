"use client";

import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Search, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { SchoolShell } from "@/components/sekolah/SchoolShell";
import { cn } from "@/lib/utils";

type Kelas = { id: number; name: string };
type Student = { id: number; student_code: string; name: string; gender: "L" | "P"; status: string; school_grade: string | null; is_verified?: boolean; classes: Kelas[] };
type Paginator = { data: Student[]; current_page: number; last_page: number; total: number };

const statusCls: Record<string, string> = {
    aktif: "bg-emerald-50 text-emerald-700 border-emerald-200",
    cuti: "bg-amber-50 text-amber-700 border-amber-200",
    nonaktif: "bg-slate-100 text-slate-600 border-slate-200",
    lulus: "bg-blue-50 text-blue-700 border-blue-200",
    berhenti: "bg-rose-50 text-rose-700 border-rose-200",
};
const filters = ["semua", "aktif", "cuti", "nonaktif", "lulus"];

function MuridInner() {
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("semua");
    const [verifikasi, setVerifikasi] = useState("verified");
    const [page, setPage] = useState(1);

    const q = useQuery({
        queryKey: ["sekolah-murid", { search, status, verifikasi, page }],
        queryFn: async () =>
            (await api.get("/sekolah/murid", {
                params: {
                    search: search || undefined,
                    status: status === "semua" ? undefined : status,
                    verification_status: verifikasi === "semua" ? "all" : verifikasi,
                    page,
                },
            })).data.data as Paginator,
        placeholderData: keepPreviousData,
    });

    const p = q.data;
    const rows = p?.data ?? [];

    const onFilter = (s: string) => { setStatus(s); setPage(1); };
    const onSearch = (v: string) => { setSearch(v); setPage(1); };

    return (
        <div className="space-y-6">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Murid</h1>
                    <p className="text-sm text-muted-foreground">Daftar murid sekolah Anda — klik untuk lihat rekap kehadiran, nilai & tagihan.</p>
                </div>
                <Button asChild><Link href="/daftar/instansi">Daftarkan Murid</Link></Button>
            </div>

            <Card className="overflow-hidden">
                {/* kontrol */}
                <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input className="pl-9" placeholder="Cari nama murid…" value={search} onChange={(e) => onSearch(e.target.value)} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {filters.map((f) => (
                            <Button key={f} size="sm" variant={status === f ? "default" : "outline"} className="capitalize" onClick={() => onFilter(f)}>
                                {f}
                            </Button>
                        ))}
                        <Select value={verifikasi} onValueChange={(v) => { setVerifikasi(v ?? "verified"); setPage(1); }}>
                            <SelectTrigger className="h-8 w-[155px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="verified">Terverifikasi</SelectItem>
                                <SelectItem value="unverified">Belum Verifikasi</SelectItem>
                                <SelectItem value="semua">Semua Verifikasi</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* tabel */}
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Murid</TableHead>
                            <TableHead>Kelas Robotiku</TableHead>
                            <TableHead>Kelas Asal</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {q.isLoading &&
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell colSpan={5}><Skeleton className="h-9 w-full" /></TableCell>
                                </TableRow>
                            ))}

                        {!q.isLoading && rows.length === 0 && (
                            <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">Belum ada murid.</TableCell></TableRow>
                        )}

                        {rows.map((s) => (
                            <TableRow key={s.id}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-9 w-9"><AvatarFallback>{s.name[0]}</AvatarFallback></Avatar>
                                        <div>
                                            <p className="font-medium leading-none">{s.name}</p>
                                            <p className="mt-1 text-xs text-muted-foreground">{s.student_code}</p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {s.classes.length ? (
                                        <div className="flex flex-wrap gap-1">
                                            {s.classes.map((c) => <Badge key={c.id} variant="secondary">{c.name}</Badge>)}
                                        </div>
                                    ) : <span className="text-sm text-muted-foreground">— belum ditempatkan</span>}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">{s.school_grade ?? "-"}</TableCell>
                                <TableCell>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        {s.is_verified === false && <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">Belum verifikasi</Badge>}
                                        <Badge variant="outline" className={cn("capitalize", statusCls[s.status])}>{s.status}</Badge>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button asChild size="icon" variant="ghost">
                                        <Link href={`/sekolah/murid/${s.id}`}><Eye className="h-4 w-4" /></Link>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                {/* pagination */}
                {p && (
                    <div className="flex items-center justify-between border-t p-4 text-sm text-muted-foreground">
                        <span>Total {p.total} murid · Halaman {p.current_page} dari {p.last_page}</span>
                        <div className="flex gap-1">
                            <Button size="icon" variant="outline" disabled={p.current_page <= 1} onClick={() => setPage((x) => x - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                            <Button size="icon" variant="outline" disabled={p.current_page >= p.last_page} onClick={() => setPage((x) => x + 1)}><ChevronRight className="h-4 w-4" /></Button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}

export default function Page() {
    return <SchoolShell><MuridInner /></SchoolShell>;
}