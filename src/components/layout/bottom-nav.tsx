"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, Ticket, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/passes", label: "My Passes", icon: Ticket },
  { href: "/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  if (
    pathname.startsWith("/scanner") ||
    pathname.startsWith("/partner")
  ) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-zinc-950/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl px-4 py-2 text-xs font-medium transition-colors",
                isActive
                  ? "text-lime-400"
                  : "text-white/50 hover:text-white/80"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
