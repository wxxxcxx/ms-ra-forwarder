"use client"
import { useLocales, useVoice, useVoiceLocale, useVoices } from "@/app/hooks/actions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shadcn/ui/select";
import { useTranslation } from "@/locales/client";
import { getLocaleFriendlyName } from "@/service/edge-tts-service/locale-map";
import { getFriendlyVoiceName } from "@/service/edge-tts-service/voice-map";
import { TTSOptions } from "@/service/tts-service";
import clsx from "clsx";
import { HTMLAttributes, useState } from "react";
import { withClientLayout } from "./layout";
import { Check, ChevronsUpDown, LoaderCircle, MapPin, Speech, Terminal } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/shadcn/ui/popover";
import { Button } from "@/components/shadcn/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/shadcn/ui/command";
import { cn } from "@/components/shadcn/lib/utils";

export interface VoicePreferenceProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  options?: TTSOptions
  onOptionsChange: (options: TTSOptions) => void
}

function VoicePreference({
  options,
  onOptionsChange,
  ...props
}: VoicePreferenceProps) {

  const initialLocale = useVoiceLocale(options?.voice ?? '')
  const { data: locales, isLoading: isLocalesLoading } = useLocales()
  const voice = useVoice(options?.voice ?? '')
  const [currentLocale, setCurrentLocale] = useState(initialLocale ?? 'zh-CN')
  const { data: voices, isLoading: isVoicesLoading } = useVoices(currentLocale)
  const [localSelecterOpen, setLocalSelecterOpen] = useState(false)
  const [voiceSelecterOpen, setVoiceSelecterOpen] = useState(false)

  const t = useTranslation()

  return <div {...props} className={clsx("flex gap-2")}>
    <Popover open={localSelecterOpen} onOpenChange={setLocalSelecterOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={localSelecterOpen}
          className={clsx("justify-between w-48")}
        >
          <MapPin className="h-4 w-4" />
          <span className={clsx('ml-2 flex-1 text-left truncate')}>
            {currentLocale
              ? getLocaleFriendlyName(currentLocale)
              : "Select locale..."}
          </span>
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-48">
        <Command>
          <CommandInput placeholder="Search locale..." />
          <CommandList>
            <CommandEmpty>{isLocalesLoading ?
              <span className={clsx('flex px-2')}>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                <span className={clsx('ml-2')}>Loading...</span>
              </span>
              : 'No results found.'}</CommandEmpty>
            <CommandGroup>
              {locales?.map((locale) => (
                <CommandItem
                  key={locale}
                  value={locale}
                  onSelect={(value: string) => {
                    setCurrentLocale(value === currentLocale ? "" : value)
                    setLocalSelecterOpen(false)
                  }}
                >
                  {getLocaleFriendlyName(locale)}
                  <Check
                    className={clsx(
                      "ml-auto",
                      currentLocale === locale ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
    <Popover open={voiceSelecterOpen} onOpenChange={setVoiceSelecterOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={voiceSelecterOpen}
          className="justify-between w-48"
        >
          <Speech className="h-4 w-4" />
          <span className={clsx('ml-2 flex-1 text-left truncate')}>
            {voice
              ? getFriendlyVoiceName(voice.value, voice.label)
              : "Select voice..."}
          </span>
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-48">
        <Command>
          <CommandInput placeholder="Search voice..." />
          <CommandList>
            <CommandEmpty>{isLocalesLoading ? <span className={clsx('flex px-2')}>
              <LoaderCircle className="h-4 w-4 animate-spin" />
              <span className={clsx('ml-2')}>Loading...</span>
            </span> : 'No results found.'}</CommandEmpty>
            <CommandGroup>
              {voices?.map((voice) => (
                <CommandItem
                  key={voice.value}
                  value={voice.value}
                  onSelect={(value: string) => {
                    setVoiceSelecterOpen(false)
                    onOptionsChange({
                      ...options ?? {
                        pitch: 0,
                        rate: 0,
                        volume: 0,
                      },
                      voice: value
                    })
                  }}
                >
                  {getFriendlyVoiceName(voice.value, voice.label)}
                  <Check
                    className={clsx(
                      "ml-auto",
                      options?.voice === voice.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>

  </div>;
}

export default withClientLayout(VoicePreference)


