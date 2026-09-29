"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Search, Loader2, ArrowLeft, ChevronRight, Users, Wallet, Building2 } from "lucide-react";
import { api, apiError, type ApiEnvelope } from "@/lib/api";
import { useParent } from "@/lib/parent-store";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";

type Student = {
    id: number;
    student_code: string;
    name: string;
    verified: boolean;
    self_managed?: boolean;
    school?: string | null;
    parent: { phone: string };
};

export default function OrtuLookupPage() {
    const router = useRouter();
    const setParent = useParent((s) => s.setParent);
    const [query, setQuery] = useState("");
    const [students, setStudents] = useState<Student[] | null>(null);
    const [blocked, setBlocked] = useState<Student | null>(null);
    const [msg, setMsg] = useState<string | null>(null);

    const pick = (s: Student) => {
        if (!s.verified) { setBlocked(s); return; }
        setParent({
            studentId: s.id,
            name: s.name,
            studentCode: s.student_code,
            phone: s.parent.phone,
            selfManaged: s.self_managed,
            schoolName: s.school ?? null,
        });
        router.push(s.self_managed ? "/ortu/dashboard" : "/ortu/tagihan");
    };

    const lookup = useMutation({
        mutationFn: async () => {
            const isPhone = /^[\d+\s-]+$/.test(query.trim());
            return (await api.post<ApiEnvelope<{ students: Student[] }>>(
                "/auth/parent/lookup",
                isPhone ? { phone: query } : { name: query }
            )).data;
        },
        onSuccess: (res) => {
            setMsg(null); setBlocked(null);
            const list = res.data.students;
            if (list.length === 1) {
                pick(list[0]);
            } else {
                setStudents(list);
            }
        },
        onError: (e) => { setStudents(null); setBlocked(null); setMsg(apiError(e, "Data tidak ditemukan.")); },
    });

    return (
        <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8">
            <AnimatedBackground />
            <div className="w-full max-w-md">
                <Link href="/" className="mb-4 inline-flex items-center gap-2 rounded-full border-2 border-black bg-white px-4 py-2 font-display text-sm font-extrabold shadow-[3px_3px_0_0_#000] transition active:translate-y-[2px] active:shadow-none">
                    <ArrowLeft className="h-4 w-4" strokeWidth={2.5} /> Kembali
                </Link>

                <div className="rounded-2xl border-[3px] border-black bg-white p-5 shadow-[5px_5px_0_0_#000] sm:rounded-3xl sm:p-7">
                    <span className="flex h-11 w-11 items-center justify-center rounded-md border-2 border-black bg-[#9b2d9b] text-white shadow-[2px_2px_0_0_#000]">
                        <Users className="h-5 w-5" strokeWidth={2.5} />
                    </span>
                    <h1 className="mt-4 font-display text-xl font-extrabold tracking-tight sm:text-2xl">Masuk Orang Tua</h1>
                    <p className="mt-1 text-sm font-medium text-[#5f5e5a]">Cukup nama anak atau nomor HP terdaftar — tanpa kata sandi.</p>

                    <form onSubmit={(e) => { e.preventDefault(); lookup.mutate(); }} className="mt-5 flex flex-col gap-2.5 sm:flex-row">
                        <div className="relative min-w-0 flex-1">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5f5e5a]" strokeWidth={2.5} />
                            <input
                                aria-label="Nama anak atau nomor HP terdaftar"
                                className="w-full rounded-md border-2 border-black bg-white py-2.5 pl-9 pr-3 text-base font-medium outline-none transition focus:shadow-[3px_3px_0_0_#000]"
                                placeholder="Nama anak / 08xxxx" value={query} onChange={(e) => setQuery(e.target.value)} />
                        </div>
                        <button type="submit" disabled={!query || lookup.isPending}
                            className="flex w-full shrink-0 items-center justify-center gap-2 rounded-md border-2 border-black bg-[#ffd23f] px-5 py-2.5 font-display text-sm font-extrabold shadow-[3px_3px_0_0_#000] transition active:translate-y-[2px] active:shadow-none disabled:opacity-50 sm:w-auto">
                            {lookup.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Search className="h-4 w-4" strokeWidth={2.5} /> Cari</>}
                        </button>
                    </form>
                    {msg && <p className="mt-3 text-sm font-semibold text-red-600">{msg}</p>}

                    {blocked && (
                        <div className="mt-4 rounded-xl border-[3px] border-black bg-[#ffd23f] p-4 shadow-[4px_4px_0_0_#000]">
                            <p className="font-display font-extrabold">Belum bisa masuk</p>
                            <p className="mt-1 text-sm font-medium">
                                Pembayaran <b>{blocked.name}</b>{blocked.school ? ` (${blocked.school})` : ""} belum terverifikasi. Selesaikan pembayaran dan tunggu verifikasi admin.
                            </p>
                            <Link href="/bayar"
                                className="mt-3 inline-flex items-center gap-2 rounded-md border-2 border-black bg-[#9b2d9b] px-4 py-2 font-display text-sm font-extrabold text-white shadow-[3px_3px_0_0_#000] transition active:translate-y-[2px] active:shadow-none">
                                <Wallet className="h-4 w-4" strokeWidth={2.5} /> Bayar Sekarang
                            </Link>
                        </div>
                    )}

                    {students && students.length > 1 && (
                        <div className="mt-5 space-y-2.5">
                            <p className="font-display text-sm font-bold">Pilih anak:</p>
                            {students.map((s) => (
                                <button key={s.id} onClick={() => pick(s)}
                                    className="flex w-full items-center justify-between gap-3 rounded-xl border-[3px] border-black bg-white p-3.5 text-left shadow-[4px_4px_0_0_#000] transition hover:bg-slate-50 active:translate-y-[3px] active:shadow-none">
                                    <div className="min-w-0 flex-1">
                                        <span className="block truncate font-display font-extrabold">{s.name}</span>
                                        {s.school ? (
                                            <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                                                <Building2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                                                <span className="truncate">{s.school}</span>
                                            </span>
                                        ) : (
                                            <span className="mt-0.5 block text-xs font-medium text-[#5f5e5a]">Jalur Mandiri</span>
                                        )}
                                    </div>
                                    <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-[#5f5e5a]">
                                        {!s.verified && <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">belum lunas</span>}
                                        <span className="font-mono text-[11px]">{s.student_code}</span>
                                        <ChevronRight className="h-4 w-4" />
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}