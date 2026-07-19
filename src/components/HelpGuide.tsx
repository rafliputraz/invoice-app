"use client";

import { useEffect, useState } from "react";

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
        {n}
      </span>
      <span>{children}</span>
    </li>
  );
}

function GuideSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold text-gray-800">{title}</h3>
      <div className="space-y-2 text-sm text-gray-600">{children}</div>
    </section>
  );
}

function Badge({ tone, children }: { tone: "green" | "amber" | "red" | "gray"; children: React.ReactNode }) {
  const cls = {
    green: "bg-green-100 text-green-700",
    amber: "bg-amber-100 text-amber-700",
    red: "bg-red-100 text-red-700",
    gray: "bg-gray-100 text-gray-500",
  }[tone];
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {children}
    </span>
  );
}

export default function HelpGuide() {
  const [open, setOpen] = useState(false);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Panduan penggunaan aplikasi"
        className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
      >
        ? Panduan
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h2 className="text-base font-bold text-gray-800">
                  Panduan Penggunaan
                </h2>
                <p className="text-xs text-gray-500">
                  Cara memakai aplikasi invoice SFL dengan benar
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                title="Tutup"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6 overflow-y-auto px-6 py-5">
              <GuideSection title="1. Membuat invoice baru">
                <ol className="space-y-1.5">
                  <Step n={1}>
                    Klik tombol <b>+ New Invoice</b> di kanan atas.
                  </Step>
                  <Step n={2}>
                    Nomor invoice terisi <b>otomatis</b> mengikuti tanggal —
                    tidak perlu (dan tidak bisa) diketik manual.
                  </Step>
                  <Step n={3}>
                    Isi data customer (<i>Invoice to</i>), detail shipment, dan
                    rincian biaya (<i>Charges</i>). Untuk item USD, jangan lupa
                    isi <b>Exchange rate</b> agar konversi IDR-nya benar.
                  </Step>
                  <Step n={4}>
                    Isi <b>Payment due (days)</b> = jangka waktu pembayaran
                    dalam hari (mis. 7, 14, 40) sesuai kesepakatan dengan
                    customer. <b>Kosongkan jika customer bayar langsung</b> —
                    invoice tanpa termin tidak akan masuk hitungan telat.
                  </Step>
                  <Step n={5}>
                    Klik <b>Save</b>. Invoice tersimpan dan mendapat nomor
                    final.
                  </Step>
                </ol>
              </GuideSection>

              <GuideSection title="2. Print / kirim PDF">
                <p>
                  Buka invoice lalu klik <b>Print / PDF</b>, atau langsung klik
                  tombol <b>Print</b> di baris tabel halaman depan (dialog
                  print terbuka otomatis). Untuk menyimpan sebagai PDF, pilih
                  &ldquo;Save as PDF&rdquo; pada pilihan printer. Pilih desain
                  lewat menu <i>Template</i> di dalam editor.
                </p>
              </GuideSection>

              <GuideSection title="3. Menandai pembayaran (Paid / Unpaid)">
                <p>
                  Setiap invoice baru berstatus{" "}
                  <Badge tone="amber">Unpaid</Badge>. Saat pembayaran dari
                  customer masuk, klik badge status di tabel lalu pilih{" "}
                  <Badge tone="green">Paid</Badge>. Ini penting supaya kartu{" "}
                  <b>Outstanding</b> dan <b>Overdue</b> di halaman depan selalu
                  akurat.
                </p>
              </GuideSection>

              <GuideSection title="4. Membaca reminder jatuh tempo">
                <p>Kolom Due di tabel menunjukkan umur tagihan:</p>
                <ul className="space-y-1.5">
                  <li>
                    <Badge tone="gray">sisa 25 hr</Badge> — masih jauh dari
                    jatuh tempo.
                  </li>
                  <li>
                    <Badge tone="amber">3 hr lagi</Badge> — jatuh tempo sudah
                    dekat (≤ 7 hari), siap-siap follow up.
                  </li>
                  <li>
                    <Badge tone="red">telat 12 hr</Badge> — sudah lewat jatuh
                    tempo, <b>segera tagih customer</b>. Baris ini juga diberi
                    latar merah dan dijumlahkan di kartu <b>Overdue</b>.
                  </li>
                </ul>
                <p>
                  Gunakan filter status <b>Overdue</b> untuk melihat semua
                  tagihan yang harus dikejar sekaligus.
                </p>
              </GuideSection>

              <GuideSection title="5. Mencari & menyaring invoice">
                <p>
                  Ketik nomor invoice atau nama customer di kotak pencarian.
                  Gunakan dropdown <b>bulan</b> dan <b>status</b> untuk
                  menyaring, dan klik judul kolom (Invoice No, Date, Total,
                  Due, dsb.) untuk mengurutkan. Kartu ringkasan di atas selalu
                  menghitung <b>semua</b> invoice, tidak terpengaruh filter.
                </p>
              </GuideSection>

              <GuideSection title="6. Mengedit & menghapus">
                <p>
                  Klik nomor invoice untuk membuka dan mengeditnya — nomor
                  invoice tidak akan berubah meski tanggal diedit. Tombol{" "}
                  <b>Delete</b> menghapus permanen; gunakan hanya untuk invoice
                  yang salah input, bukan yang batal (invoice batal cukup
                  dibiarkan Unpaid atau diberi label COPY).
                </p>
              </GuideSection>

              <GuideSection title="7. Akun pengguna (khusus admin)">
                <p>
                  Admin dapat menambah/menghapus akun tim lewat menu{" "}
                  <b>Users</b>. Setiap orang sebaiknya punya akun sendiri agar
                  kolom <b>By</b> mencatat siapa pembuat tiap invoice.
                </p>
              </GuideSection>

              <div className="rounded-lg bg-blue-50 px-4 py-3 text-xs text-blue-700">
                <b>Tips:</b> biasakan tiga hal — isi termin sesuai kesepakatan,
                tandai Paid begitu pembayaran masuk, dan cek kartu Overdue
                setiap pagi. Dengan itu halaman depan selalu jadi daftar tagihan
                yang akurat.
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
