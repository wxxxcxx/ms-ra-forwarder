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

const TTSRequestSchame = z.object({
    options: TTSOptionsSchema,
    text: z.string()
})

export interface TTSWorkspaceProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
    locale: string,
    options?: TTSOptions
    text?: string
}

function TTSWorkspace({ locale, ...props }: TTSWorkspaceProps) {
    const { toast } = useToast()

    const voicesQuery = useVoices()

    const groupedVoices = useMemo(() => {
        return voicesQuery.data?.reduce((acc, voice) => {
            acc[voice.locale] = acc[voice.locale] || []
            acc[voice.locale].push(voice)
            return acc
        }, {} as Record<string, typeof voicesQuery.data>) ?? {}
    }, [voicesQuery.data])
    const { mutateAsync: textToSpeach, isPending: isTextToSpeachPending } = useTextToSpeach()

    const { saveHistoryRecord: save } = useTTSContext()

    const form = useForm<z.infer<typeof TTSRequestSchame>>({
        resolver: zodResolver(TTSRequestSchame),
        defaultValues: {
            options: {
                voice: 'Microsoft Server Speech Text to Speech Voice (zh-CN, XiaoxiaoNeural)',
            },
            text: '君不见黄河之水天上来，奔流到海不复回。'
        }
    })

    const currentVoice = useVoice(form.getValues('options.voice'))

    const onSubmit = form.handleSubmit(async data => {
        try {
            if (!data) {
                toast({
                    title: 'Error',
                    description: 'Please select voice and locale',
                    variant: 'destructive',
                })
                return
            }
            const audioData = await textToSpeach({ text: data.text, options: data.options })
            const audioUri = `data:audio/mp3;base64,${audioData}`
            save({
                id: uuidv4(),
                createAt: new Date(),
                text: data.text,
                options: data.options,
                uri: audioUri
            })
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to generate audio',
                variant: 'destructive',
            })
        }
    })

    return <div {...props}>
        <div className={clsx('flex')}>
            <Form {...form}>
                <form
                    className={clsx('flex')}
                    onSubmit={onSubmit}>
                    <div className={clsx('flex flex-col gap-2')}>
                        <FormField name='options.voice' control={form.control}
                            render={({ field }) => (
                                <FormItem>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                className="justify-between w-64"
                                            >
                                                <span className={clsx('flex items-center gap-1 text-sm opacity-50')}><Speech />发音人</span>
                                                <span className={clsx('ml-2 flex-1 text-left truncate')}>
                                                    {field.value
                                                        ? getFriendlyVoiceName(field.value, field.value)
                                                        : "Select voice..."}
                                                </span>
                                                <ChevronsUpDown className="opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="p-0 w-64">
                                            <Command>
                                                <CommandInput placeholder="Search voice..." />
                                                <CommandList>
                                                    <CommandEmpty>{voicesQuery.isLoading ? <span className={clsx('flex px-2')}>
                                                        <LoaderCircle className="h-4 w-4 animate-spin" />
                                                        <span className={clsx('ml-2')}>Loading...</span>
                                                    </span> : 'No results found.'}</CommandEmpty>
                                                    {Object.entries(groupedVoices).map(([locale, voices]) => (
                                                        <CommandGroup key={locale} heading={locale}>
                                                            {voices.map((voice) => (
                                                                <PopoverPrimitive.Close asChild
                                                                    key={voice.value}
                                                                >
                                                                    <div>
                                                                        <CommandItem
                                                                            key={voice.value}
                                                                            value={voice.value}
                                                                            onSelect={(value: string) => {
                                                                                field.onChange(value)
                                                                            }}
                                                                        >

                                                                            {getFriendlyVoiceName(voice.value, voice.label)}
                                                                            <Check
                                                                                className={clsx(
                                                                                    "ml-auto",
                                                                                    field.value === voice.value ? "opacity-100" : "opacity-0"
                                                                                )}
                                                                            />

                                                                        </CommandItem>
                                                                    </div>
                                                                </PopoverPrimitive.Close>
                                                            ))}
                                                        </CommandGroup>))}
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        ></FormField>
                        <FormField name='options.personality' control={form.control}
                            render={({ field }) => (
                                <FormItem>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                className="justify-between w-64"
                                            >
                                                <span className={clsx('flex items-center gap-1 text-sm opacity-50')}><Smile className="h-4 w-4" />风格</span>
                                                <span className={clsx('ml-2 flex-1 text-left truncate')}>
                                                    {field.value
                                                        ? getFirendlyPersonalityName(field.value)
                                                        : "默认"}
                                                </span>
                                                <ChevronsUpDown className="opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="p-0 w-64">
                                            <Command>
                                                <CommandInput placeholder="Search voice..." />
                                                <CommandList>
                                                    <CommandEmpty>{voicesQuery.isLoading ? <span className={clsx('flex px-2')}>
                                                        <LoaderCircle className="h-4 w-4 animate-spin" />
                                                        <span className={clsx('ml-2')}>Loading...</span>
                                                    </span> : 'No results found.'}</CommandEmpty>
                                                    <CommandGroup>
                                                        <PopoverPrimitive.Close asChild

                                                        >
                                                            <div>
                                                                <CommandItem
                                                                    value={undefined}
                                                                    onSelect={(value: string) => {
                                                                        field.onChange(undefined)
                                                                    }}
                                                                >
                                                                    默认
                                                                    <Check
                                                                        className={clsx(
                                                                            "ml-auto",
                                                                            field.value === undefined ? "opacity-100" : "opacity-0"
                                                                        )}
                                                                    />

                                                                </CommandItem>
                                                            </div>
                                                        </PopoverPrimitive.Close>
                                                        {currentVoice?.personalities.map((personality) => (
                                                            <PopoverPrimitive.Close asChild
                                                                key={personality}
                                                            >
                                                                <div>
                                                                    <CommandItem
                                                                        value={personality}
                                                                        onSelect={(value: string) => {
                                                                            field.onChange(value)
                                                                        }}
                                                                    >

                                                                        {getFirendlyPersonalityName(personality)}
                                                                        <Check
                                                                            className={clsx(
                                                                                "ml-auto",
                                                                                field.value === personality ? "opacity-100" : "opacity-0"
                                                                            )}
                                                                        />

                                                                    </CommandItem>
                                                                </div>
                                                            </PopoverPrimitive.Close>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        ></FormField>
                        <FormField name='options.pitch' control={form.control}
                            render={({ field }) => (
                                <FormItem>
                                    <span className={clsx('flex gap-2 items-center w-64')}>
                                        <Label>{field.name}</Label>
                                        <Slider
                                            min={-100} max={100} step={1}
                                            value={[field.value ?? 0]}
                                            onValueChange={(value) => field.onChange(value[0])}
                                            className={clsx('h-9 flex-1')} >
                                            <span className={clsx('flex gap-2 items-center text-[0.5rem] text-gray-500')}>{field.value}%</span>
                                        </Slider>
                                        <Button variant={'ghost'} size={'sm'} className={clsx('px-2')}
                                            onClick={() => {
                                                field.onChange(0)
                                            }}
                                        >
                                            <RotateCw />
                                        </Button>
                                    </span>
                                    <FormMessage />
                                </FormItem>
                            )}
                        ></FormField>
                        <FormField name='options.rate' control={form.control}
                            render={({ field }) => (
                                <FormItem>
                                    <span className={clsx('flex gap-2 items-center w-64')}>
                                        <Label>{field.name}</Label>
                                        <Slider
                                            min={-100} max={100} step={1}
                                            value={[field.value ?? 0]}
                                            onValueChange={(value) => field.onChange(value[0])}
                                            className={clsx('h-9 flex-1')} >
                                            <span className={clsx('flex gap-2 items-center text-[0.5rem] text-gray-500')}>{field.value}%</span>
                                        </Slider>
                                        <Button variant={'ghost'} size={'sm'} className={clsx('px-2')}
                                            onClick={() => {
                                                field.onChange(0)
                                            }}
                                        >
                                            <RotateCw />
                                        </Button>
                                    </span>
                                    <FormMessage />
                                </FormItem>
                            )}
                        ></FormField>
                        <Button
                            onClick={onSubmit}>
                            {isTextToSpeachPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : 'Generate'}
                        </Button>
                    </div>
                    <FormField name="text" control={form.control} render={({ field }) => (
                        <FormItem>
                            <Textarea className={clsx('flex-1')} value={field.value} onChange={e => { field.onChange(e.target.value) }} />
                            <FormMessage></FormMessage>
                        </FormItem>
                    )}></FormField>
                </form>
            </Form>
        </div>
    </div>
}

export default withClientLayout(TTSWorkspace)