import type { User } from "../domain/types";
import type { CreatorVerificationStatus } from "../lib/verification";
import { getSupabase } from "../lib/supabase";

export type VerificationCandidate = {
  id: string;
  displayName: string;
  email: string;
  username?: string;
  message?: string;
  requestedAt?: string;
};

export async function fetchPendingVerifications(): Promise<VerificationCandidate[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, email, username, verification_message, verification_requested_at")
    .eq("creator_verification_status", "pending")
    .order("verification_requested_at", { ascending: true });

  if (error) {
    console.warn("[verification] fetch pending", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: String(row.id),
    displayName: String(row.display_name),
    email: String(row.email ?? ""),
    username: row.username ? String(row.username) : undefined,
    message: row.verification_message ? String(row.verification_message) : undefined,
    requestedAt: row.verification_requested_at
      ? String(row.verification_requested_at)
      : undefined,
  }));
}

export async function submitCreatorVerificationRequest(
  user: User,
  message: string,
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase
    .from("profiles")
    .update({
      creator_verification_status: "pending",
      verification_message: message.trim(),
      verification_requested_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) throw new Error(error.message);
}

export async function adminResolveVerification(
  userId: string,
  status: Extract<CreatorVerificationStatus, "approved" | "rejected">,
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const patch: Record<string, unknown> = {
    creator_verification_status: status,
    updated_at: new Date().toISOString(),
  };

  if (status === "approved") {
    patch.creator_tier = "verified";
    patch.verified_at = new Date().toISOString();
    patch.verification_message = null;
  } else {
    patch.verification_message = null;
  }

  const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
  if (error) throw new Error(error.message);
}
