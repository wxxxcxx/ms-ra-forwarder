'use client'
import { HTMLAttributes, useState } from "react"
import { withClientLayout } from "./layout"
import clsx from "clsx"
import { Textarea } from "@/components/shadcn/ui/textarea"
import VoicePreference from "./voice-preference"
import { TTSOptions } from "@/service/tts-service"
import { Button } from "@/components/shadcn/ui/button"
import { useTextToSpeach } from "@/app/hooks/actions"
import { useToast } from "@/components/shadcn/hooks/use-toast"
import { LoaderCircle } from "lucide-react"
import { AudioPlayer } from "@/components/ui/audio-player"


export interface TTSWorkspaceProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
    locale: string
}

function TTSWorkspace({ locale, ...props }: TTSWorkspaceProps) {
    const { toast } = useToast()
    const [ttsOptions, setTTSOptions] = useState<TTSOptions>()
    const [text, setText] = useState('君不见黄河之水天上来，奔流到海不复回。')
    const { mutate: textToSpeach, isPending: isTextToSpeachPending, data: audioData } = useTextToSpeach()
    return <div {...props}>
        <div className={clsx('flex flex-col gap-2')}>
            <div className={clsx('flex justify-between gap-2')}>
                <VoicePreference locale={locale} options={ttsOptions} onOptionsChange={setTTSOptions} />
                <Button
                    onClick={() => {
                        try {
                            if (!ttsOptions) {
                                toast({
                                    title: 'Please select voice and locale',
                                    description: 'Please select voice and locale',
                                    variant: 'destructive',
                                })
                                return
                            }
                            textToSpeach({ text, options: ttsOptions })
                        } catch (error) {
                            toast({
                                title: 'Error',
                                description: 'Failed to generate audio',
                                variant: 'destructive',
                            })
                        }
                    }}>
                    {isTextToSpeachPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : 'Generate'}
                </Button>
            </div>

            {audioData && <AudioPlayer src={`data:audio/mp3;base64,${audioData}`} />}
            <Textarea className={clsx('flex-1')} value={text} onChange={e => setText(e.target.value)} />


        </div>
    </div>
}

export default withClientLayout(TTSWorkspace)