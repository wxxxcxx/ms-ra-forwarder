import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./client/providers";

export const metadata: Metadata = {
  title: "免费TTS",
  description: "免费TTS是一个免费的文本转语音服务",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
