import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  User,
  ScanLine,
  Building2,
  ChevronRight,
  LogOut,
  Pencil,
} from "lucide-react";
import { getCurrentUser, signOut } from "@/lib/actions/auth";
import Image from "next/image";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const currentUser = await getCurrentUser();

  const portalLinks = [
    {
      href: "/scanner",
      label: "Door Scanner",
      description: "Scan passes at entry",
      icon: ScanLine,
      color: "text-cyan-400",
    },
    {
      href: "/partner",
      label: "Partner Portal",
      description: "Manage events & analytics",
      icon: Building2,
      color: "text-violet-400",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-white">Profile</h1>
        {currentUser && (
          <Link
            href="/profile/edit"
            className="flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1.5 text-xs font-semibold text-purple-300 hover:bg-purple-500/20 hover:text-white transition-all"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit Profile
          </Link>
        )}
      </div>

      <Card className="overflow-hidden border border-white/10 bg-zinc-900/60">
        <CardContent className="flex items-center gap-4 p-5">
          <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-gradient-to-br from-purple-500 to-pink-500 shadow-md">
            {currentUser?.avatar_url ? (
              <Image
                src={currentUser.avatar_url}
                alt={currentUser.name}
                fill
                className="object-cover"
              />
            ) : (
              <User className="h-8 w-8 text-white" />
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-white">
              {currentUser ? currentUser.name : "Guest User"}
            </h2>
            <p className="text-sm text-white/50">
              {currentUser ? currentUser.email : "Not signed in"}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant="lime" className="uppercase">
                {currentUser ? currentUser.role : "Guest"}
              </Badge>
              {currentUser?.phone && (
                <span className="text-xs text-white/40">
                  {currentUser.phone}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-white/40">Staff & Partner</h3>
        {portalLinks.map(({ href, label, description, icon: Icon, color }) => (
          <Link key={href} href={href}>
            <Card className="transition-all hover:border-white/20 hover:bg-white/[0.07]">
              <CardContent className="flex items-center gap-4 p-4">
                <Icon className={`h-6 w-6 ${color}`} />
                <div className="flex-1">
                  <p className="font-semibold text-white">{label}</p>
                  <p className="text-xs text-white/50">{description}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-white/30" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {currentUser ? (
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-3 text-sm text-white/50 hover:bg-white/5 hover:text-white transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </form>
      ) : (
        <Link
          href="/login"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-lime-400/30 bg-lime-400/10 py-3 text-sm font-bold text-lime-400 hover:bg-lime-400/20 transition-colors"
        >
          Sign In
        </Link>
      )}
    </div>
  );
}
