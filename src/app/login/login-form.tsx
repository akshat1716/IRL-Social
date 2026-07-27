"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import Image from "next/image";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();

    if (mode === "signup") {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name: email.split("@")[0] },
        },
      });
      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }
    }

    router.push(redirect);
    router.refresh();
  };

  return (
    <div className="flex min-h-[80vh] flex-col justify-center space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-white/60 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to app
      </Link>

      <div className="flex flex-col items-center text-center space-y-3">
        <div className="relative group">
          {/* Ambient colorful glow backdrop */}
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 opacity-70 blur-lg transition duration-500 group-hover:opacity-100" />
          <div className="relative h-20 w-20 overflow-hidden rounded-2xl border border-white/20 bg-black p-1 shadow-2xl">
            <Image
              src="/logo.jpg"
              alt="IRL Logo"
              width={80}
              height={80}
              className="h-full w-full object-cover rounded-xl"
              priority
            />
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            {mode === "signin" ? "Welcome back to IRL" : "Join the IRL Squad"}
          </h1>
          <p className="text-sm text-white/50 mt-1">
            Sign in to access passes, partner tools, and scanner
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <Button className="w-full" type="submit" disabled={loading}>
          {loading
            ? "Loading..."
            : mode === "signin"
              ? "Sign In"
              : "Create Account"}
        </Button>
      </form>

      <button
        type="button"
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        className="text-center text-sm text-white/50 hover:text-white"
      >
        {mode === "signin"
          ? "Don't have an account? Sign up"
          : "Already have an account? Sign in"}
      </button>
    </div>
  );
}
