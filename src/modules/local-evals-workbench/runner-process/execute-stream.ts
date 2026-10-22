/** Serial UTF-8 NDJSON decoder. The caller awaits each accepted event before reading more bytes. */
export class ExecuteStreamError extends Error {
  readonly bytes: Buffer;
  readonly byteCount: number;
  constructor(readonly code: string, bytes: Buffer, byteCount = bytes.length) {
    super(code);
    this.bytes = Buffer.from(bytes.subarray(0, 64_000));
    this.byteCount = byteCount;
  }
}

export class BoundedExecuteStream {
  private pending = Buffer.alloc(0);
  private total = 0;
  private count = 0;
  constructor(private readonly limits: { readonly lineBytes: number; readonly stdoutBytes: number; readonly events: number }) {}

  async push(chunk: Buffer, consume: (event: unknown, bytes: Buffer) => Promise<void>): Promise<void> {
    this.total += chunk.length;
    if (this.total > this.limits.stdoutBytes) throw new ExecuteStreamError('stdout-limit', chunk);
    this.pending = Buffer.concat([this.pending, chunk]);
    while (true) {
      const newline = this.pending.indexOf(10);
      if (newline < 0) break;
      const line = this.pending.subarray(0, newline);
      this.pending = this.pending.subarray(newline + 1);
      if (line.length > this.limits.lineBytes) throw new ExecuteStreamError('line-limit', line);
      if (++this.count > this.limits.events) throw new ExecuteStreamError('event-limit', line);
      let value: unknown;
      try { value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(line)); }
      catch (error) { throw new ExecuteStreamError(error instanceof TypeError ? 'invalid-utf8' : 'invalid-json', line); }
      try { await consume(value, line); }
      catch (error) {
        if (error instanceof ExecuteStreamError) throw error;
        throw new ExecuteStreamError(error instanceof Error && /^[a-z][a-z0-9-]{0,79}$/.test(error.message)
          ? error.message : 'invalid-event', line);
      }
    }
    if (this.pending.length > this.limits.lineBytes) throw new ExecuteStreamError('line-limit', this.pending);
  }

  finish(): void { if (this.pending.length) throw new ExecuteStreamError('trailing-data', this.pending); }
}
