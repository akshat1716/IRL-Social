"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Eye, EyeOff } from "lucide-react";
import Image from "next/image";

export default function LoginForm() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  const handleModeSwitch = (newMode: "signin" | "signup") => {
    setMode(newMode);
    setError(null);
    setSuccessMessage(null);
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    if (mode === "signup") {
      if (password !== confirmPassword) {
        setError("Passwords do not match. Please retype your password.");
        setLoading(false);
        return;
      }
    }

    const supabase = createClient();

    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
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

        if (!data.session) {
          setSuccessMessage(
            "Account created! Please check your email to confirm, or sign in now."
          );
          setMode("signin");
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

      // Hard redirect to clear session state & pass cookies directly
      window.location.href = redirect;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(message);
      setLoading(false);
    }
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
        {successMessage && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

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
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {mode === "signup" && (
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Retype Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                tabIndex={-1}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <Button className="w-full" type="submit" disabled={loading}>
          {loading
            ? "Redirecting..."
            : mode === "signin"
              ? "Sign In"
              : "Create Account"}
        </Button>
      </form>

      <button
        type="button"
        onClick={() => handleModeSwitch(mode === "signin" ? "signup" : "signin")}
        className="text-center text-sm text-white/50 hover:text-white"
      >
        {mode === "signin"
          ? "Don't have an account? Sign up"
          : "Already have an account? Sign in"}
      </button>
    </div>
  );
}
