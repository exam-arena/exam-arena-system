export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: { field: string; message: string }[]
  ) {
    super(message);
    this.name = "ApiError";
  }
}
