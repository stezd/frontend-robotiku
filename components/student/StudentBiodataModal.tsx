"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, User, Users, AlertCircle, Save } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ShirtSizeGuide } from "@/components/ui/shirt-size-guide";
import { api, apiError, type ApiEnvelope } from "@/lib/api";

export interface StudentBiodataInitial {
    id: number;
    name: string;
    student_code?: string;
    gender: "L" | "P";
    birth_date?: string | null;
    shirt_size?: string | null;
    school_origin?: string | null;
    school_grade?: string | null;
    address?: string | null;
    allergy_notes?: string | null;
    photo_permission?: boolean;
    program_id?: number | null;
    parent?: {
        name?: string | null;
        phone?: string | null;
        greeting?: string | null;
        phone_alt?: string | null;
    } | null;
}

export interface StudentBiodataModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    student: StudentBiodataInitial | null;
    endpoint: string; // e.g. `/siswa/${student.id}` or `/sekolah/murid/${student.id}`
    onSuccess?: () => void;
}

const COMMON_SHIRT_SIZES = [
    "S",
    "M",
    "L",
    "XL",
    "XXL",
    "Anak 2",
    "Anak 4",
    "Anak 6",
    "Anak 8",
    "Anak 10",
    "Anak 12",
];

export function StudentBiodataModal({
    open,
    onOpenChange,
    student,
    endpoint,
    onSuccess,
}: StudentBiodataModalProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto p-0">
                <DialogHeader className="border-b px-6 py-4">
                    <DialogTitle className="flex items-center gap-2 text-lg">
                        <User className="h-5 w-5 text-primary" />
                        Edit Biodata Murid &amp; Wali
                    </DialogTitle>
                    <DialogDescription>
                        Perbarui rincian identitas murid dan data kontak orang tua / wali.
                        {student?.student_code && (
                            <span className="ml-1 font-mono font-medium text-foreground">
                                ({student.student_code})
                            </span>
                        )}
                    </DialogDescription>
                </DialogHeader>

                {open && student && (
                    <StudentBiodataForm
                        key={student.id}
                        student={student}
                        endpoint={endpoint}
                        onClose={() => onOpenChange(false)}
                        onSuccess={onSuccess}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}

interface StudentBiodataFormProps {
    student: StudentBiodataInitial;
    endpoint: string;
    onClose: () => void;
    onSuccess?: () => void;
}

function StudentBiodataForm({
    student,
    endpoint,
    onClose,
    onSuccess,
}: StudentBiodataFormProps) {
    const [form, setForm] = useState(() => ({
        name: student.name || "",
        gender: (student.gender === "P" ? "P" : "L") as "L" | "P",
        birth_date: student.birth_date ? student.birth_date.slice(0, 10) : "",
        shirt_size: student.shirt_size || "",
        school_origin: student.school_origin || "",
        school_grade: student.school_grade || "",
        address: student.address || "",
        allergy_notes: student.allergy_notes || "",
        photo_permission: student.photo_permission ?? true,
        program_id: student.program_id ? String(student.program_id) : "",
        parent_name: student.parent?.name || "",
        phone: student.parent?.phone || "",
        greeting: student.parent?.greeting || "ayah",
        phone_alt: student.parent?.phone_alt || "",
    }));

    const [errors, setErrors] = useState<Record<string, string[]>>({});
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const { data: programs } = useQuery({
        queryKey: ["programs"],
        queryFn: async () => (await api.get<ApiEnvelope<{ id: number; name: string }[]>>("/programs")).data.data,
        staleTime: 1000 * 60 * 10,
    });

    const mutation = useMutation({
        mutationFn: async () => {
            const payload: Record<string, unknown> = {
                name: form.name.trim(),
                gender: form.gender,
                birth_date: form.birth_date || null,
                shirt_size: form.shirt_size.trim() || null,
                school_origin: form.school_origin.trim() || null,
                school_grade: form.school_grade.trim() || null,
                address: form.address.trim() || null,
                allergy_notes: form.allergy_notes.trim() || null,
                photo_permission: form.photo_permission,
                parent_name: form.parent_name.trim() || null,
                phone: form.phone.trim() || null,
                greeting: form.greeting || null,
                phone_alt: form.phone_alt.trim() || null,
            };

            if (form.program_id) {
                payload.program_id = Number(form.program_id);
            } else {
                payload.program_id = null;
            }

            return await api.put(endpoint, payload);
        },
        onSuccess: () => {
            onClose();
            onSuccess?.();
        },
        onError: (err: unknown) => {
            const res = (err as { response?: { status?: number; data?: { errors?: Record<string, string[]>; message?: string } } })?.response;
            if (res?.status === 422 && res.data?.errors) {
                setErrors(res.data.errors);
                setErrorMessage(res.data.message || "Terdapat data yang tidak valid. Periksa kembali form.");
            } else {
                setErrorMessage(apiError(err, "Gagal memperbarui biodata. Silakan coba lagi."));
            }
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});
        setErrorMessage(null);
        mutation.mutate();
    };

    const shirtSizes = form.shirt_size && !COMMON_SHIRT_SIZES.includes(form.shirt_size)
        ? [form.shirt_size, ...COMMON_SHIRT_SIZES]
        : COMMON_SHIRT_SIZES;

    return (
        <form onSubmit={handleSubmit} className="flex flex-col">
            <div className="space-y-6 px-6 py-4">
                {errorMessage && (
                    <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{errorMessage}</span>
                    </div>
                )}

                {/* Section 1: Data Murid */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b pb-2 text-sm font-semibold text-foreground">
                        <User className="h-4 w-4 text-primary" />
                        <span>Data Pribadi Murid</span>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5 sm:col-span-2">
                            <Label htmlFor="bio-name">
                                Nama Lengkap Murid <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="bio-name"
                                required
                                placeholder="Masukkan nama lengkap murid"
                                value={form.name}
                                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                            />
                            {errors.name && (
                                <p className="text-xs text-destructive">{errors.name[0]}</p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="bio-gender">
                                Jenis Kelamin <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={form.gender}
                                onValueChange={(v) => setForm((f) => ({ ...f, gender: (v as "L" | "P") || "L" }))}
                            >
                                <SelectTrigger id="bio-gender">
                                    <SelectValue placeholder="Pilih jenis kelamin" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="L">Laki-laki</SelectItem>
                                    <SelectItem value="P">Perempuan</SelectItem>
                                </SelectContent>
                            </Select>
                            {errors.gender && (
                                <p className="text-xs text-destructive">{errors.gender[0]}</p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="bio-birth-date">Tanggal Lahir</Label>
                            <Input
                                id="bio-birth-date"
                                type="date"
                                value={form.birth_date}
                                onChange={(e) => setForm((f) => ({ ...f, birth_date: e.target.value }))}
                            />
                            {errors.birth_date && (
                                <p className="text-xs text-destructive">{errors.birth_date[0]}</p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="bio-shirt">Ukuran Kaos</Label>
                                <ShirtSizeGuide className="!px-2 !py-0.5 !text-xs font-semibold" />
                            </div>
                            <Select
                                value={form.shirt_size}
                                onValueChange={(v) => setForm((f) => ({ ...f, shirt_size: v ?? "" }))}
                            >
                                <SelectTrigger id="bio-shirt">
                                    <SelectValue placeholder="Pilih ukuran kaos" />
                                </SelectTrigger>
                                <SelectContent>
                                    {shirtSizes.map((sz) => (
                                        <SelectItem key={sz} value={sz}>
                                            {sz}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.shirt_size && (
                                <p className="text-xs text-destructive">{errors.shirt_size[0]}</p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="bio-program">Program Kursus</Label>
                            <Select
                                value={form.program_id}
                                onValueChange={(v) => setForm((f) => ({ ...f, program_id: v ?? "" }))}
                            >
                                <SelectTrigger id="bio-program">
                                    <SelectValue placeholder="Pilih program (opsional)" />
                                </SelectTrigger>
                                <SelectContent>
                                    {programs?.map((p) => (
                                        <SelectItem key={p.id} value={String(p.id)}>
                                            {p.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.program_id && (
                                <p className="text-xs text-destructive">{errors.program_id[0]}</p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="bio-school-origin">Asal Sekolah</Label>
                            <Input
                                id="bio-school-origin"
                                placeholder="Contoh: SD IT Bawamai"
                                value={form.school_origin}
                                onChange={(e) => setForm((f) => ({ ...f, school_origin: e.target.value }))}
                            />
                            {errors.school_origin && (
                                <p className="text-xs text-destructive">{errors.school_origin[0]}</p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="bio-school-grade">Kelas Sekolah</Label>
                            <Input
                                id="bio-school-grade"
                                placeholder="Contoh: 3 SD / Kelas 4"
                                value={form.school_grade}
                                onChange={(e) => setForm((f) => ({ ...f, school_grade: e.target.value }))}
                            />
                            {errors.school_grade && (
                                <p className="text-xs text-destructive">{errors.school_grade[0]}</p>
                            )}
                        </div>

                        <div className="space-y-1.5 sm:col-span-2">
                            <Label htmlFor="bio-address">Alamat Tempat Tinggal</Label>
                            <Textarea
                                id="bio-address"
                                rows={2}
                                placeholder="Alamat domisili murid saat ini"
                                value={form.address}
                                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                            />
                            {errors.address && (
                                <p className="text-xs text-destructive">{errors.address[0]}</p>
                            )}
                        </div>

                        <div className="space-y-1.5 sm:col-span-2">
                            <Label htmlFor="bio-allergy">Catatan Alergi / Medis</Label>
                            <Input
                                id="bio-allergy"
                                placeholder="Contoh: Alergi debu, asma (kosongkan bila tidak ada)"
                                value={form.allergy_notes}
                                onChange={(e) => setForm((f) => ({ ...f, allergy_notes: e.target.value }))}
                            />
                            {errors.allergy_notes && (
                                <p className="text-xs text-destructive">{errors.allergy_notes[0]}</p>
                            )}
                        </div>

                        <div className="sm:col-span-2">
                            <div className="flex items-start gap-3 rounded-lg border p-3 text-sm transition hover:bg-muted/30">
                                <Checkbox
                                    id="bio-photo-perm"
                                    checked={form.photo_permission}
                                    onCheckedChange={(c) =>
                                        setForm((f) => ({ ...f, photo_permission: Boolean(c) }))
                                    }
                                />
                                <div className="leading-snug">
                                    <Label htmlFor="bio-photo-perm" className="cursor-pointer font-medium text-foreground">
                                        Izin Dokumentasi Foto &amp; Video
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                        Mengizinkan kegiatan ananda didokumentasikan untuk laporan pembelajaran &amp; publikasi resmi.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section 2: Data Orang Tua / Wali */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b pb-2 text-sm font-semibold text-foreground">
                        <Users className="h-4 w-4 text-primary" />
                        <span>Data Orang Tua / Wali</span>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="bio-greeting">Sapaan Wali</Label>
                            <Select
                                value={form.greeting}
                                onValueChange={(v) => setForm((f) => ({ ...f, greeting: v ?? "ayah" }))}
                            >
                                <SelectTrigger id="bio-greeting">
                                    <SelectValue placeholder="Pilih sapaan" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ayah">Ayah</SelectItem>
                                    <SelectItem value="bunda">Bunda</SelectItem>
                                </SelectContent>
                            </Select>
                            {errors.greeting && (
                                <p className="text-xs text-destructive">{errors.greeting[0]}</p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="bio-parent-name">Nama Orang Tua / Wali</Label>
                            <Input
                                id="bio-parent-name"
                                placeholder="Nama lengkap orang tua / wali"
                                value={form.parent_name}
                                onChange={(e) => setForm((f) => ({ ...f, parent_name: e.target.value }))}
                            />
                            {errors.parent_name && (
                                <p className="text-xs text-destructive">{errors.parent_name[0]}</p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="bio-phone">No. WhatsApp Utama</Label>
                            <Input
                                id="bio-phone"
                                placeholder="08xxxxxxxxxx"
                                value={form.phone}
                                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                            />
                            {errors.phone && (
                                <p className="text-xs text-destructive">{errors.phone[0]}</p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="bio-phone-alt">No. Telepon Alternatif / Darurat</Label>
                            <Input
                                id="bio-phone-alt"
                                placeholder="Nomor kontak darurat kedua (opsional)"
                                value={form.phone_alt}
                                onChange={(e) => setForm((f) => ({ ...f, phone_alt: e.target.value }))}
                            />
                            {errors.phone_alt && (
                                <p className="text-xs text-destructive">{errors.phone_alt[0]}</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <DialogFooter className="border-t bg-muted/20 px-6 py-4">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={mutation.isPending}
                >
                    Batal
                </Button>
                <Button type="submit" disabled={mutation.isPending}>
                    {mutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Save className="mr-2 h-4 w-4" />
                    )}
                    Simpan Perubahan
                </Button>
            </DialogFooter>
        </form>
    );
}
