"use client";

import { useEffect, useRef, useState } from "react";

// Per-user key: each account sees the tour once, even when several people
// share the same browser/device.
const tourKeyFor = (userKey: string) => `sfl_tour_done:${userKey}`;
/** Fired (window event) to replay the tour, e.g. from the help popup. */
export const TOUR_EVENT = "sfl:start-tour";

interface TourStep {
  target: string; // CSS selector of the highlighted element
  title: string;
  body: string;
}

const STEPS: TourStep[] = [
  {
    target: '[data-tour="stats"]',
    title: "Kartu ringkasan",
    body: "Angka penting sekilas: jumlah & total invoice bulan ini, total yang belum dibayar (Outstanding), dan yang sudah lewat jatuh tempo (Overdue, merah) — itulah tagihan yang harus segera dikejar.",
  },
  {
    target: '[data-tour="filters"]',
    title: "Cari, saring & export",
    body: "Ketik nomor invoice atau nama customer untuk mencari. Tab di atas tabel menyaring status (All / Unpaid / Overdue / Paid), dropdown memilih bulan, dan tombol Export mengunduh rekap CSV (bisa dibuka di Excel) sesuai filter yang aktif.",
  },
  {
    target: '[data-tour="table"]',
    title: "Daftar invoice",
    body: "Klik nomor invoice untuk membuka & mengedit. Kolom Due menunjukkan jatuh tempo (merah = telat). Klik badge Status untuk menandai Paid saat pembayaran masuk. Delete memindahkan ke Trash, tidak langsung hilang.",
  },
  {
    target: '[data-tour="customers"]',
    title: "Data customer",
    body: "Rekap tagihan per customer (siapa yang paling banyak nunggak) sekaligus tempat menyimpan data customer — nama, alamat, Tax ID — supaya saat membuat invoice tinggal pilih dari dropdown.",
  },
  {
    target: '[data-tour="new-invoice"]',
    title: "Buat invoice baru",
    body: "Mulai dari sini. Nomor invoice terisi otomatis; pilih customer tersimpan dari dropdown (atau isi manual), lengkapi rincian biaya dan termin pembayaran (kosongkan jika customer bayar langsung).",
  },
  {
    target: '[data-tour="help"]',
    title: "Masih belum jelas?",
    body: "Buka tombol Panduan ini kapan saja — isinya pedoman lengkap langkah demi langkah cara memakai aplikasi dengan benar.",
  },
];

export default function GuidedTour() {
  const [step, setStep] = useState<number | null>(null); // null = tour inactive
  const [rect, setRect] = useState<DOMRect | null>(null);
  // localStorage key for the current user; set once we know who's logged in.
  const storageKey = useRef<string | null>(null);

  // Auto-start the first time THIS user opens the app, and allow replay.
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((u: { id?: number; username?: string } | null) => {
        if (cancelled) return;
        // Key by user id (fall back to username) so each account is tracked
        // separately; if we can't identify the user, don't auto-start.
        const key = u?.id ?? u?.username;
        if (key === undefined || key === null) return;
        storageKey.current = tourKeyFor(String(key));
        if (!localStorage.getItem(storageKey.current)) {
          t = setTimeout(() => setStep(0), 900); // let the page settle first
        }
      })
      .catch(() => {});

    const onReplay = () => setStep(0);
    window.addEventListener(TOUR_EVENT, onReplay);
    return () => {
      cancelled = true;
      if (t) clearTimeout(t);
      window.removeEventListener(TOUR_EVENT, onReplay);
    };
  }, []);

  // Measure the current step's target; skip steps whose target is missing.
  useEffect(() => {
    if (step === null) return;
    const el = document.querySelector(STEPS[step].target);
    // Skip steps whose target is missing or hidden (e.g. sidebar on mobile).
    const r = el?.getBoundingClientRect();
    if (!el || !r || (r.width === 0 && r.height === 0)) {
      setStep((s) =>
        s !== null && s + 1 < STEPS.length ? s + 1 : null
      );
      return;
    }
    el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    const measure = () => setRect(el.getBoundingClientRect());
    measure();
    const t = setTimeout(measure, 350); // re-measure after smooth scroll
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [step]);

  const finish = () => {
    if (storageKey.current) localStorage.setItem(storageKey.current, "1");
    setStep(null);
    setRect(null);
  };

  if (step === null || !rect) return null;

  const pad = 6;
  const spot = {
    top: rect.top - pad,
    left: rect.left - pad,
    width: rect.width + pad * 2,
    height: rect.height + pad * 2,
  };

  // Keep the tooltip fully on-screen even when the target is taller than the
  // viewport (e.g. a long invoice table): anchor to the visible slice of the
  // target and clamp into the viewport so it never scrolls off-screen.
  const vpH = window.innerHeight;
  const gap = 12;
  const tipH = 250; // generous height estimate used only for clamping
  const tooltipW = 320;
  const visTop = Math.max(spot.top, 8);
  const visBottom = Math.min(spot.top + spot.height, vpH - 8);
  let tooltipTop: number;
  if (visBottom + gap + tipH <= vpH - 8) {
    tooltipTop = visBottom + gap; // below the visible part of the target
  } else if (visTop - gap - tipH >= 8) {
    tooltipTop = visTop - gap - tipH; // above it
  } else {
    tooltipTop = vpH - tipH - 12; // target fills the screen → pin near bottom
  }
  tooltipTop = Math.max(8, Math.min(tooltipTop, vpH - tipH - 8));
  const tooltipLeft = Math.min(
    Math.max(spot.left, 16),
    Math.max(16, window.innerWidth - tooltipW - 16)
  );

  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true">
      {/* Spotlight: transparent hole + huge shadow darkens everything else. */}
      <div
        className="absolute rounded-lg transition-all duration-300"
        style={{
          top: spot.top,
          left: spot.left,
          width: spot.width,
          height: spot.height,
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.65)",
        }}
      />
      <div
        className="absolute w-80 rounded-xl bg-white p-4 shadow-2xl transition-all duration-300"
        style={{ top: tooltipTop, left: tooltipLeft }}
      >
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-800">
            {STEPS[step].title}
          </h3>
          <span className="text-xs text-gray-400">
            {step + 1}/{STEPS.length}
          </span>
        </div>
        <p className="mb-3 text-xs leading-relaxed text-gray-600">
          {STEPS[step].body}
        </p>
        <div className="flex items-center justify-between">
          <button
            onClick={finish}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Lewati
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
              >
                Kembali
              </button>
            )}
            <button
              onClick={() => (isLast ? finish() : setStep(step + 1))}
              className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
            >
              {isLast ? "Selesai" : "Lanjut"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
