export class ApiResponse<T> {
    data: T | null;
    error?: string | null;
    message?: string | null;
    success: boolean;

    constructor(args: {
        data: T | null,
        message?: string | null,
        error?: string | null
    }) {
        this.data = args.data;
        this.error = args.error;
        this.success = args.error === null;
        this.message = args.message;
    }

    static success<T>(data: T): ApiResponse<T> {
        return new ApiResponse<T>({ data, message: null, error: null });
    }

    static failure<T>(error: string): ApiResponse<T> {
        return new ApiResponse<T>({ data: null, error, message: null });
    }
}