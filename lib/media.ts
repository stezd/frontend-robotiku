import { api } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL || "";
/** URL gambar publik (QRIS/artikel/landing) untuk <img src>. */
export const publicMediaUrl = (p?: string | null) => (p ? `${API}/api/v1/public-media/${p}` : null);

/**
 * Ambil URL file terproteksi (butuh Bearer token) dari endpoint yang memakai
 * MediaStorage::response() di backend (mis. /media/..., /bayar/payments/{id}/proof).
 *
 * PENTING: jangan fetch blob lewat `api.get(...)` biasa — backend merespons
 * 302 redirect ke presigned URL R2/S3, dan browser mengubah Origin menjadi
 * "null" setelah redirect cross-origin sehingga kena blokir CORS R2.
 *
 * Cara kerja helper ini (satu request, dua skenario):
 * - Cloud (R2/S3): backend mengembalikan JSON { url } (mode ?json=1) →
 *   pakai presigned URL langsung di <img src> / window.open (bebas CORS).
 * - Local disk (dev): backend men-stream file → kembalikan object URL blob.
 *
 * `mime` diambil dari blob (local) atau ditebak dari ekstensi file (cloud).
 */
export async function protectedFileUrl(endpoint: string): Promise<{ url: string; mime: string }> {
    const r = await api.get(endpoint, {
        params: { json: 1 },
        responseType: "blob",
    });
    const blob = r.data as Blob;
    if (blob.type.includes("application/json")) {
        const data = JSON.parse(await blob.text());
        const url: string | undefined = data?.url ?? data?.data?.url;
        if (!url) throw new Error("URL media tidak tersedia.");
        const ext = url.split("?")[0].split(".").pop()?.toLowerCase() ?? "";
        return { url, mime: ext === "pdf" ? "application/pdf" : ext ? `image/${ext}` : "" };
    }
    return { url: URL.createObjectURL(blob), mime: blob.type };
}

/** Shortcut untuk endpoint /media/{path}. */
export async function protectedMediaUrl(path: string): Promise<string> {
    return (await protectedFileUrl(`/media/${path}`)).url;
}