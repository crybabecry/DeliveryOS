import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "DeliveryOS", description: "Contract-to-delivery readiness for regulated manufacturing." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
