export function hydTrim(s: string) {
    return s.trim().replace(/\r\n/g, "\n");
}
