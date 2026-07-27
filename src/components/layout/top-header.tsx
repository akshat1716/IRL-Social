"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";

export function TopHeader() {
  const pathname = usePathname();

  // Hide top header on scanner page to preserve full camera view
  if (pathname.startsWith("/scanner")) {
    return null;
  }

  return (
    <header className="sticky top-0 z-30 mb-4 border-b border-white/10 bg-zinc-950/80 backdrop-blur-xl transition-all">
      <div className="flex items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative h-9 w-9 overflow-hidden rounded-xl border border-white/15 bg-black shadow-md shadow-purple-500/20 group-hover:scale-105 transition-transform">
            <Image
              src="/logo.jpg"
              alt="IRL Logo"
              fill
              className="object-cover"
              priority
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-black tracking-wider text-white">
                IRL
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-lime-400 animate-pulse" />
            </div>
            <p className="text-[10px] font-medium tracking-wide uppercase text-white/50">
              In Real Life
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/partner"
            className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/70 hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-white transition-all"
          >
            <Sparkles className="h-3.5 w-3.5 text-violet-400" />
            <span>Partner</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
