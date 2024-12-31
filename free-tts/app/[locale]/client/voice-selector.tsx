'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { fetchVoices } from "@/app/actions/tts";
import { withClientLayout } from "./layout";

function VoiceSelector() {
    const { data: voices } = useQuery({
        queryKey: ['voices'],
        queryFn: fetchVoices,
    })

    return (
        <Select>
            <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Pick a voice" />
            </SelectTrigger>
            <SelectContent>
                {voices?.map((voice) => (
                    <SelectItem key={voice.value} value={voice.value}>{voice.label}</SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}

export default withClientLayout(VoiceSelector)