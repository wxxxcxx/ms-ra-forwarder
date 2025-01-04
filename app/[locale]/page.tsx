
import { getCurrentLocale } from "@/locales/server";
import { TTSOptions } from "@/service/tts-service";
import VoicePreference from "./client/voice-preference";
import TTSWorkspace from "./client/tts-workspace";
import { Separator } from "@/components/shadcn/ui/separator";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/shadcn/ui/breadcrumb";
import clsx from "clsx";
import TTSContextProvider from "./client/tts-context";
import TtsHistory from "./client/tts-history";

export default async function Home() {
  const locale = await getCurrentLocale()
  return (
    <div className="flex flex-col min-h-screen font-[family-name:var(--font-geist-sans)]">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b">
        <div className="flex items-center gap-2 px-3">
          <h1 className={clsx('text-2xl font-bold')}>Free TTS</h1>
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="#">
                  Building Your Application
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Data Fetching</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <main className="flex flex-col items-center sm:items-start">
        <TTSContextProvider>
          <TTSWorkspace locale={locale} />
          <TtsHistory locale={locale}></TtsHistory>
        </TTSContextProvider>
      </main>
    </div>
  );
}
