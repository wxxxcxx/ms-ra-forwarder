'use client'
import { useToast } from "@/components/shadcn/hooks/use-toast"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/shadcn/ui/card"
import { AudioPlayer } from "@/components/ui/audio-player"
import clsx from "clsx"
import dayjs from "dayjs"
import { HTMLAttributes } from "react"
import { useTTSContext } from "./tts-context"
import { Button } from "@/components/shadcn/ui/button"
import { Trash } from "lucide-react"
import { ScrollArea } from "@/components/shadcn/ui/scroll-area"

export type TTSHistoryProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'>

export default function TTSHistory({ ...props }: TTSHistoryProps) {
    const { toast } = useToast()
    const ttsContext = useTTSContext()

    return <div {...props}>
        <ScrollArea className={clsx('size-full')}>
            <div className={clsx('w-full flex flex-col gap-2 ')}>
                {ttsContext.history.map(record => (
                    <Card key={record.id} className="w-full rounded-md shadow-sm hover:bg-muted relative group">
                        <Button
                            className={clsx(
                                'absolute right-0 top-0 translate-x-1/2 -translate-y-1/2',
                                'rounded-full aspect-square overflow-hidden text-xs h-6 p-0',
                                'group-hover:opacity-80 opacity-0 transition-opacity duration-300'
                            )}
                            variant={'default'}
                            size={'sm'}
                            onClick={() => {
                                console.log(record.id)
                                ttsContext.removeHistoryRecord(record.id)
                                toast({
                                    title: 'Success',
                                    description: 'Remove history successfully',
                                })
                            }}
                        >
                            <Trash className="opacity-70" />
                        </Button>
                        <CardHeader>
                            <AudioPlayer className={clsx('w-full')} src={record.uri}></AudioPlayer>
                        </CardHeader>
                        <CardContent className={clsx('text-xs opacity-70 w-full h-10 overflow-hidden text-ellipsis')}>
                            {record.text}
                        </CardContent>
                        <CardFooter className="flex justify-between gap-2">
                            <span className={clsx('text-[0.5rem] truncate flex-1 opacity-50')}>
                                {record.options.voice}
                            </span>
                            <span className={clsx('text-[0.5rem] truncate flex-1 text-right opacity-50')}>
                                {dayjs(record.createAt).format('YYYY-MM-DD HH:mm:ss')}
                            </span>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </ScrollArea>
    </div>
}
