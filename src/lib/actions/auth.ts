"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut({ scope: "local" });
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function getCurrentUser() {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const meta = user.user_metadata || {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = (profile as Record<string, any>) || {};

  return {
    id: user.id,
    email: user.email ?? p.email ?? "",
    phone: user.phone || meta.phone || "+91 8545079630",
    name: p.name || meta.name || user.email?.split("@")[0] || "User",
    role: p.role || meta.role || "user",
    avatar_url: p.avatar_url || meta.avatar_url || null,
    birthday: p.birthday || meta.birthday || "",
    gender: p.gender || meta.gender || "",
    anniversary: p.anniversary || meta.anniversary || "",
  };
}

export async function updateProfile(formData: {
  name: string;
  email?: string;
  avatar_url?: string | null;
  birthday?: string;
  gender?: string;
  anniversary?: string;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not logged in" };
  }

  // Update auth metadata
  const { error: updateError } = await supabase.auth.updateUser({
    data: {
      name: formData.name,
      avatar_url: formData.avatar_url,
      birthday: formData.birthday,
      gender: formData.gender,
      anniversary: formData.anniversary,
    },
  });

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // Best effort update profiles table
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("profiles") as any).upsert({
      id: user.id,
      name: formData.name,
      avatar_url: formData.avatar_url,
      updated_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Profiles table sync skipped:", e);
  }

  revalidatePath("/profile");
  revalidatePath("/profile/edit");
  return { success: true };
}
