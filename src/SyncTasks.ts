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

export const config = {
    // If we catch exceptions in success/fail blocks, it silently falls back to the fail case of the outer promise.
    // If this is global variable is true, it will also spit out a console.error with the exception for debugging.
    exceptionsToConsole: true,

    // Whether or not to actually attempt to catch exceptions with try/catch blocks inside the resolution cases.
    // Disable this for debugging when you'd rather the debugger caught the exception synchronously rather than
    // digging through a stack trace.
    catchExceptions: true,

    exceptionHandler: <(ex: Error) => void>null
};

function isThenable(object): boolean {
    return object !== null && object !== void 0 && typeof object.then === 'function';
}

// Any try/catch/finally block in a function makes the entire function ineligible for optimization is most JS engines.
function attempt<T, C extends any>(trier: () => T, catcher?: (e: Error) => C): T|C {
    try {
        return trier();
    } catch (e) {
        return catcher(e);
    }
}

// Runs trier(). If config.catchExceptions is set then any exception is caught and handed to catcher.
function run<T, C extends any>(trier: () => T, catcher?: (e: Error) => C): T | C {
    if (config.catchExceptions) {
        return attempt(trier, catcher);
    } else {
        return trier();
    }
}

export type SuccessFunc<T, U> = (value: T) => U | Promise<U>;
export type ErrorFunc<U> = (error: any) => U | Promise<U>;
export type CancelFunc = (context: any) => void;

export function Defer<T>(): Deferred<T> {
    return new Internal.SyncTask<T>();
}

export function Resolved<T>(val?: T): Promise<T> {
    return new Internal.SyncTask<T>().resolve(val).promise();
}

export function Rejected<T>(val?: any): Promise<T> {
    return new Internal.SyncTask<T>().reject(val).promise();
}

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
    finally(func: (value: T) => any): Promise<T>;

    always(func: (value: T) => any): Promise<T>;

    done<U>(successFunc: SuccessFunc<T, U>): Promise<T>;

    fail<U>(errorFunc: ErrorFunc<U>): Promise<T>;

    // Will call any cancellation lambdas up the call chain, and reject a chain up the fail blocks
    cancel(context?: any): void;
}

export module Internal {
    export interface CallbackSet<T, U> {
        successFunc?: SuccessFunc<T, U>;
        failFunc?: ErrorFunc<U>;
        finallyFunc?: (value: T) => any;
        task?: Deferred<any>;
    }

    export class SyncTask<T> implements Deferred<T>, Promise<T> {
        private _storedResolution: T;
        private _storedErrResolution: any;
        private _completedSuccess = false;
        private _completedFail = false;

        private _cancelCallbacks: CancelFunc[] = [];
        private _cancelContext: any;
        private _wasCanceled = false;

        private _resolving = false;

        private _storedCallbackSets: CallbackSet<T, any>[] = [];

        private _addCallbackSet<U>(set: CallbackSet<T, U>): Promise<U> {
            const task = new SyncTask<U>();
            task.onCancel(this.cancel.bind(this));
            set.task = task;
            this._storedCallbackSets.push(set);

            // The _resolve* functions handle callbacks being added while they are running.
            if (!this._resolving) {
                if (this._completedSuccess) {
                    this._resolveSuccesses();
                } else if (this._completedFail) {
                    this._resolveFailures();
                }
            }

            return task.promise();
        }

        onCancel(callback: CancelFunc): Deferred<T> {
            if (this._wasCanceled) {
                callback(this._cancelContext);
            } else {
                this._cancelCallbacks.push(callback);
            }

            return this;
        }

        then<U>(successFunc: SuccessFunc<T, U>, errorFunc?: ErrorFunc<U>): Promise<U> {
            return this._addCallbackSet<U>({
                successFunc: successFunc,
                failFunc: errorFunc
            });
        }

        always(func: (value: T) => any): Promise<T> {
            return this._addCallbackSet<T>({
                successFunc: func,
                failFunc: func
            });
        }

        // Finally should let you inspect the value of the promise as it passes through without affecting the then chaining
        // i.e. a failed promise with a finally after it should then chain to the fail case of the next then
        finally(func: (value: T) => any): Promise<T> {
            return this._addCallbackSet<T>({
                finallyFunc: func
            });
        }

        done(successFunc: (value: T) => void): Promise<T> {
            this.then(successFunc);
            return this;
        }

        fail(errorFunc: (error: any) => void): Promise<T> {
            this.then(null, errorFunc);
            return this;
        }

        resolve(obj?: T): Deferred<T> {
            if (this._completedSuccess || this._completedFail) {
                throw 'Already Completed';
            }
            this._completedSuccess = true;
            this._storedResolution = obj;

            this._resolveSuccesses();

            return this;
        }

        reject(obj?: any): Deferred<T> {
            if (this._completedSuccess || this._completedFail) {
                throw 'Already Completed';
            }
            this._completedFail = true;
            this._storedErrResolution = obj;

            this._resolveFailures();

            return this;
        }

