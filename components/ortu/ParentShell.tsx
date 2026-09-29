"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Wallet, ClipboardList, FileText, LogOut, Building2 } from "lucide-react";
import { useParent } from "@/lib/parent-store";
import { useConfirm } from "@/components/ui/confirm";
import { BottomNav, type NavItem } from "@/components/ui/BottomNav";
import { useIsMobile } from "@/hooks/useIsMobile";
import { cn } from "@/lib/utils";

const NAV: NavItem[] = [
    { href: "/ortu/dashboard", label: "Beranda", icon: LayoutDashboard },
    { href: "/ortu/tagihan", label: "Tagihan", icon: Wallet },
    { href: "/ortu/progres", label: "Progres", icon: ClipboardList },
    { href: "/ortu/rapot", label: "E-Rapot", icon: FileText },
];

export function ParentShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const isMobile = useIsMobile();
    const confirm = useConfirm();

    const parent = useParent((s) => s.parent);
    const clearParent = useParent((s) => s.clearParent);
    const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

    // Sekolah kelola pendaftaran & pembayaran sendiri → menu Tagihan disembunyikan
    const nav = parent?.selfManaged ? NAV.filter((n) => n.href !== "/ortu/tagihan") : NAV;

    const keluar = async () => {
        const ok = await confirm({ title: "Keluar?", description: "Anda perlu memasukkan nama/HP anak lagi untuk mengakses.", confirmText: "Keluar", variant: "destructive" });
        if (!ok) return;
        clearParent();
        router.replace("/ortu");
    };

    return (
        <div className="flex min-h-screen bg-muted/30">
            {/* SIDEBAR desktop */}
            <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-background md:flex">
                <div className="flex h-14 items-center gap-2 border-b px-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">R</div>
                    <span className="font-semibold">Portal Orang Tua</span>
                </div>
                <div className="border-b px-4 py-3">
                    <div className="truncate text-sm font-semibold">{parent?.name ?? "Anak"}</div>
                    <div className="font-mono text-xs text-muted-foreground">{parent?.studentCode ?? "—"}</div>
                    {parent?.schoolName && (
                        <div className="mt-1.5 flex items-center gap-1.5 rounded-md bg-muted/60 px-2 py-1 text-xs font-medium text-foreground/85">
                            <Building2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                            <span className="truncate" title={parent.schoolName}>{parent.schoolName}</span>
                        </div>
                    )}
                </div>
                <nav className="flex-1 space-y-1 p-2">
                    {nav.map((it) => {
                        const Icon = it.icon;
                        const active = isActive(it.href);
                        return (
                            <Link key={it.href} href={it.href}
                                className={cn("flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                                    active ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted")}>
                                <Icon className="h-4 w-4" /> {it.label}
                            </Link>
                        );
                    })}
                </nav>
                <button onClick={keluar} className="flex items-center gap-2 border-t px-4 py-3 text-sm text-muted-foreground hover:bg-muted hover:text-red-600">
                    <LogOut className="h-4 w-4" /> Keluar
                </button>
            </aside>

            <div className="flex min-w-0 flex-1 flex-col">
                <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur">
                    <div className="flex items-center gap-2 md:hidden">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">R</div>
                        <div className="min-w-0 leading-tight">
                            <div className="truncate text-sm font-semibold max-w-[170px] sm:max-w-xs">{parent?.name ?? "Anak"}</div>
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                <span className="font-mono">{parent?.studentCode ?? "—"}</span>
                                {parent?.schoolName && (
                                    <>
                                        <span>•</span>
                                        <span className="truncate max-w-[120px] font-sans font-medium text-foreground/80" title={parent.schoolName}>{parent.schoolName}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    <button onClick={keluar} title="Keluar"
                        className="ml-auto flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-red-600 md:hidden">
                        <LogOut className="h-4 w-4" />
                    </button>
                </header>

                <main className="flex-1 p-4 pb-20 md:p-6 md:pb-6">{children}</main>
            </div>

            {isMobile && <BottomNav items={nav} />}
        </div>
    );
}