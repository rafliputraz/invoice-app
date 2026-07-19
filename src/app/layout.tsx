import type { Metadata } from "next";
import "./globals.css";

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
      <body className="antialiased">{children}</body>
    </html>
  );
}
