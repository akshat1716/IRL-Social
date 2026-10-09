"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
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
  const p = (profile as unknown as Record<string, any>) || {};

  return {
    id: user.id,
    email: user.email ?? p.email ?? "",
    phone: user.phone || meta.phone || "+91 8545079630",
    name: p.name || meta.name || user.email?.split("@")[0] || "User",
    role: p.role || "user",
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

  // Update auth metadata (strictly sanitized, role cannot be updated here)
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

  // Sync profile table name and avatar_url using admin client
  try {
    const adminClient = createAdminClient();
    await adminClient
      .from("profiles")
      .update({
        name: formData.name,
        avatar_url: formData.avatar_url,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
  } catch (e) {
    console.error("Profiles table sync skipped:", e);
  }

  revalidatePath("/profile");
  revalidatePath("/profile/edit");
  return { success: true };
}

/**
 * Submits a partner access application for admin review.
 * Does NOT self-promote user role.
 */
export async function requestPartnerAccess(message: string = "") {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("partner_applications").upsert(
    {
      user_id: user.id,
      message,
      status: "pending",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("Partner application error:", error.message);
    return { success: false, error: error.message };
  }

  try {
    revalidatePath("/partner");
  } catch {
    // revalidatePath skipped in test environment
  }
  return { success: true };
}

/**
 * Retrieves status of partner application for current user.
 */
export async function getPartnerApplicationStatus() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { hasApplication: false, status: null };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("partner_applications")
    .select("status")
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    hasApplication: !!data,
    status: (data?.status as "pending" | "approved" | "rejected") ?? null,
  };
}

export interface PayoutDetails {
  upi_id: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  ifsc_code: string;
  payout_preference: "upi" | "bank";
}

export async function getPayoutDetails(): Promise<PayoutDetails> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      upi_id: "",
      bank_name: "",
      account_name: "",
      account_number: "",
      ifsc_code: "",
      payout_preference: "upi",
    };
  }

  const meta = user.user_metadata || {};
  return {
    upi_id: meta.payout_upi_id || "",
    bank_name: meta.payout_bank_name || "",
    account_name: meta.payout_account_name || "",
    account_number: meta.payout_account_number || "",
    ifsc_code: meta.payout_ifsc_code || "",
    payout_preference: meta.payout_preference || "upi",
  };
}

export async function updatePayoutDetails(details: PayoutDetails) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  const { error } = await supabase.auth.updateUser({
    data: {
      payout_upi_id: details.upi_id,
      payout_bank_name: details.bank_name,
      payout_account_name: details.account_name,
      payout_account_number: details.account_number,
      payout_ifsc_code: details.ifsc_code,
      payout_preference: details.payout_preference,
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/partner");
  return { success: true };
}
