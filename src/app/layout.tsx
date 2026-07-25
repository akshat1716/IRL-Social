import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";
import { BottomNav } from "@/components/layout/bottom-nav";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "IRL — Social & Event Platform",
  description:
    "Discover daytime socials and nightlife experiences. Run clubs, coffee mixers, clubbing, karaoke, and more.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "IRL",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#09090b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-zinc-950 antialiased`}
      >
        <QueryProvider>
          <div className="mx-auto min-h-screen max-w-lg">
            <main className="px-4 pb-24 pt-safe-top pt-6">{children}</main>
            <BottomNav />
          </div>
        </QueryProvider>
      </body>
    </html>
  );
}
