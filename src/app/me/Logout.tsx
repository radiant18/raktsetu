"use client";
import { useRouter } from "next/navigation";
export default function Logout() {
  const router = useRouter();
  return <button className="btn btn-ghost text-sm" onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); router.push("/"); router.refresh(); }}>Sign out</button>;
}
