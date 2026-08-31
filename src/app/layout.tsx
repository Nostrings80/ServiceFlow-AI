import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ServiceFlow AI",
  description: "Dispatch and track technicians in the field.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
