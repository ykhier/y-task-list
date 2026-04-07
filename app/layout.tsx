import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { SupabaseProvider } from "@/components/providers/SupabaseProvider";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-jakarta",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "WeekFlow",
  description: "Productivity planning with calendar + tasks in one place",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="he"
      dir="rtl"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
    >
      <body className={`${jakarta.className} ${jakarta.variable}`}>
        <SupabaseProvider>{children}</SupabaseProvider>
      </body>
    </html>
  );
}
