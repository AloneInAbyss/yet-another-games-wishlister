import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Footer } from "@/components/Footer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Absolute base for preview images and links. On Vercel this is the production domain
// (the custom one, once configured); locally it falls back to localhost.
const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

const description =
  "Monte sua lista de desejos de jogos com preços da Steam atualizados, filtros de verdade e um link para mandar aos amigos.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "YAGW · Yet Another Games Wishlister",
  description,
  openGraph: {
    siteName: "YAGW",
    title: "YAGW · Yet Another Games Wishlister",
    description,
    locale: "pt_BR",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <Footer />
      </body>
    </html>
  );
}
