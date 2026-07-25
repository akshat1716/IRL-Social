import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  User,
  ScanLine,
  Building2,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { getCurrentUser, signOut } from "@/lib/actions/auth";

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
      <div>
        <h1 className="text-2xl font-black text-white">Profile</h1>
      </div>

      <Card>
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-lime-400 to-emerald-500">
            <User className="h-8 w-8 text-black" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              {currentUser ? currentUser.name : "Guest User"}
            </h2>
            <p className="text-sm text-white/50">
              {currentUser ? currentUser.email : "Not signed in"}
            </p>
            <Badge variant="lime" className="mt-1 uppercase">
              {currentUser ? currentUser.role : "Guest"}
            </Badge>
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
