import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const jetbrainsMono = JetBrains_Mono({subsets:['latin'],variable:'--font-mono'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LUT Studio — WebGPU Color Grading",
  description:
    "Create and export 3D LUT color filters with real-time WebGPU preview. Professional color grading in your browser with curves, presets, and .cube export.",
  keywords: [
    "LUT",
    "color grading",
    "WebGPU",
    "3D LUT",
    "photo editor",
    "color correction",
    "cube export",
    "curves",
    "presets",
    "film emulation",
  ],
  openGraph: {
    title: "LUT Studio — WebGPU Color Grading",
    description:
      "Professional color grading in your browser. Create, preview, and export 3D LUTs in real time.",
    type: "website",
    locale: "en_US",
    siteName: "LUT Studio",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "LUT Studio",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0c0c0f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "dark h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-mono",
        jetbrainsMono.variable
      )}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
