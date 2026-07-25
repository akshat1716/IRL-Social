import { Suspense } from "react";
import LoginForm from "./login-form";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[80vh] items-center justify-center text-white/40">
          Loading...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
