import type { Metadata } from "next";
import { Caveat, Geist, Geist_Mono, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { siteUrl } from "@/lib/site";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const serif = Source_Serif_4({ variable: "--font-serif", subsets: ["latin"] });
// Student dashboard tagline only.
const script = Caveat({ variable: "--font-caveat", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "PU CafeConnect | Poornima University Campus Dining", template: "%s | PU CafeConnect" },
  description: "Order from Poornima University's campus cafes, track orders and view your spending.",
  applicationName: "PU CafeConnect",
  openGraph: { type: "website", siteName: "PU CafeConnect", locale: "en_IN" },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
  ...(process.env.NEXT_PUBLIC_GSC_VERIFICATION ? { verification: { google: process.env.NEXT_PUBLIC_GSC_VERIFICATION } } : {}),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${serif.variable} ${script.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
