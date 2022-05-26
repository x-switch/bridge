declare type Callback<TData, TContext> = (data?: TData | unknown, context?: TContext | unknown) => void;
export declare function on<TData, TContext>(eventName: string, callback: Callback<TData, TContext>, context: TContext): void;
export declare function once<TData, TContext>(eventName: string, callback: Callback<TData, TContext>, context: TContext): void;
export declare function off(eventName: string, callback?: Callback<unknown, unknown>): void;
export declare function onAll(callback: Callback<unknown, unknown>): void;
export declare function offAll(callback: Callback<unknown, unknown>): void;
export declare function clear(): void;
export declare function start(): void;
export declare function stop(): void;
export declare function invoke(eventName: string, eventData: unknown): Promise<unknown>;
export declare function handle<TData, TContext>(eventName: string, callback: Callback<TData, TContext>): void;
export declare function emit(eventName: string, eventData: unknown): void;
declare const bridge: {
    on: typeof on;
    once: typeof once;
    onAll: typeof onAll;
    clear: typeof clear;
    invoke: typeof invoke;
    handle: typeof handle;
    emit: typeof emit;
};
export default bridge;
