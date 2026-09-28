import {
    LayoutDashboard, Workflow, BadgeCheck, FileText, MapPin, Users, BookOpen, Ticket,
    Newspaper, Globe, UserCog, BookMarked, History, School, Landmark, CalendarRange,
    MessageCircle, Ruler, BarChart3,
} from "lucide-react";
import type { NavItem } from "@/components/ui/BottomNav";

export type Role = "super_admin" | "admin" | "marketing" | "trainer" | "admin_keuangan";
export type Item = NavItem & { roles: Role[] };
export type NavGroup = { label: string | null; items: Item[] };

export const INTERNAL_ROLES: Role[] = ["super_admin", "admin", "marketing", "trainer", "admin_keuangan"];

export const ROLE_LABEL: Record<Role, string> = {
    super_admin: "Super Admin", admin: "Admin", marketing: "Marketing",
    trainer: "Trainer", admin_keuangan: "Admin Keuangan",
};

/** Menu dikelompokkan. Grup dengan label = null selalu tampil datar (tanpa header). */
export const NAV_GROUPS: NavGroup[] = [
    {
        label: null,
        items: [
            { href: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["super_admin", "admin", "trainer", "admin_keuangan"] },

        ],
    },
    {
        label: "Pembelajaran",
        items: [
            { href: "/app/sesi", label: "Sesi & Absensi", icon: MapPin, roles: ["super_admin", "admin", "trainer"] },
            { href: "/app/rekap-sesi", label: "Rekap Sesi", icon: History, roles: ["super_admin", "admin", "trainer"] },
            { href: "/app/e-rapot", label: "E-Rapot", icon: FileText, roles: ["super_admin", "admin", "trainer"] },
        ],
    },
    {
        label: "Kemitraan (Canvas)",
        items: [
            { href: "/app/canvas/dashboardmarketing", label: "Dashboard", icon: LayoutDashboard, roles: ["marketing"] },
            { href: "/app/canvas", label: "Canvas", icon: Workflow, roles: ["super_admin", "admin", "marketing"] },
            { href: "/app/canvas/analitikcanvas", label: "Analitik Canvas", icon: BarChart3, roles: ["super_admin", "admin"] },
        ],
    },
    {
        label: "Keuangan",
        items: [
            { href: "/app/verifikasi", label: "Verifikasi Bayar", icon: BadgeCheck, roles: ["super_admin", "admin", "admin_keuangan"] },
            { href: "/app/keuangan/verifikasi", label: "Verifikasi Setoran", icon: BadgeCheck, roles: ["super_admin", "admin", "admin_keuangan"] },
            { href: "/app/tagihan", label: "Tagihan", icon: MessageCircle, roles: ["super_admin", "admin", "admin_keuangan"] },
            { href: "/app/keuangan", label: "Setoran Sekolah", icon: BadgeCheck, roles: ["super_admin", "admin", "admin_keuangan"] },
            { href: "/app/pembayaran-instansi", label: "Pembayaran Instansi", icon: BadgeCheck, roles: ["super_admin", "admin"] },
            { href: "/app/rekening", label: "Rekening Robotiku", icon: Landmark, roles: ["super_admin", "admin", "admin_keuangan"] },
        ],
    },
    {
        label: "Data Master",
        items: [
            { href: "/app/siswa", label: "Data Siswa", icon: Users, roles: ["super_admin", "admin"] },
            { href: "/app/kelas", label: "Data Kelas", icon: BookOpen, roles: ["super_admin", "admin"] },
            { href: "/app/program", label: "Program", icon: BookMarked, roles: ["super_admin", "admin"] },
            { href: "/app/promo", label: "Kode Promo", icon: Ticket, roles: ["super_admin", "admin"] },
            { href: "/app/akun-sekolah", label: "Akun Sekolah", icon: School, roles: ["super_admin", "admin"] },
        ],
    },
    {
        label: "Konten & Website",
        items: [
            { href: "/app/artikel", label: "Artikel", icon: Newspaper, roles: ["super_admin", "admin"] },
            { href: "/app/landing", label: "Landing CMS", icon: Globe, roles: ["super_admin", "admin"] },
        ],
    },
    {
        label: "Pengaturan",
        items: [
            { href: "/app/akun", label: "Manajemen Akun", icon: UserCog, roles: ["super_admin"] },
            { href: "/app/lokasi-kantor", label: "Lokasi Kantor", icon: MapPin, roles: ["super_admin"] },
            { href: "/app/pengaturan-wa", label: "Pengaturan WhatsApp", icon: MessageCircle, roles: ["super_admin"] },
            { href: "/app/pengaturan/ukuran-kaos", label: "Panduan Ukuran Kaos", icon: Ruler, roles: ["super_admin", "admin"] },
        ],
    },
];

/** Versi datar — dipakai BottomNav & otorisasi rute. */
export const NAV: Item[] = NAV_GROUPS.flatMap((g) => g.items);

export function navItemForPath(pathname: string): Item | null {
    let best: Item | null = null;
    for (const it of NAV) {
        if (pathname === it.href || pathname.startsWith(it.href + "/")) {
            if (!best || it.href.length > best.href.length) best = it;
        }
    }
    return best;
}