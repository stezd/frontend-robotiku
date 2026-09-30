"use client";

import { useState } from "react";
import { protectedMediaUrl } from "@/lib/media";
import { AuthImage } from "@/components/ui/auth-image";
import { FileText, ExternalLink, Loader2 } from "lucide-react";

export function ProofView({ path, className }: { path: string | null; className?: string }) {
    const [loading, setLoading] = useState(false);
    if (!path) return <div className={`${className ?? ""} grid place-items-center rounded-md border bg-muted/30 text-xs text-muted-foreground`}>Tidak ada bukti</div>;

    const isPdf = path.toLowerCase().endsWith(".pdf");
    const open = async () => {
        setLoading(true);
        try { window.open(await protectedMediaUrl(path), "_blank"); }
        finally { setLoading(false); }
    };

    if (isPdf) return (
        <button onClick={open} className={`${className ?? ""} flex flex-col items-center justify-center gap-1 rounded-md border bg-muted/30 text-xs text-muted-foreground transition hover:bg-muted`}>
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileText className="h-7 w-7" />}
            <span className="inline-flex items-center gap-1">Buka bukti (PDF) <ExternalLink className="h-3 w-3" /></span>
        </button>
    );
    return <div className={`${className ?? ""} overflow-hidden rounded-md border`}><AuthImage path={path} alt="bukti" className="h-full w-full object-cover" /></div>;
}