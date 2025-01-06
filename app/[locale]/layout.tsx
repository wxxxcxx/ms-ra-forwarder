import { QueryClient } from "@tanstack/react-query";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Free TTS",
  description: "Free TTS",
};
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html>
      <body>
        {children}
      </body>
    </html>
  );
}
