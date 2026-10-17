import type { Metadata } from "next";
import { Poppins, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ArkivTrace — Public Distribution Transparency",
  description: "Auditable public distribution records, grain dispatches, shop receipts, and discrepancy reconciliation powered by Arkiv blockchain.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${poppins.variable} ${jetbrainsMono.variable} antialiased bg-[#02090D] text-[#F1F8FC] min-h-screen selection:bg-[#00C8FF]/20 selection:text-[#55E5FF]`}
      >
        {children}
      </body>
    </html>
  );
}
