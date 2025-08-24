'use client'
import { useVoice, useVoices } from "@/app/hooks/actions"
import { useToast } from "@/components/shadcn/hooks/use-toast"
import { Button } from "@/components/shadcn/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/shadcn/ui/command"
import { Form, FormField, FormItem, FormMessage } from "@/components/shadcn/ui/form"
import { Label } from "@/components/shadcn/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/shadcn/ui/popover"
import { Slider } from "@/components/shadcn/ui/slider"
import { Textarea } from "@/components/shadcn/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/shadcn/ui/dialog"
import { getFirendlyPersonalityName } from "@/service/edge-tts-service/personality-map"
import { getFriendlyVoiceName } from "@/service/edge-tts-service/voice-map"
import { getLocaleFriendlyName } from "@/service/edge-tts-service/locale-map"
import { TTSOptions, TTSOptionsSchema } from "@/service/tts-service"
import { zodResolver } from "@hookform/resolvers/zod"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import axios from "axios"
import clsx from "clsx"
import { Check, ChevronsUpDown, LoaderCircle, Smile, Speech, QrCode, Globe, Copy } from "lucide-react"
import { HTMLAttributes, useMemo, useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { v4 as uuidv4 } from 'uuid'
import { z } from "zod"
import { useTTSContext } from "./tts-context"
import Image from "next/image"
import { useAuth } from "@/app/hooks/auth"
import QRCode from 'qrcode'

const TTSRequestSchame = z.object({
    options: TTSOptionsSchema,
    text: z.string()
})

export interface TTSWorkspaceProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
    options?: TTSOptions
    text?: string
}

