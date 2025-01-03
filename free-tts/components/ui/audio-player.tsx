import clsx from "clsx"
import { AudioLines, PauseCircle, PlayCircle } from "lucide-react"
import React, { useEffect } from "react"
import { useAudio } from "react-use"
import { Button } from "../shadcn/ui/button"
import { useToast } from "../shadcn/hooks/use-toast"

function formatTime(time: number) {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

interface AudioPlayerProps extends React.HTMLAttributes<HTMLDivElement> {
    src: string
    showVolume?: boolean
    controls?: boolean
    autoPlay?: boolean
}

const AudioPlayer = React.forwardRef<
    HTMLDivElement,
    AudioPlayerProps
>(({ className, src, showVolume = false, controls = true, autoPlay = false, ...props }, ref) => {
    const { toast } = useToast()
    const [audioElement, audioState, audioControls, audioRef] = useAudio({
        src: src,
        autoPlay: false,
        controls: true,
        className: 'hidden'
    })
    return <div
        className={clsx("h-9 flex items-center gap-2 justify-between", className)}
        ref={ref}
    >
        <AudioLines />
        <span className={clsx('text-xs')}>
            <span className={clsx('text-gray-500')}>{formatTime(audioState.time)}</span>
            <span className={clsx('text-gray-500')}>/</span>
            <span className={clsx('text-gray-500')}>{formatTime(audioState.duration)}</span>
        </span>
        <Button
            className={clsx('px-1.5 py-1 [&_svg]:size-5')}
            variant={'ghost'}
            onClick={() => {
                try {
                    if (audioState.paused) {
                        audioControls.play()
                    } else {
                        audioControls.pause()
                    }
                } catch (error) {
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
