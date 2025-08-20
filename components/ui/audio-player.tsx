import clsx from "clsx"
import { AudioLines, PauseCircle, PlayCircle } from "lucide-react"
import React from "react"
import { useAudio } from "react-use"
import { useToast } from "../shadcn/hooks/use-toast"
import { Button } from "../shadcn/ui/button"
import { Slider } from "../shadcn/ui/slider"

function formatTime(time: number) {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

interface AudioPlayerProps extends React.HTMLAttributes<HTMLDivElement> {
    src: string
    controls?: boolean
    autoPlay?: boolean
}

const AudioPlayer = React.forwardRef<
    HTMLDivElement,
    AudioPlayerProps
>(({ className, src, controls = true, autoPlay = false, }, ref) => {
    const { toast } = useToast()
    const [audioElement, audioState, audioControls] = useAudio({
        src: src,
        autoPlay: autoPlay,
        controls: controls,
        className: 'hidden',

    })
    return <div
        className={clsx("flex items-center gap-2 justify-between w-full max-w-full overflow-hidden", className)}
        ref={ref}
    >
        <AudioLines className="flex-shrink-0" />
        <div className={clsx('flex items-center gap-2 flex-1 min-w-0 max-w-full overflow-hidden')}>
            <sub className={clsx('text-gray-500 text-xs whitespace-nowrap flex-shrink-0')}>{formatTime(audioState.time)}</sub>
            <Slider className={clsx('flex-1 min-w-0 max-w-full')} value={[audioState.time]} max={audioState.duration} step={0.01}
                onValueChange={(value) => {
                    audioControls.seek(value[0])
                }}
            />
            <sub className={clsx('text-gray-500 text-xs whitespace-nowrap flex-shrink-0')}>{formatTime(audioState.duration)}</sub>
        </div>
        <Button
            className={clsx('px-1.5 py-1 [&_svg]:size-5 flex-shrink-0')}
            variant={'ghost'}
            onClick={() => {
                try {
                    if (audioState.paused) {
                        audioControls.play()
                    } else {
                        audioControls.pause()
                    }
                } catch (error) {
                    console.error(error)
                    toast({
                        title: 'Error',
                        description: 'Failed to play audio',
                        variant: 'destructive'
                    })
                }

            }}>
            {audioState.paused ?
                <PlayCircle></PlayCircle> :
                <PauseCircle></PauseCircle>
            }
        </Button>

        {audioElement}
    </div>
})
AudioPlayer.displayName = "AudioPlayer"

export { AudioPlayer }