export default function TTSWorkspace({ ...props }: TTSWorkspaceProps) {
    const { toast } = useToast()

    const [selectedLocale, setSelectedLocale] = useState<string>('')
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('')
    const [showQrDialog, setShowQrDialog] = useState(false)
    const { getToken } = useAuth()
    const { saveHistoryRecord: save } = useTTSContext()



    const voicesQuery = useVoices() // 查询所有发音人列表，不使用selectedLocale过滤

    // 从voicesQuery中提取所有可用的locales
    const availableLocales = useMemo(() => {
        if (!voicesQuery.data) return []
        const locales = Array.from(new Set(voicesQuery.data.map(voice => voice.locale)))
        return locales.sort()
    }, [voicesQuery.data])

    // 获取当前地区的发音人列表
    const currentLocaleVoices = useMemo(() => {
        if (!voicesQuery.data || !selectedLocale) return []
        return voicesQuery.data.filter(voice => voice.locale === selectedLocale)
    }, [voicesQuery.data, selectedLocale])

    const form = useForm<z.infer<typeof TTSRequestSchame>>({
        resolver: zodResolver(TTSRequestSchame),
        defaultValues: {
            options: {
                voice: 'Microsoft Server Speech Text to Speech Voice (zh-CN, XiaoxiaoNeural)',
            },
            text: '君不见黄河之水天上来，奔流到海不复回。'
        }
    })

    // 设置默认选择中国大陆
    useEffect(() => {
        if (availableLocales.length > 0 && !selectedLocale) {
            const chinaLocale = availableLocales.find(locale => locale.includes('zh-CN')) || availableLocales[0]
            setSelectedLocale(chinaLocale)
        }
    }, [availableLocales, selectedLocale])

    // 地区切换时自动选择该地区的第一个发音人
    useEffect(() => {
        if (selectedLocale && currentLocaleVoices.length > 0) {
            const currentVoice = form.getValues('options.voice')
            // 检查当前选择的发音人是否属于当前地区
            const isCurrentVoiceInLocale = currentLocaleVoices.some(voice => voice.value === currentVoice)
            if (!isCurrentVoiceInLocale) {
                // 自动选择该地区的第一个发音人
                form.setValue('options.voice', currentLocaleVoices[0].value)
            }
        }
    }, [selectedLocale, currentLocaleVoices, form])


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
            // 获取当前用户的token
            const token = getToken()
            const headers: Record<string, string> = {}

            // 如果有token，添加到请求头
            if (token) {
                headers['Authorization'] = `Bearer ${token}`
            }

            const response = await axios.get('/api/text-to-speech', {
                responseType: 'blob',
                params: {
                    ...data.options,
                    text: data.text
                },
                headers
            })
            const audioData = response.data

            const reader = new FileReader()
            const audioUri = await new Promise<string>((resolve) => {
                reader.onload = () => resolve(reader.result as string)
                reader.readAsDataURL(audioData)
            })
            await save({
                id: uuidv4(),
                createAt: Date.now(),
                text: data.text,
                options: data.options,
                uri: audioUri
            })
        } catch (error) {
            console.error('onSubmit error', error)
            toast({
                title: 'Error',
                description: 'Failed to generate audio',
                variant: 'destructive',
            })
        }
    })

    const legadoApiLink = useMemo(() => {
        const values = form.getValues()
        if (!values || typeof window === 'undefined') {
            return ''
        }
        const protocol = window.location.protocol.replace(":", "")
        const host = window.location.host
        let queryString = Object.entries(values.options)
            .filter(([, value]) => value != null && value != undefined)
            .map(([key, value]) => `${key}=${value}`).join('&')
        queryString += `&protocol=${protocol}`
        const token = getToken()
        if (token) {
            queryString += `&token=${token}`
        }
        const apiUrl = `${protocol}://${host}/api/legado-import?${queryString}`
        return apiUrl
    }, [form.getValues()])

    const legadoImportLink = useMemo(() => {
        return `legado://import/httpTTS?src=${encodeURIComponent(legadoApiLink)}`
    }, [legadoApiLink])

    // 生成二维码
    const generateQrCode = async () => {
        if (!legadoApiLink) return

        try {
            const qrDataUrl = await QRCode.toDataURL(legadoApiLink, {
                width: 256,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            })
            setQrCodeDataUrl(qrDataUrl)
            setShowQrDialog(true)
        } catch {
            toast({
                title: '错误',
                description: '生成二维码失败',
                variant: 'destructive',
            })
        }
    }

    return <div {...props}>
        <form
            className={clsx('flex flex-col-reverse size-full gap-4',
                'md:flex-row-reverse xl:flex-row'
            )}
            onSubmit={onSubmit}>
            <Form {...form}>
                <div className={clsx('flex flex-col justify-between gap-2',
                )}>
                    <div className={clsx(
                        'grid grid-cols-1 place-content-start gap-2',
                        'md:w-80 md:grid-cols-[repeat(1,minmax(10rem,1fr))]'
                    )}>
                        {/* 地区选择器 */}
                        <div>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        className="justify-between w-full"
                                    >
                                        <span className={clsx('flex justify-between items-center gap-1 text-sm opacity-50 w-16 truncate')}><Globe className="h-4 w-4" />地区</span>
                                        <span className={clsx('ml-2 flex-1 text-left truncate')}>
                                            {selectedLocale ? getLocaleFriendlyName(selectedLocale) : "选择地区..."}
                                        </span>
                                        <ChevronsUpDown className="opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="p-0 w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height]">
                                    <Command filter={(value, search, keywords = []) => {
                                        const extendValue = value + " " + keywords.join(" ") + getLocaleFriendlyName(value);
                                        if (extendValue.toLowerCase().includes(search.toLowerCase())) {
                                            return 1;
                                        }
                                        return 0;
                                    }}>
                                        <CommandInput placeholder="搜索地区..." />
                                        <CommandList>
                                            <CommandEmpty>{voicesQuery.isLoading ? <span className={clsx('flex px-2')}>
                                                <LoaderCircle className="h-4 w-4 animate-spin" />
                                                <span className={clsx('ml-2')}>加载中...</span>
                                            </span> : '未找到结果'}</CommandEmpty>
                                            <CommandGroup>
                                                <PopoverPrimitive.Close asChild>
                                                    <div>
                                                        <CommandItem
                                                            value="全部地区"
                                                            onSelect={() => {
                                                                setSelectedLocale('')
                                                            }}
                                                        >
                                                            全部地区
                                                            <Check
                                                                className={clsx(
                                                                    "ml-auto",
                                                                    selectedLocale === '' ? "opacity-100" : "opacity-0"
                                                                )}
                                                            />
                                                        </CommandItem>
                                                    </div>
                                                </PopoverPrimitive.Close>
                                                {availableLocales.map((locale) => (
                                                    <PopoverPrimitive.Close asChild key={locale}>
                                                        <div>
                                                            <CommandItem
                                                                value={locale}
                                                                onSelect={() => {
                                                                    setSelectedLocale(locale)
                                                                }}
                                                            >
                                                                {getLocaleFriendlyName(locale)}
                                                                <Check
                                                                    className={clsx(
                                                                        "ml-auto",
                                                                        selectedLocale === locale ? "opacity-100" : "opacity-0"
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
                        </div>

                        {/* 发音人选择器 */}
                        <FormField name='options.voice' control={form.control}
                            render={({ field }) => (
                                <FormItem>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                className="justify-between w-full"
                                            >
                                                <span className={clsx('flex justify-between items-center gap-1 text-sm opacity-50 w-16 truncate')}><Speech className="h-4 w-4" />发音人</span>
                                                <span className={clsx('ml-2 flex-1 text-left truncate')}>
                                                    {field.value
                                                        ? getFriendlyVoiceName(field.value, field.value)
                                                        : "选择发音人..."}
                                                </span>
                                                <ChevronsUpDown className="opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="p-0 w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height]">
                                            <Command>
                                                <CommandInput placeholder="搜索发音人..." />
                                                <CommandList>
                                                    <CommandEmpty>{voicesQuery.isLoading ? <span className={clsx('flex px-2')}>
                                                        <LoaderCircle className="h-4 w-4 animate-spin" />
                                                        <span className={clsx('ml-2')}>加载中...</span>
                                                    </span> : '未找到结果'}</CommandEmpty>
                                                    <CommandGroup>
                                                        {currentLocaleVoices?.map((voice) => (
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
                                                    </CommandGroup>
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
                                                className="justify-between w-full"
                                            >
                                                <span className={clsx('flex justify-between items-center gap-1 text-sm opacity-50 w-16 truncate')}><Smile className="h-4 w-4" />风格</span>
                                                <span className={clsx('ml-2 flex-1 text-left truncate')}>
                                                    {field.value
                                                        ? getFirendlyPersonalityName(field.value)
                                                        : "默认"}
                                                </span>
                                                <ChevronsUpDown className="opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="p-0 w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height]">
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
                                                                    value={undefined as unknown as string}
                                                                    onSelect={() => {
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
                        <div className={clsx('space-y-1')}>
                            <Label className={clsx('flex justify-between items-center gap-1 text-sm opacity-50 w-16 truncate')}>语速</Label>
                            <FormField name="options.rate" control={form.control} render={({ field }) => (
                                <FormItem>
                                    <Slider
                                        value={[field.value ?? 0]}
                                        onValueChange={(value) => field.onChange(value[0])}
                                        min={-100}
                                        max={100}
                                        step={1}
                                    />
                                </FormItem>
                            )} />
                        </div>
                        <div className={clsx('space-y-1')}>
                            <Label className={clsx('flex justify-between items-center gap-1 text-sm opacity-50 w-16 truncate')}>语调</Label>
                            <FormField name="options.pitch" control={form.control} render={({ field }) => (
                                <FormItem>
                                    <Slider
                                        value={[field.value ?? 0]}
                                        onValueChange={(value) => field.onChange(value[0])}
                                        min={-100}
                                        max={100}
                                        step={1}
                                    />
                                </FormItem>
                            )} />
                        </div>
                        <div className={clsx('space-y-1')}>
                            <Label className={clsx('flex justify-between items-center gap-1 text-sm opacity-50 w-16 truncate')}>音量</Label>
                            <FormField name="options.volume" control={form.control} render={({ field }) => (
                                <FormItem>
                                    <Slider
                                        value={[field.value ?? 0]}
                                        onValueChange={(value) => field.onChange(value[0])}
                                        min={-100}
                                        max={100}
                                        step={1}
                                    />
                                </FormItem>
                            )} />
                        </div>
                        <div className={clsx('space-y-1')}></div>
                        <div className={clsx('space-y-3')}>
                            <Button type="submit" className={clsx('w-full')} disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? (
                                    <span className={clsx('flex justify-between items-center gap-1 text-sm opacity-50 truncate')}>
                                        <LoaderCircle className="h-4 w-4 animate-spin" />
                                        <span className={clsx('ml-2')}>转换中...</span>
                                    </span>
                                ) : (
                                    '转换'
                                )}
                            </Button>

                            {/* 导入到阅读APP区域 */}
                            <div className="border rounded-lg p-4 space-y-3">
                                <h3 className="text-sm font-medium text-muted-foreground">导入到阅读APP</h3>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="flex-1"
                                        disabled={!form.getValues('options.voice')}
                                        onClick={() => {
                                            // Open import link in new window
                                            window.open(legadoImportLink)
                                        }}
                                    >
                                        <Copy className="h-4 w-4" />
                                        直接导入
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="flex-1"
                                        disabled={!form.getValues('options.voice')}
                                        onClick={async () => {
                                            await generateQrCode()
                                            setShowQrDialog(true)
                                        }}
                                    >
                                        <QrCode className="h-4 w-4" />
                                        扫码导入
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    选择发音人后可点击按钮或扫描二维码导入TTS配置到阅读APP
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </Form>

            <div className={clsx('flex-1 flex flex-col gap-2')}>
                <Textarea className={clsx('flex-1 resize-none h-full')} placeholder={'请输入内容'}
                    {...form.register('text')}
                />
            </div>
        </form>

        {/* 二维码对话框 */}
        <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>扫描二维码导入到阅读APP</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center space-y-4">
                    {qrCodeDataUrl && (
                        <Image
                            src={qrCodeDataUrl}
                            alt="QR Code"
                            width={256}
                            height={256}
                            className="w-64 h-64"
                        />
                    )}
                    <p className="text-sm text-muted-foreground">{legadoApiLink}</p>
                    <p className="text-sm text-muted-foreground text-center">
                        使用浏览器扫描此二维码后复制内容导入TTS配置
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    </div>
}