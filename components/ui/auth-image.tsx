"use client";

import { useEffect, useState } from "react";
import { protectedMediaUrl } from "@/lib/media";

export function AuthImage({ path, alt, className }: { path: string | null; alt?: string; className?: string }) {
    const [url, setUrl] = useState<string | null>(null);
    useEffect(() => {
        if (!path) { setUrl(null); return; }
        let obj: string | null = null; let active = true;
        protectedMediaUrl(path)
            .then((u) => { if (active) { obj = u; setUrl(u); } })
            .catch(() => { });
        return () => { active = false; if (obj) URL.revokeObjectURL(obj); };
    }, [path]);

    if (!url) return <div className={`${className ?? ""} animate-pulse bg-muted`} />;
    return <img src={url} alt={alt} className={className} />;
}