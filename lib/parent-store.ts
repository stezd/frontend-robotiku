"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type ParentSession = {
    studentId: number;
    name: string;
    studentCode: string;
    phone: string;
    /** true bila sekolah mengelola pendaftaran & pembayaran sendiri → menu Tagihan disembunyikan */
    selfManaged?: boolean;
    /** Nama sekolah / instansi jika murid terdaftar melalui sekolah mitra atau memiliki sekolah asal */
    schoolName?: string | null;
} | null;

type State = {
    parent: ParentSession;
    setParent: (p: ParentSession) => void;
    updateSchoolName: (schoolName: string | null) => void;
    clearParent: () => void;
};

export const useParent = create<State>()(
    persist(
        (set) => ({
            parent: null,
            setParent: (p) => set({ parent: p }),
            updateSchoolName: (schoolName) =>
                set((state) => ({
                    parent: state.parent ? { ...state.parent, schoolName } : null,
                })),
            clearParent: () => set({ parent: null }),
        }),
        { name: "robotiku_parent", storage: createJSONStorage(() => sessionStorage) }
    )
);