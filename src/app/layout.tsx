import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

/**
 * One family for the whole product.
 *
 * Plus Jakarta Sans was commissioned for Jakarta's own city identity, which
 * makes it a real choice for this company rather than a default reach for
 * Inter. It is friendly without being soft, and its tabular figures keep
 * columns of rupiah aligned.
 *
 * Applied on app chrome only — printed invoice templates set their own fonts
 * and are unaffected.
 */
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-jakarta",
});

export const metadata: Metadata = {
  title: "SFL Invoice",
  description: "Invoice generator for PT. Salam Fortuna Logistik",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${jakarta.variable} antialiased`}>
        {/*
          THESIS: A light, warm finance dashboard for a freight forwarder's
          receivables. White cards on a soft grey ground with real elevation,
          rounded geometry, generous spacing, and charts that do real work.
          BRAND: SFL's mark is red, so red is the brand colour — the active nav
          pill, the primary button, the hero card carrying the headline figure.
          Red also means overdue, which is fine because a status always appears
          as a pill carrying its word; colour alone never carries meaning.
          DATA: One validated status trio — settled green, open blue, overdue
          red — used identically in the donut, the monthly bars and the pills,
          so a colour means the same thing everywhere in the product.
          STORY: Open it and see the money: what is outstanding, what is late,
          what actually landed, and how collection is trending month to month.
        */}
        {children}
      </body>
    </html>
  );
}
