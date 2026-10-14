import LoginCard from "@/components/LoginCard";
import { ERRORS, type ErrorCode } from "@/lib/errors";

function GradCap({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 3 1 9l11 6 9-4.9V17h2V9L12 3Z" />
      <path d="M5 13.2v3.6c0 1.7 3.1 3.2 7 3.2s7-1.5 7-3.2v-3.6l-7 3.8-7-3.8Z" />
    </svg>
  );
}

const stats = [
  { value: "100+", label: "Programs" },
  { value: "24/7", label: "Access" },
  { value: "Global", label: "Opportunities" },
];

export default async function Home({ searchParams }: PageProps<"/">) {
  const { error } = await searchParams;
  const code = typeof error === "string" && error in ERRORS ? (error as ErrorCode) : undefined;

  return (
    <main
      className="relative min-h-screen w-full overflow-hidden text-white bg-cover bg-center"
      style={{
        backgroundImage:
          "linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.6)), url(/campus.png)",
      }}
    >
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-10 sm:py-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GradCap className="h-9 w-9 sm:h-11 sm:w-11" />
            <span className="text-base font-bold uppercase tracking-[0.12em] sm:text-xl">
              University Portal
            </span>
          </div>
          <p className="hidden text-xs font-light uppercase tracking-[0.3em] sm:block">
            Learn <span className="mx-2 opacity-60">|</span> Grow{" "}
            <span className="mx-2 opacity-60">|</span> Excel
          </p>
        </header>

        <div className="flex flex-1 flex-col items-stretch justify-center gap-10 py-10 lg:flex-row lg:items-center lg:justify-between">
          <section className="flex flex-col justify-center lg:max-w-xl">
            <h1 className="font-serif text-4xl leading-tight sm:text-5xl lg:text-[56px] lg:leading-[1.12]">
              Your
              <br />
              Gateway
              <br />
              to a Brighter
              <br />
              Tomorrow.
            </h1>
            <div className="my-8 h-px w-16 bg-white/80" />
            <dl className="flex items-center">
              {stats.map((s, i) => (
                <div
                  key={s.label}
                  className={`pr-5 sm:pr-8 ${i > 0 ? "border-l border-white/40 pl-5 sm:pl-8" : ""}`}
                >
                  <dt className="text-xl font-semibold sm:text-2xl">{s.value}</dt>
                  <dd className="text-xs text-white/75 sm:text-sm">{s.label}</dd>
                </div>
              ))}
            </dl>
          </section>

          <LoginCard initialError={code} />
        </div>
      </div>
    </main>
  );
}
