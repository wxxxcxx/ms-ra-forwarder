'use client'
import { HTMLAttributes, useMemo, useState } from "react"
import { withClientLayout } from "./layout"
import clsx from "clsx"
import { Textarea } from "@/components/shadcn/ui/textarea"
import VoicePreference from "./voice-preference"
import { Button } from "@/components/shadcn/ui/button"
import { useTextToSpeach } from "@/app/hooks/actions"
import { useToast } from "@/components/shadcn/hooks/use-toast"
import { AudioPlayer } from "@/components/ui/audio-player"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useLocales, useVoice, useVoiceLocale, useVoices } from "@/app/hooks/actions";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/shadcn/ui/command";
import { Label } from "@/components/shadcn/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/shadcn/ui/popover";
import { Slider } from "@/components/shadcn/ui/slider";
import { useTranslation } from "@/locales/client";
import { getFriendlyVoiceName } from "@/service/edge-tts-service/voice-map";
import { TTSOptions, TTSOptionsSchema } from "@/service/tts-service";
import { Check, ChevronsUpDown, LoaderCircle, MapPin, RotateCw, Smile, Speech } from "lucide-react";
import { Form, FormField, FormItem, FormMessage } from "@/components/shadcn/ui/form"
import { getFirendlyPersonalityName } from "@/service/edge-tts-service/personality-map"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import { z } from "zod"
import { useLocalStorage } from "react-use"
import useHistory from "@/app/hooks/history"
import { v4 as uuidv4 } from 'uuid';
import { useTTSContext } from "./tts-context"


export interface TTSHistoryProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
    locale: string,
}

function TTSHistory({ locale, ...props }: TTSHistoryProps) {
    const { toast } = useToast()
    const ttsContext = useTTSContext()

    return <div {...props}>
        <div className={clsx('flex flex-col')}>
            {ttsContext.history.map(record => (
                <div className={clsx('flex flex-col')}>
                    <div>{record.text}</div>
                    <AudioPlayer src={record.uri}></AudioPlayer>
                </div>
            ))}
        </div>
    </div>
}

export default withClientLayout(TTSHistory)