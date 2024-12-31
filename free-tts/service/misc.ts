export const formatDate = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hour = date.getHours()
    const minute = date.getMinutes()
    const second = date.getSeconds()

    return (
        [year, month, day].map(formatNumber).join('/') +
        ' ' +
        [hour, minute, second].map(formatNumber).join(':')
    )
}

export function arrayBufferToString(arrayBuffer: ArrayBuffer): string {
    const uint8Array = new Uint8Array(arrayBuffer);
    let resultString = "";

    for (let i = 0; i < uint8Array.length; i++) {
        resultString += String.fromCharCode(uint8Array[i]);
    }
    return resultString;
}

export function arrayBufferToArray(arrayBuffer: ArrayBuffer): Array<number> {
    const uint8Array = new Uint8Array(arrayBuffer);
    const array = Array.from(uint8Array);
    return array
}

export function concatArrayBuffers(buffer1: ArrayBuffer, buffer2: ArrayBuffer): ArrayBuffer {
    const resultLength = buffer1.byteLength + buffer2.byteLength;
    const resultBuffer = new Uint8Array(resultLength);

    const view1 = new Uint8Array(buffer1);
    const view2 = new Uint8Array(buffer2);

    resultBuffer.set(view1, 0);
    resultBuffer.set(view2, view1.length);

    return resultBuffer.buffer;
}

const formatNumber = (n: number) => {
    const s = n.toString()
    return s[1] ? s : '0' + s
}

export function classNames(...classes: string[]) {
    return classes.filter(Boolean).join(' ')
}

export function formatTime(time: number) {
    // output 00:00:00 or 00:00
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    if (hours === 0) {
        return [minutes, seconds].map(formatNumber).join(':')
    } else {
        return [hours, minutes, seconds].map(formatNumber).join(':')
    }
}

export function cls(...classNames: string[]) {
    return classNames.filter(Boolean).map(className => className.trim()).join(' ')
}