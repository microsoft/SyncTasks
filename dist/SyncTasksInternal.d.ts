/**
 * SyncTasksInternal.ts
 * Author: David de Regt
 * Copyright: Microsoft 2015
 *
 * Internal implementation for SyncTasks. Clients should use SyncTasks instead of this.
 */
declare module SyncTasksInternal {
    var config: {
        exceptionsToConsole: boolean;
        catchExceptions: boolean;
        exceptionHandler: (ex: Error) => void;
    };
    function Defer<T>(): Deferred<T>;
    function Resolved<T>(val?: T): Promise<T>;
    function Rejected<T>(val?: any): Promise<T>;
    interface Deferred<T> {
        resolve(obj?: T): Deferred<T>;
        reject(obj?: any): Deferred<T>;
        promise(): Promise<T>;
    }
    interface Promise<T> {
        then<U>(successFunc: (value: T) => U | Promise<U>, errorFunc?: (error: any) => U | Promise<U>): Promise<U>;
        finally(func: (value: T) => any): Promise<T>;
        always(func: (value: T) => any): Promise<T>;
        done<U>(successFunc: (value: T) => U | Promise<U>): Promise<T>;
        fail<U>(errorFunc: (error: any) => U | Promise<U>): Promise<T>;
    }
    interface Task<T> extends Deferred<T>, Promise<T> {
    }
    interface CallbackSet {
        successFunc?: (T) => any;
        failFunc?: (any) => any;
        finallyFunc?: (any) => any;
        task?: Deferred<any>;
    }
    class SyncTask<T> implements Task<T> {
        private _storedResolution;
        private _storedErrResolution;
        protected _completedSuccess: boolean;
        protected _completedFail: boolean;
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
    function whenAll(tasks: Promise<any>[]): Promise<any[]>;
}
export = SyncTasksInternal;
