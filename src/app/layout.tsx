import type { Metadata, Viewport } from "next";
import { EB_Garamond } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";

const ebGaramond = EB_Garamond({
  variable: "--font-eb-garamond",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Casher",
  description: "Personal expense tracker",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Casher",
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: [
      { url: "/ios/120.png", sizes: "120x120" },
      { url: "/ios/152.png", sizes: "152x152" },
      { url: "/ios/167.png", sizes: "167x167" },
      { url: "/ios/180.png", sizes: "180x180" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#1a1a1a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${ebGaramond.variable} antialiased`}>
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  );
}
