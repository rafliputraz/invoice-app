"use client";

import { useEffect, useState } from "react";

const TOUR_KEY = "sfl_tour_done";
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
    title: "Cari & saring",
    body: "Ketik nomor invoice atau nama customer untuk mencari. Dropdown di kanan menyaring per bulan dan per status — pilih “Overdue” untuk melihat semua tagihan yang telat sekaligus.",
  },
  {
    target: '[data-tour="table"]',
    title: "Daftar invoice",
    body: "Klik nomor invoice untuk membuka & mengedit. Kolom Due menunjukkan jatuh tempo beserta umurnya (merah = telat). Klik badge Status untuk menandai Paid saat pembayaran masuk. Judul kolom bisa diklik untuk mengurutkan.",
  },
  {
    target: '[data-tour="new-invoice"]',
    title: "Buat invoice baru",
    body: "Mulai dari sini. Nomor invoice terisi otomatis; isi data customer, rincian biaya, dan termin pembayaran (kosongkan jika customer bayar langsung).",
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

  // Auto-start on first visit (per browser), and allow replay via event.
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    if (!localStorage.getItem(TOUR_KEY)) {
      t = setTimeout(() => setStep(0), 900); // let the page settle first
    }
    const onReplay = () => setStep(0);
    window.addEventListener(TOUR_EVENT, onReplay);
    return () => {
      if (t) clearTimeout(t);
      window.removeEventListener(TOUR_EVENT, onReplay);
    };
  }, []);

  // Measure the current step's target; skip steps whose target is missing.
  useEffect(() => {
    if (step === null) return;
    const el = document.querySelector(STEPS[step].target);
    if (!el) {
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
    localStorage.setItem(TOUR_KEY, "1");
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

  // Tooltip below the target when there is room, otherwise above.
  const tooltipW = 320;
  const below = spot.top + spot.height + 190 < window.innerHeight;
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
        style={
          below
            ? { top: spot.top + spot.height + 12, left: tooltipLeft }
            : { bottom: window.innerHeight - spot.top + 12, left: tooltipLeft }
        }
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
