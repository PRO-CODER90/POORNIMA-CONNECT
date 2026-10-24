import Image from 'next/image';

/**
 * Slot for the partner crest + "Same Campus Better Food" tagline in the
 * dashboard hero.
 *
 * Renders nothing unless NEXT_PUBLIC_SHOW_PARTNER_BRAND is "true". The
 * Rajasthan Royals crest and tagline are a third party's trademark and a
 * campaign line: only turn this on once the university has confirmed
 * permission, and add the official artwork at public/brand/rr-logo.webp.
 */
export default function PartnerBrand() {
  if (process.env.NEXT_PUBLIC_SHOW_PARTNER_BRAND !== 'true') return null;

  return (
    <div className="flex flex-col items-center gap-2">
      <Image src="/brand/rr-logo.webp" alt="Rajasthan Royals" width={112} height={132} className="h-auto w-28" />
      <p className="-rotate-[8deg] font-script text-2xl leading-6 text-pu-900">
        Same
        <br />
        Campus
        <br />
        Better Food
      </p>
    </div>
  );
}
