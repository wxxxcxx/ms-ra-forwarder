
const formatNumber = (n: number) => {
    const s = n.toString()
    return s[1] ? s : '0' + s
}

function toSrtTime(time: number) {
    // output 00:00:00 or 00:00
    const hours = Math.floor(time / 1000 / 3600);
    const minutes = Math.floor((time / 1000 % 3600) / 60);
    const seconds = Math.floor(time / 1000 % 60);

    const result = `${[hours, minutes, seconds].map(formatNumber).join(':')},${time % 1000}`
    return result
}

export class Srt {

    items: string[]
    constructor() {
        this.items = []
    }

    append(start: number, end: number, text: string) {
        const serial = this.items.length + 1
        const timeLine = `${toSrtTime(start)} --> ${toSrtTime(end)}`
        const content = text
        const item = `${serial}\n${timeLine}\n${content}\n`
        this.items.push(item)
    }

    toString() {
        return this.items.join('\n\n')
    }

}