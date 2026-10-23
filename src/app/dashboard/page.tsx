import { redirect } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import { getSession } from "@/lib/auth";

// After signing in, everyone lands here and is sent to their CafeConnect area.
const AREA: Record<string, string> = {
  student: "/student/dashboard",
  faculty: "/student/dashboard",
  staff: "/staff/dashboard",
  admin: "/admin/dashboard",
};

export default async function Dashboard({ searchParams }: PageProps<"/dashboard">) {
  const s = await getSession();
  if (!s) redirect("/?error=SESSION_EXPIRED");
  // "noaccess" comes back from a cafe page that refused this account; show the notice instead of looping.
  const { noaccess } = await searchParams;
  if (!noaccess && AREA[s.role]) redirect(AREA[s.role]);

  const isStudent = s.role === "student";
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-4 sm:px-8 dark:border-zinc-800 dark:bg-zinc-900">
        <span className="font-bold uppercase tracking-[0.12em]">University Portal</span>
        <LogoutButton />
      </header>
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-8">
        <h1 className="text-3xl font-semibold sm:text-4xl">Welcome, {s.name} 👋</h1>
        <p role="alert" className="mt-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Your CafeConnect account isn&apos;t available. It may not be set up yet or may have been deactivated. Please
          contact the canteen admin.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
          <span className="rounded-full bg-sky-100 px-3 py-1 font-medium capitalize text-sky-800 dark:bg-sky-900/40 dark:text-sky-200">
            {s.role}
          </span>
          <span>{isStudent ? "Enrollment No." : "ID"} {s.enrollmentNo}</span>
        </div>
      </main>
    </div>
  );
}
