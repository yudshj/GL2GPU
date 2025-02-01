export class HydFastHash {
    hash: number;
    seed: number;
    constructor(seed: number = 42) {
        this.hash = seed;
        this.seed = seed;
    }

    init() {
        this.hash = this.seed;
    }

    update(str: string) {
        this.hash = str.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, this.hash);
    }

    digest() {
        return this.hash;
    }

    push(...args: Array<string | undefined | null>) {
        for (const arg of args) {
            if (arg) {
                this.update(arg.toString());
            } else {
                this.update('^');
            }
        }
    }
}