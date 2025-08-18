import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./client/providers";

export const metadata: Metadata = {
  title: "Free TTS",
  description: "Free TTS",
};
export default async function RootLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode;
  params: { locale: string }
}>) {
  const { locale } = params
  return (
    <html>
      <body>
        <Providers locale={locale}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
