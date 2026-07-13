export class HydSync {
    public deleted: boolean = false;
    public signaled: boolean;

    constructor(
        public readonly ownerToken: object,
        public readonly condition: GLenum,
        public readonly flags: GLbitfield,
        signaled: boolean,
    ) {
        this.signaled = signaled;
    }
}
