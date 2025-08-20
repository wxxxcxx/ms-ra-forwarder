
'use client'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList } from "@/components/shadcn/ui/breadcrumb";
import { Button } from "@/components/shadcn/ui/button";
import { Separator } from "@/components/shadcn/ui/separator";
import clsx from "clsx";
import { ArrowRightFromLine } from "lucide-react";
import TTSContextProvider from "@/components/tts-context";
import TtsHistory from "@/components/tts-history";
import TTSWorkspace from "@/components/tts-workspace";
import { useAuthGuard, useAuth } from "@/app/hooks/auth";

export default function Home() {
  const { isLoading } = useAuthGuard()
  const { logout, authRequired } = useAuth()

  // 显示加载状态
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">加载中...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col w-screen lg:h-screen font-[family-name:var(--font-geist-sans)]">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b justify-between">
        <div className="flex items-center gap-2 px-3">
          <h1 className={clsx('text-2xl font-bold')}>MS Read Aloud Forwarder</h1>
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
          {authRequired && (
            <Button variant={'ghost'} onClick={logout} title="登出">
              <ArrowRightFromLine />
            </Button>
          )}
        </div>
      </header>
      <main className="flex-1 flex p-4 h-0">
        <TTSContextProvider>
          <div className={clsx('size-full p-4 flex flex-col rounded-md border border-input shadow-sm gap-4',
            'xl:flex-row'
          )}>
            <TTSWorkspace className={clsx('flex-1')} />
            <TtsHistory 
              className={clsx('h-full overflow-hidden xl:w-80')}
            ></TtsHistory>
          </div>
        </TTSContextProvider>
      </main>
    </div>
  );
}