        cancel(context?: any): void {
            if (this._wasCanceled) {
                throw 'Already Canceled';
            }

            this._wasCanceled = true;
            this._cancelContext = context;

            if (this._cancelCallbacks.length > 0) {
                this._cancelCallbacks.forEach(callback => {
                    callback(this._cancelContext);
                });
            }
        }

        promise(): Promise<T> {
            return this;
        }

        private _resolveSuccesses() {
            this._resolving = true;

            // Only iterate over the current list of callbacks.
            const callbacks = this._storedCallbackSets;
            this._storedCallbackSets = [];

            callbacks.forEach(callback => {
                if (callback.successFunc) {
                    run(() => {
                        const ret = callback.successFunc(this._storedResolution);
                        if (isThenable(ret)) {
                            const newTask = <Thenable<any>>ret;
                            // The success block of a then returned a new promise, so 
                            newTask.then(r => { callback.task.resolve(r); }, e => { callback.task.reject(e); });
                        } else {
                            callback.task.resolve(ret);
                        }
                    }, e => {
                        this._handleException(e, 'SyncTask caught exception in success block: ' + e.toString());
                        callback.task.reject(e);
                    });
                } else if (callback.finallyFunc) {
                    run(() => {
                        const ret = callback.finallyFunc(this._storedResolution);
                        if (isThenable(ret)) {
                            const newTask = <Thenable<any>>ret;

                            // The finally returned a new promise, so wait for it to run first
                            const alwaysMethod = () => { callback.task.resolve(this._storedResolution); };

                            // We use "then" here to emulate "always" because isThenable only
                            // checks if the object has a "then", not an "always".
                            newTask.then(alwaysMethod, alwaysMethod);
                        } else {
                            callback.task.resolve(this._storedResolution);
                        }
                    }, e => {
                        this._handleException(e, 'SyncTask caught exception in success finally block: ' + e.toString());
                        callback.task.resolve(this._storedResolution);
                    });
                } else {
                    callback.task.resolve(this._storedResolution);
                }
            });

            this._resolving = false;

            // Handle any callbacks added while the above loop was running.
            if (this._storedCallbackSets.length) {
                this._resolveSuccesses();
            }
        }

        private _resolveFailures() {
            this._resolving = true;

            // Only iterate over the current list of callbacks.
            const callbacks = this._storedCallbackSets;
            this._storedCallbackSets = [];

            callbacks.forEach(callback => {
                if (callback.failFunc) {
                    run(() => {
                        const ret = callback.failFunc(this._storedErrResolution);
                        if (isThenable(ret)) {
                            const newTask = <Thenable<any>>ret;
                            newTask.then(r => { callback.task.resolve(r); }, e => { callback.task.reject(e); });
                        } else if (typeof (ret) !== 'undefined' && ret !== null) {
                            callback.task.resolve(ret);
                        } else {
                            callback.task.reject(void 0);
                        }
                    }, e => {
                        this._handleException(e, 'SyncTask caught exception in failure block: ' + e.toString());
                        callback.task.reject(e);
                    });
                } else if (callback.finallyFunc) {
                    run(() => {
                        const ret = callback.finallyFunc(this._storedErrResolution);
                        if (isThenable(ret)) {
                            const newTask = <Thenable<any>>ret;

                            // The finally returned a new promise, so wait for it to run first
                            const alwaysMethod = () => { callback.task.reject(this._storedErrResolution); };

                            // We use "then" here to emulate "always" because isThenable only
                            // checks if the object has a "then", not an "always".
                            newTask.then(alwaysMethod, alwaysMethod);

                        } else {
                            callback.task.reject(this._storedErrResolution);
                        }
                    }, e => {
                        this._handleException(e, 'SyncTask caught exception in failure finally block: ' + e.toString());
                        callback.task.reject(this._storedErrResolution);
                    });
                } else {
                    callback.task.reject(this._storedErrResolution);
                }
            });

            this._resolving = false;

            // Handle any callbacks added while the above loop was running.
            if (this._storedCallbackSets.length) {
                this._resolveFailures();
            }
        }

        private _handleException(e: Error, message: string): void {
            if (config.exceptionsToConsole) {
                console.error(message);
            }
            if (config.exceptionHandler) {
                config.exceptionHandler(e);
            }
        }
    }
}

export function whenAll(tasks: Promise<any>[]): Promise<any[]> {
    if (tasks.length === 0) {
        return Resolved<any[]>([]);
    }

    const outTask = Defer<any[]>();
    let countRemaining = tasks.length;
    let foundError: any = null;
    const results = Array(tasks.length);

    const checkFinish = () => {
        if (--countRemaining === 0) {
            if (foundError !== null) {
                outTask.reject(foundError);
            } else {
                outTask.resolve(results);
            }
        }
    };

    tasks.forEach((task, index) => {
        if (isThenable(task)) {
            task.then(res => {
                results[index] = res;
                checkFinish();
            }, err => {
                if (foundError === null) {
                    foundError = (err !== null) ? err : true;
                }
                checkFinish();
            });
        } else {
            // Not a task, so resolve directly with the item
            results[index] = task;
            checkFinish();
        }
    });

    return outTask.promise();
}
