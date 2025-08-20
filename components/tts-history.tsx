'use client'
import { useToast } from "@/components/shadcn/hooks/use-toast"
import { Button } from "@/components/shadcn/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/shadcn/ui/card"
import { ScrollArea } from "@/components/shadcn/ui/scroll-area"
import { AudioPlayer } from "@/components/ui/audio-player"
import clsx from "clsx"
import dayjs from "dayjs"
import { CircleX } from "lucide-react"
import { HTMLAttributes } from "react"
import { useTTSContext } from "./tts-context"

export type TTSHistoryProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'>

export default function TTSHistory({ ...props }: TTSHistoryProps) {
    const { toast } = useToast()
    const ttsContext = useTTSContext()

    return <div {...props} className={clsx('w-full max-w-full overflow-hidden', props.className)}>
        <ScrollArea className={clsx('size-full overflow-hidden')}>
            <div className={clsx('w-full max-w-full flex flex-col gap-2')}>
                {ttsContext.history.map(record => (
                    <Card key={record.id} className="w-full max-w-full rounded-md shadow-sm hover:bg-muted relative group overflow-hidden">
                        <CardHeader className="flex items-start justify-between w-full overflow-hidden">
                            <div className="flex-1 min-w-0 pr-2">
                                <p className="text-sm leading-5 break-words" style={{
                                    display: '-webkit-box',
                                    WebkitLineClamp: 3,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                }}>
                                    {record.text}
                                </p>
                            </div>
                        </CardHeader>
                        <CardContent className={clsx('w-full max-w-full overflow-hidden space-y-4')}>
                            <AudioPlayer className={clsx('w-full max-w-full overflow-hidden')} src={record.uri}></AudioPlayer>
                            <Button
                                variant={'destructive'}
                                size={'sm'}
                                className="w-full"
                                onClick={() => {
                                    console.log(record.id)
                                    ttsContext.removeHistoryRecord(record.id)
                                    toast({
                                        title: 'Success',
                                        description: 'Remove history successfully',
                                    })
                                }}
                            >
                                <CircleX className="opacity-70" />
                                删除
                            </Button>
                        </CardContent>
                        <CardFooter className="w-full max-w-full mt-2 flex flex-col md:flex-row xl:flex-col justify-between gap-1 overflow-hidden">
                            <span className={clsx('text-[0.5rem] truncate flex-1 opacity-50 min-w-0')}>
                                {record.options.voice}
                            </span>
                            <span className={clsx('text-[0.5rem] truncate flex-1 text-right opacity-50 min-w-0')}>
                                {dayjs(record.createAt).format('YYYY-MM-DD HH:mm:ss')}
                            </span>

                        </CardFooter>

                    </Card>
                ))}
            </div>
        </ScrollArea>
    </div>
}
