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
export declare var config: {
    exceptionsToConsole: boolean;
    catchExceptions: boolean;
    exceptionHandler: (ex: Error) => void;
};
export declare function Defer<T>(): Deferred<T>;
export declare function Resolved<T>(val?: T): Promise<T>;
export declare function Rejected<T>(val?: any): Promise<T>;
export interface Deferred<T> {
    resolve(obj?: T): Deferred<T>;
    reject(obj?: any): Deferred<T>;
    promise(): Promise<T>;
}
export interface Thenable<T> {
    then<U>(successFunc: (value: T) => U | Promise<U>, errorFunc?: (error: any) => U | Promise<U>): Promise<U>;
}
export interface Promise<T> extends Thenable<T> {
    finally(func: (value: T) => any): Promise<T>;
    always(func: (value: T) => any): Promise<T>;
    done<U>(successFunc: (value: T) => U | Promise<U>): Promise<T>;
    fail<U>(errorFunc: (error: any) => U | Promise<U>): Promise<T>;
}
export declare module Internal {
    interface CallbackSet {
        successFunc?: (T) => any;
        failFunc?: (any) => any;
        finallyFunc?: (any) => any;
        task?: Deferred<any>;
    }
    class SyncTask<T> implements Deferred<T>, Promise<T> {
        private _storedResolution;
        private _storedErrResolution;
        protected _completedSuccess: boolean;
        protected _completedFail: boolean;
        private _resolving;
        private _storedCallbackSets;
        protected _addCallbackSet<U>(set: CallbackSet): Promise<U>;
        protected _makeTask<U>(): Deferred<U>;
        then<U>(successFunc: (value: T) => U | Deferred<U>, errorFunc?: (error: any) => U | Deferred<U>): Promise<U>;
        always(func: (value: T) => any): Promise<T>;
        finally(func: (value: T) => any): Promise<T>;
        done(successFunc: (value: T) => void): Promise<T>;
        fail(errorFunc: (error: any) => void): Promise<T>;
        resolve(obj?: T): Deferred<T>;
        reject(obj?: any): Deferred<T>;
        promise(): Promise<T>;
        private _resolveSuccesses();
        private _resolveFailures();
    }
}
export declare function whenAll(tasks: Promise<any>[]): Promise<any[]>;
