/**
 * SyncTasksInternal.ts
 * Author: David de Regt
 * Copyright: Microsoft 2015
 *
 * Internal implementation for SyncTasks. Clients should use SyncTasks instead of this.
 */

module SyncTasksInternal {
    export var config = {
        // If we catch exceptions in success/fail blocks, it silently falls back to the fail case of the outer promise.
        // If this is global variable is true, it will also spit out a console.error with the exception for debugging.
        exceptionsToConsole: true,

        // Whether or not to actually attempt to catch exceptions with try/catch blocks inside the resolution cases.
        // Disable this for debugging when you'd rather the debugger caught the exception synchronously rather than
        // digging through a stack trace.
        catchExceptions: true,

        exceptionHandler: <(ex: Error) => void> null
    };

    export function Defer<T>(): Deferred<T> {
        return new SyncTask<T>();
    }

    export function Resolved<T>(val?: T): Promise<T> {
        return new SyncTask<T>().resolve(val).promise();
    }

    export function Rejected<T>(val?: any): Promise<T> {
        return new SyncTask<T>().reject(val).promise();
    }

    export interface Deferred<T> {
        resolve(obj?: T): Deferred<T>;

        reject(obj?: any): Deferred<T>;

        promise(): Promise<T>;
    }

    export interface Promise<T> {
        then<U>(successFunc: (value: T) => U | Promise<U>, errorFunc?: (error: any) => U | Promise<U>): Promise<U>;

        finally(func: (value: T) => any): Promise<T>;

        always(func: (value: T) => any): Promise<T>;

        done<U>(successFunc: (value: T) => U | Promise<U>): Promise<T>;

        fail<U>(errorFunc: (error: any) => U | Promise<U>): Promise<T>;
    }

    export interface Task<T> extends Deferred<T>, Promise<T> { }

    export interface CallbackSet {
        successFunc?: (T) => any;
        failFunc?: (any) => any;
        finallyFunc?: (any) => any;
        task?: Deferred<any>;
    }

    export class SyncTask<T> implements Task<T> {
        private _storedResolution: T;
        private _storedErrResolution: any;
        protected _completedSuccess = false;
        protected _completedFail = false;

        private _storedCallbackSets: CallbackSet[] = [];

        protected _addCallbackSet<U>(set: CallbackSet): Promise<U> {
            const task = this._makeTask<U>();
            set.task = task;
            this._storedCallbackSets.push(set);

            if (this._completedSuccess) {
                this._resolveSuccesses();
            } else if (this._completedFail) {
                this._resolveFailures();
            }

            return task.promise();
        }

        protected _makeTask<U>(): Deferred<U> {
            return new SyncTask<U>();
        }

        then<U>(successFunc: (value: T) => U | Deferred<U>, errorFunc?: (error: any) => U | Deferred<U>): Promise<U> {
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

        promise(): Promise<T> {
            return this;
        }

        private _resolveSuccesses() {
            this._storedCallbackSets.forEach(callback => {
                if (callback.successFunc) {
                    let runner = () => {
                        let ret = callback.successFunc(this._storedResolution);
                        if (ret instanceof SyncTask) {
                            let newTask = <SyncTask<any>>ret;
                            // The success block of a then returned a new promise, so 
                            newTask.then(r => { callback.task.resolve(r); }, e => { callback.task.reject(e); });
                        } else {
                            callback.task.resolve(ret);
                        }
                    };
                    if (config.catchExceptions) {
                        try {
                            runner();
                        } catch (e) {
                            if (config.exceptionsToConsole) {
                                console.error('SyncTask caught exception in success block: ' + e.toString());
                            }
                            if (config.exceptionHandler) {
                                config.exceptionHandler(e);
                            }
                            callback.task.reject(e);
                        }
                    } else {
                        runner();
                    }
                } else if (callback.finallyFunc) {
                    let runner = () => {
                        let ret = callback.finallyFunc(this._storedResolution);
                        if (ret instanceof SyncTask) {
                            let newTask = <SyncTask<any>>ret;
                            // The finally returned a new promise, so wait for it to run first
                            newTask.always(() => { callback.task.resolve(this._storedResolution); });
                        } else {
                            callback.task.resolve(this._storedResolution);
                        }
                    };
                    if (config.catchExceptions) {
                        try {
                            runner();
                        } catch (e) {
                            if (config.exceptionsToConsole) {
                                console.error('SyncTask caught exception in success finally block: ' + e.toString());
                            }
                            if (config.exceptionHandler) {
                                config.exceptionHandler(e);
                            }
                            callback.task.resolve(this._storedResolution);
                        }
                    } else {
                        runner();
                    }
                } else {
                    callback.task.resolve(this._storedResolution);
                }
            });
            this._storedCallbackSets = [];
        }

        private _resolveFailures() {
            this._storedCallbackSets.forEach(callback => {
                if (callback.failFunc) {
                    let runner = () => {
                        let ret = callback.failFunc(this._storedErrResolution);
                        if (ret instanceof SyncTask) {
                            let newTask = <SyncTask<any>>ret;
                            newTask.then(r => { callback.task.resolve(r); }, e => { callback.task.reject(e); });
                        } else if (typeof (ret) !== 'undefined' && ret !== null) {
                            callback.task.resolve(<any>ret);
                        } else {
                            callback.task.reject(void 0);
                        }
                    };
                    if (config.catchExceptions) {
                        try {
                            runner();
                        } catch (e) {
                            if (config.exceptionsToConsole) {
                                console.error('SyncTask caught exception in failure block: ' + e.toString());
                            }
                            if (config.exceptionHandler) {
                                config.exceptionHandler(e);
                            }
                            callback.task.reject(e);
                        }
                    } else {
                        runner();
                    }
                } else if (callback.finallyFunc) {
                    let runner = () => {
                        let ret = callback.finallyFunc(this._storedErrResolution);
                        if (ret instanceof SyncTask) {
                            let newTask = <SyncTask<any>>ret;
                            // The finally returned a new promise, so wait for it to run first
                            newTask.always(() => { callback.task.reject(this._storedErrResolution); });
                        } else {
                            callback.task.reject(this._storedErrResolution);
                        }
                    };
                    if (config.catchExceptions) {
                        try {
                            runner();
                        } catch (e) {
                            if (config.exceptionsToConsole) {
                                console.error('SyncTask caught exception in failure finally block: ' + e.toString());
                            }
                            if (config.exceptionHandler) {
                                config.exceptionHandler(e);
                            }
                            callback.task.reject(this._storedErrResolution);
                        }
                    } else {
                        runner();
                    }
                } else {
                    callback.task.reject(this._storedErrResolution);
                }
            });
            this._storedCallbackSets = [];
        }
    }

    export function whenAll(tasks: Promise<any>[]): Promise<any[]> {
        let outTask = new SyncTask<any[]>();

        if (tasks.length === 0) {
            outTask.resolve([]);
        } else {
            let countRemaining = tasks.length;
            let foundError: any = null;
            let results: any[] = Array(tasks.length);

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
                if (task && task instanceof SyncTask) {
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
        }

        return outTask;
    }
}

export = SyncTasksInternal;
