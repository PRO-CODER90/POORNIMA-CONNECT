import PartnerBrand from '@/cafe/components/student/PartnerBrand';
import { ArchPhoto, EdgeFlowers, PalaceSketch, SkySketch, StreetLamp } from '@/cafe/components/student/HeroScene';

/** Student dashboard banner: welcome text on the left, flower-framed campus arch on the right. */
export default function DashboardHero({ name, studentCode }: { name: string; studentCode: string }) {
  return (
    <>
    {/* Hero: full-bleed banner (breaks out of the page container to the viewport edges) */}
    <section
      aria-label="Welcome"
      className="relative isolate -mt-4 mx-[calc(50%-50vw)] overflow-hidden bg-[linear-gradient(115deg,#fdf3e7_0%,#fcebdc_55%,#fbe3d3_100%)]"
    >
      <SkySketch className="pointer-events-none absolute left-[3%] top-4 -z-10 w-[24rem] opacity-80 sm:w-[30rem]" />
      <PalaceSketch className="pointer-events-none absolute -bottom-6 left-[3%] -z-10 w-[30rem] opacity-70 sm:w-[38rem] lg:w-[44rem]" />
      <EdgeFlowers uid="hero-edge" className="pointer-events-none absolute -left-2 top-0 hidden h-full w-auto sm:block" />

      <div className="relative grid min-h-[22rem] items-center px-4 sm:px-8 lg:min-h-[31rem] lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:px-[6.5%]">
        <div className="relative z-10 order-2 min-w-0 pb-24 pt-2 lg:order-1 lg:pb-28 lg:pt-0">
          <h1 className="text-4xl font-extrabold tracking-tight text-pu-900 sm:text-5xl lg:text-[clamp(3rem,4.2vw,4.25rem)] lg:leading-[1.05]">
            Welcome,{' '}
            <span className="break-words text-pink-600" title={name}>
              {name}
            </span>{' '}
            <span aria-hidden className="inline-block whitespace-nowrap">👋</span>
          </h1>
          <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-base text-ink/70 lg:text-xl">
            <span>
              Student ID: <b className="font-semibold text-ink">{studentCode}</b>
            </span>
            <span aria-hidden>·</span>
            <span>Campus Dining Portal</span>
          </p>
        </div>
        <div className="order-1 h-60 sm:h-72 lg:hidden">
          <ArchPhoto uid="hero-arch-m" className="h-full w-full" />
        </div>
        <PartnerBrand />
      </div>

      {/* Desktop: the arch photo fills the right half and runs to the top edge; the lamp sits at the far right */}
      <ArchPhoto uid="hero-arch-d" className="pointer-events-none absolute bottom-0 right-[4.5%] hidden h-[100%] w-[56%] lg:block" />
      <StreetLamp className="pointer-events-none absolute -top-6 right-1 hidden h-[105%] lg:block" />
    </section>
    </>
  );
}
