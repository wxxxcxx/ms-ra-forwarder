
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList } from "@/components/shadcn/ui/breadcrumb";
import { Button } from "@/components/shadcn/ui/button";
import { Separator } from "@/components/shadcn/ui/separator";
import { getCurrentLocale } from "@/locales/server";
import clsx from "clsx";
import { ArrowRightFromLine } from "lucide-react";
import TTSContextProvider from "./client/tts-context";
import TtsHistory from "./client/tts-history";
import TTSWorkspace from "./client/tts-workspace";

export default async function Home() {
  const locale = await getCurrentLocale()
  return (
    <div className="flex flex-col h-screen w-screen font-[family-name:var(--font-geist-sans)]">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b justify-between">
        <div className="flex items-center gap-2 px-3">
          <h1 className={clsx('text-2xl font-bold')}>Free TTS</h1>
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="#">
                  Text to Speech
                </BreadcrumbLink>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className={clsx('pr-3 flex')}>
          <Button variant={'ghost'}>
            <ArrowRightFromLine />
          </Button>
        </div>
      </header>
      <main className="flex-1 flex p-4 h-0">
        <TTSContextProvider>
          <div className={clsx('size-full p-4 flex flex-col rounded-md border border-input shadow-sm gap-4',
            'xl:flex-row'
          )}>
            <TTSWorkspace locale={locale} className={clsx('flex-1')} />
            <TtsHistory locale={locale}
              className={clsx('h-full overflow-hidden')}
            ></TtsHistory>
          </div>
        </TTSContextProvider>
      </main>
    </div>
  );
}
