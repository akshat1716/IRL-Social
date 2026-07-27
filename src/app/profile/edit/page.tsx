import { getCurrentUser } from "@/lib/actions/auth";
import { EditProfileForm } from "./edit-profile-form";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EditProfilePage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login?redirect=/profile/edit");
  }

  return <EditProfileForm initialUser={currentUser} />;
}
