"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/lib/actions/auth";
import { Input, Label } from "@/components/ui/input";
import {
  ChevronLeft,
  Pencil,
  Info,
  ChevronDown,
  User as UserIcon,
  CheckCircle2,
} from "lucide-react";
import Image from "next/image";

interface EditProfileFormProps {
  initialUser: {
    id: string;
    email: string;
    phone: string;
    name: string;
    avatar_url: string | null;
    birthday?: string | null;
    gender?: string | null;
    anniversary?: string | null;
  };
}

const PRESET_AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
];

export function EditProfileForm({ initialUser }: EditProfileFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialUser.name || "");
  const [email, setEmail] = useState(initialUser.email || "");
  const [phone] = useState(initialUser.phone || "+91 8545079630");
  const [birthday, setBirthday] = useState(initialUser.birthday || "");
  const [gender, setGender] = useState(initialUser.gender || "");
  const [anniversary, setAnniversary] = useState(initialUser.anniversary || "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    initialUser.avatar_url || null
  );
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate completed steps out of 4 (Name, Phone, Email, Birthday)
  const stepsDone = [
    Boolean(name.trim()),
    Boolean(phone.trim()),
    Boolean(email.trim()),
    Boolean(birthday.trim()),
  ].filter(Boolean).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const res = await updateProfile({
      name,
      email,
      avatar_url: avatarUrl,
      birthday,
      gender,
      anniversary,
    });

    setLoading(false);

    if (res.success) {
      setSuccess(true);
      setTimeout(() => {
        router.push("/profile");
        router.refresh();
      }, 1000);
    } else {
      setError(res.error || "Failed to update profile");
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/profile"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white transition-all"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-white">Edit Profile</h1>
      </div>

      {success && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-400">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>Profile updated successfully! Redirecting...</span>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Card 1: Basic information */}
        <div className="rounded-3xl border border-white/10 bg-zinc-900/70 p-5 space-y-5">
          <h2 className="text-base font-bold text-white">Basic information</h2>

          {/* Progress Step Bar */}
          <div className="space-y-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full bg-purple-400 transition-all duration-300"
                style={{ width: `${(stepsDone / 4) * 100}%` }}
              />
            </div>
            <p className="text-xs font-medium text-purple-300">
              {stepsDone} / 4 steps done
            </p>
          </div>

          <hr className="border-white/10" />

          {/* Profile Photo Avatar Section */}
          <div className="flex flex-col items-center justify-center space-y-2 py-2">
            <div className="relative group">
              <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-white/20 bg-zinc-800 shadow-xl">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt="Profile Avatar"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <UserIcon className="h-12 w-12 text-zinc-500" />
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-zinc-800 text-white shadow-lg hover:bg-zinc-700 transition-transform active:scale-95"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowAvatarPicker(!showAvatarPicker)}
              className="text-xs font-medium text-white/70 hover:text-white transition-colors"
            >
              {avatarUrl ? "Change profile photo" : "Add a profile photo"}
            </button>

            {/* Quick Avatar Preset Selection */}
            {showAvatarPicker && (
              <div className="mt-3 rounded-2xl border border-white/10 bg-zinc-950 p-3 text-center space-y-2">
                <p className="text-xs text-white/50">Choose an avatar preset</p>
                <div className="flex justify-center gap-3">
                  {PRESET_AVATARS.map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setAvatarUrl(url);
                        setShowAvatarPicker(false);
                      }}
                      className="relative h-12 w-12 overflow-hidden rounded-full border border-white/20 hover:scale-110 transition-transform"
                    >
                      <Image
                        src={url}
                        alt={`Preset ${idx + 1}`}
                        fill
                        className="object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium text-white/80">
              Name
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-2xl border-white/10 bg-zinc-950/80 py-3 text-white placeholder:text-white/30 focus:border-purple-400"
              required
            />
          </div>

          {/* Phone Number Field */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-medium text-white/80">
              Phone number
            </Label>
            <Input
              id="phone"
              type="text"
              value={phone}
              readOnly
              className="rounded-2xl border-white/10 bg-zinc-950/50 py-3 text-white/60 cursor-not-allowed"
            />
            <div className="flex items-start gap-2 pt-1 text-xs text-white/40">
              <Info className="h-4 w-4 shrink-0 text-white/40" />
              <span>The phone number associated with your account cannot be modified</span>
            </div>
          </div>

          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-white/80">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-2xl border-white/10 bg-zinc-950/80 py-3 text-white placeholder:text-white/30 focus:border-purple-400"
              required
            />
          </div>

          {/* Birthday Field */}
          <div className="space-y-2">
            <Label htmlFor="birthday" className="text-sm font-medium text-white/80">
              Birthday
            </Label>
            <Input
              id="birthday"
              type="text"
              placeholder="DD / MM / YY"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              className="rounded-2xl border-white/10 bg-zinc-950/80 py-3 text-white placeholder:text-white/30 focus:border-purple-400"
            />
          </div>
        </div>

        {/* Card 2: Additional details (optional) */}
        <div className="rounded-3xl border border-white/10 bg-zinc-900/70 p-5 space-y-5">
          <h2 className="text-base font-bold text-white">
            Additional details (optional)
          </h2>

          {/* Gender Select Dropdown */}
          <div className="space-y-2">
            <Label htmlFor="gender" className="text-sm font-medium text-white/80">
              Gender
            </Label>
            <div className="relative">
              <select
                id="gender"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full appearance-none rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-3 text-sm text-white focus:border-purple-400 focus:outline-none"
              >
                <option value="" disabled className="bg-zinc-900 text-white/40">
                  Select
                </option>
                <option value="Male" className="bg-zinc-900 text-white">
                  Male
                </option>
                <option value="Female" className="bg-zinc-900 text-white">
                  Female
                </option>
                <option value="Non-binary" className="bg-zinc-900 text-white">
                  Non-binary
                </option>
                <option value="Prefer not to say" className="bg-zinc-900 text-white">
                  Prefer not to say
                </option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
            </div>
          </div>

          {/* Anniversary Field */}
          <div className="space-y-2">
            <Label htmlFor="anniversary" className="text-sm font-medium text-white/80">
              Anniversary
            </Label>
            <Input
              id="anniversary"
              type="text"
              placeholder="DD / MM / YY"
              value={anniversary}
              onChange={(e) => setAnniversary(e.target.value)}
              className="rounded-2xl border-white/10 bg-zinc-950/80 py-3 text-white placeholder:text-white/30 focus:border-purple-400"
            />
          </div>
        </div>

        {/* Bottom CTA Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-zinc-800 py-4 text-center text-sm font-bold text-white shadow-xl hover:bg-zinc-700 active:scale-[0.99] transition-all disabled:opacity-50"
        >
          {loading ? "Updating..." : "Update profile"}
        </button>
      </form>
    </div>
  );
}
