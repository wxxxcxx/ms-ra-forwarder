"use client"
import { useLocales, useVoice, useVoiceLocale, useVoices } from "@/app/hooks/actions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shadcn/ui/select";
import { useTranslation } from "@/locales/client";
import { getLocaleFriendlyName } from "@/service/edge-tts-service/locale-map";
import { getFriendlyVoiceName } from "@/service/edge-tts-service/voice-map";
import { TTSOptions } from "@/service/tts-service";
import clsx from "clsx";
import { HTMLAttributes, useMemo, useState } from "react";
import { withClientLayout } from "./layout";
import { Check, ChevronsUpDown, LoaderCircle, MapPin, RotateCw, Smile, Speech, Terminal } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/shadcn/ui/popover";
import { Button } from "@/components/shadcn/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/shadcn/ui/command";
import { cn } from "@/components/shadcn/lib/utils";
import { Slider } from "@/components/shadcn/ui/slider";
import { Label } from "@/components/shadcn/ui/label";
import { get } from "node:http";
import { getFirendlyPersonalityName } from "@/service/edge-tts-service/personality-map";

function getDefaultTTSOptions(): TTSOptions {
  return {
    voice: '',
    pitch: 0,
    rate: 0,
    volume: 0,
    personality: undefined
  }
}

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
  const [personalitySelecterOpen, setPersonalitySelecterOpen] = useState(false)
  const personalities = useMemo(() => {
    return voice?.voicePersonalities ?? []
  }, [voice])
  const currentOptions = useMemo(() => {
    return options ?? getDefaultTTSOptions()
  }, [options])

  const t = useTranslation()

  return <div {...props} className={clsx("flex gap-2 flex-wrap")}>
    <Popover open={localSelecterOpen} onOpenChange={setLocalSelecterOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={localSelecterOpen}
          className={clsx("justify-between w-64")}
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
      <PopoverContent className="p-0 w-64">
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
          className="justify-between w-64"
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
      <PopoverContent className="p-0 w-64">
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
                      ...currentOptions,
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
    <Popover open={personalitySelecterOpen} onOpenChange={setPersonalitySelecterOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={personalitySelecterOpen}
          className={clsx("justify-between w-64")}
        >
          <Smile className="h-4 w-4" />
          <span className={clsx('ml-2 flex-1 text-left truncate')}>
            {currentOptions.personality
              ? getFirendlyPersonalityName(currentOptions.personality)
              : "Select persontily..."}
          </span>
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-64">
        <Command>
          <CommandInput placeholder="Search persontily..." />
          <CommandList>
            <CommandEmpty>{isVoicesLoading ?
              <span className={clsx('flex px-2')}>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                <span className={clsx('ml-2')}>Loading...</span>
              </span>
              : 'No results found.'}</CommandEmpty>
            <CommandGroup>
              {personalities.map((personality) => (
                <CommandItem
                  key={personality}
                  value={personality}
                  onSelect={(value: string) => {
                    setLocalSelecterOpen(false)
                    onOptionsChange({
                      ...currentOptions,
                      personality: value
                    })
                  }}
                >
                  {getFirendlyPersonalityName(personality)}
                  <Check
                    className={clsx(
                      "ml-auto",
                      personality === currentOptions.personality ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
    <span className={clsx('flex gap-2 items-center w-64')}>
      <Label>Pitch</Label>
      <Slider
        min={-100} max={100} step={1}
        value={[currentOptions.pitch]}
        onValueChange={(value) => onOptionsChange({ ...currentOptions, pitch: value[0] })}
        className={clsx('h-9 flex-1')} >
        <span className={clsx('flex gap-2 items-center text-[0.5rem] text-gray-500')}>{currentOptions.pitch}%</span>
      </Slider>
      <Button variant={'ghost'} size={'sm'} className={clsx('px-2')}
        onClick={() => {
          onOptionsChange({
            ...currentOptions,
            pitch: 0,
          })
        }}
      >
        <RotateCw />
      </Button>
    </span>
    <span className={clsx('flex gap-2 items-center w-64')}>
      <Label>Speed</Label>
      <Slider
        min={-100} max={100} step={1}
        value={[currentOptions.rate]}
        onValueChange={(value) => onOptionsChange({ ...currentOptions, rate: value[0] })}
        className={clsx('h-9 flex-1')} >
        <span className={clsx('flex gap-2 items-center text-[0.5rem] text-gray-500')}>{currentOptions.rate}%</span>
      </Slider>
      <Button variant={'ghost'} size={'sm'} className={clsx('px-2')}
        onClick={() => {
          onOptionsChange({
            ...currentOptions,
            rate: 0,
          })
        }}
      >
        <RotateCw />
      </Button>
    </span>

  </div>
}

export default withClientLayout(VoicePreference)


