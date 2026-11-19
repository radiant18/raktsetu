import { Suspense } from "react";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-md px-5 py-16">
      <Suspense><LoginForm /></Suspense>
    </main>
  );
}
