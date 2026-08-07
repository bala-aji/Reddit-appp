export class AiCallError extends Error {
  constructor(
    message: string,
    public readonly task: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "AiCallError";
  }
}
