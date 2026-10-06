import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reviver Platform",
  description: "Reviver Academy, CMS e áreas internas da Igreja Reviver",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-PT">
      <body>{children}</body>
    </html>
  );
}
