import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "busbnb — Book Your Perfect Bus",
  description: "Airbnb-style bus booking across Kenya",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
