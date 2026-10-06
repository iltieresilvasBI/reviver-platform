import type { Metadata } from "next";
import "./globals.css";
import "./sites-exact.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://reviver-platform-gamma.vercel.app"),
  title: { default: "Igreja Reviver", template: "%s | Igreja Reviver" },
  description: "Viver. Crescer. Servir. Conheça a Igreja Reviver.",
  robots: { index: false, follow: false },
  icons: { icon: "/images/reviver-logo.png" },
  openGraph: { siteName: "Igreja Reviver", locale: "pt_PT", type: "website" },
  twitter: { card: "summary" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-PT">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Manrope:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
