/**
 * SyncTasks.ts
 * Author: David de Regt
 * Copyright: Microsoft 2015
 *
 * A very simple promise library that resolves all promises synchronously instead of
 * kicking them back to the main ticking thread.  This affirmatively rejects the A+
 * standard for promises, and is used for a combination of performance (wrapping
 * things back to the main thread is really slow) and because indexeddb loses
 * context for its calls if you send them around the event loop and transactions
 * automatically close.
 */
export declare const config: {
    exceptionsToConsole: boolean;
    catchExceptions: boolean;
    exceptionHandler: (ex: Error) => void;
};
export declare type SuccessFunc<T, U> = (value: T) => U | Thenable<U>;
export declare type ErrorFunc<U> = (error: any) => U | Thenable<U>;
export declare type CancelFunc = (context: any) => void;
export declare function Defer<T>(): Deferred<T>;
export declare function Resolved<T>(val?: T): Promise<T>;
export declare function Rejected<T>(val?: any): Promise<T>;
export interface Deferred<T> {
    resolve(obj?: T): Deferred<T>;
    reject(obj?: any): Deferred<T>;
    promise(): Promise<T>;
    onCancel(callback: CancelFunc): Deferred<T>;
}
export interface Thenable<T> {
    then<U>(successFunc: SuccessFunc<T, U>, errorFunc?: ErrorFunc<U>): Promise<U>;
}
export interface Promise<T> extends Thenable<T> {
    finally(func: (value: T|any) => void): Promise<T>;
    always<U>(func: (value: T|any) => U | Thenable<U>): Promise<U>;
    done(successFunc: (value: T) => void): Promise<T>;
    fail(errorFunc: (error: any) => void): Promise<T>;
    cancel(context?: any): void;
}
export declare function whenAll(tasks: Promise<any>[]): Promise<any[]>;
