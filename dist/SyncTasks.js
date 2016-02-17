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
exports.config = {
    // If we catch exceptions in success/fail blocks, it silently falls back to the fail case of the outer promise.
    // If this is global variable is true, it will also spit out a console.error with the exception for debugging.
    exceptionsToConsole: true,
    // Whether or not to actually attempt to catch exceptions with try/catch blocks inside the resolution cases.
    // Disable this for debugging when you'd rather the debugger caught the exception synchronously rather than
    // digging through a stack trace.
    catchExceptions: true,
    exceptionHandler: null
};
function isThenable(object) {
    return object !== null && object !== void 0 && typeof object.then === 'function';
}
// Any try/catch/finally block in a function makes the entire function ineligible for optimization is most JS engines.
function attempt(trier, catcher) {
    try {
        return trier();
    }
    catch (e) {
        return catcher(e);
    }
}
// Runs trier(). If config.catchExceptions is set then any exception is caught and handed to catcher.
function run(trier, catcher) {
    if (exports.config.catchExceptions) {
        return attempt(trier, catcher);
    }
    else {
        return trier();
    }
}
function Defer() {
    return new Internal.SyncTask();
}
exports.Defer = Defer;
function Resolved(val) {
    return new Internal.SyncTask().resolve(val).promise();
}
exports.Resolved = Resolved;
function Rejected(val) {
    return new Internal.SyncTask().reject(val).promise();
}
exports.Rejected = Rejected;
var Internal;
(function (Internal) {
    var SyncTask = (function () {
        function SyncTask() {
            this._completedSuccess = false;
            this._completedFail = false;
            this._resolving = false;
            this._storedCallbackSets = [];
        }
        SyncTask.prototype._addCallbackSet = function (set) {
            var task = this._makeTask();
            set.task = task;
            this._storedCallbackSets.push(set);
            // The _resolve* functions handle callbacks being added while they are running.
            if (!this._resolving) {
                if (this._completedSuccess) {
                    this._resolveSuccesses();
                }
                else if (this._completedFail) {
                    this._resolveFailures();
                }
            }
            return task.promise();
        };
        SyncTask.prototype._makeTask = function () {
            return new SyncTask();
        };
        SyncTask.prototype.then = function (successFunc, errorFunc) {
            return this._addCallbackSet({
                successFunc: successFunc,
                failFunc: errorFunc
            });
        };
        SyncTask.prototype.always = function (func) {
            return this._addCallbackSet({
                successFunc: func,
                failFunc: func
            });
        };
        // Finally should let you inspect the value of the promise as it passes through without affecting the then chaining
        // i.e. a failed promise with a finally after it should then chain to the fail case of the next then
        SyncTask.prototype.finally = function (func) {
            return this._addCallbackSet({
                finallyFunc: func
            });
        };
        SyncTask.prototype.done = function (successFunc) {
            this.then(successFunc);
            return this;
        };
        SyncTask.prototype.fail = function (errorFunc) {
            this.then(null, errorFunc);
            return this;
        };
        SyncTask.prototype.resolve = function (obj) {
            if (this._completedSuccess || this._completedFail) {
                throw 'Already Completed';
            }
            this._completedSuccess = true;
            this._storedResolution = obj;
            this._resolveSuccesses();
            return this;
        };
        SyncTask.prototype.reject = function (obj) {
            if (this._completedSuccess || this._completedFail) {
                throw 'Already Completed';
            }
            this._completedFail = true;
            this._storedErrResolution = obj;
            this._resolveFailures();
            return this;
        };
        SyncTask.prototype.promise = function () {
            return this;
        };
        SyncTask.prototype._resolveSuccesses = function () {
            var _this = this;
            this._resolving = true;
            // Only iterate over the current list of callbacks.
            var callbacks = this._storedCallbackSets;
            this._storedCallbackSets = [];
            callbacks.forEach(function (callback) {
                if (callback.successFunc) {
                    run(function () {
                        var ret = callback.successFunc(_this._storedResolution);
                        if (isThenable(ret)) {
                            var newTask = ret;
                            // The success block of a then returned a new promise, so 
                            newTask.then(function (r) { callback.task.resolve(r); }, function (e) { callback.task.reject(e); });
                        }
                        else {
                            callback.task.resolve(ret);
                        }
                    }, function (e) {
                        _this._handleException(e, 'SyncTask caught exception in success block: ' + e.toString());
                        callback.task.reject(e);
                    });
                }
                else if (callback.finallyFunc) {
                    run(function () {
                        var ret = callback.finallyFunc(_this._storedResolution);
                        if (isThenable(ret)) {
                            var newTask = ret;
                            // The finally returned a new promise, so wait for it to run first
                            var alwaysMethod = function () { callback.task.resolve(_this._storedResolution); };
                            // We use "then" here to emulate "always" because isThenable only
                            // checks if the object has a "then", not an "always".
                            newTask.then(alwaysMethod, alwaysMethod);
                        }
                        else {
                            callback.task.resolve(_this._storedResolution);
                        }
                    }, function (e) {
                        _this._handleException(e, 'SyncTask caught exception in success finally block: ' + e.toString());
                        callback.task.resolve(_this._storedResolution);
                    });
                }
                else {
                    callback.task.resolve(_this._storedResolution);
                }
            });
            this._resolving = false;
            // Handle any callbacks added while the above loop was running.
            if (this._storedCallbackSets.length) {
                this._resolveSuccesses();
            }
        };
        SyncTask.prototype._resolveFailures = function () {
            var _this = this;
            this._resolving = true;
            // Only iterate over the current list of callbacks.
            var callbacks = this._storedCallbackSets;
            this._storedCallbackSets = [];
            callbacks.forEach(function (callback) {
                if (callback.failFunc) {
                    run(function () {
                        var ret = callback.failFunc(_this._storedErrResolution);
                        if (isThenable(ret)) {
                            var newTask = ret;
                            newTask.then(function (r) { callback.task.resolve(r); }, function (e) { callback.task.reject(e); });
                        }
                        else if (typeof (ret) !== 'undefined' && ret !== null) {
                            callback.task.resolve(ret);
                        }
                        else {
                            callback.task.reject(void 0);
                        }
                    }, function (e) {
                        _this._handleException(e, 'SyncTask caught exception in failure block: ' + e.toString());
                        callback.task.reject(e);
                    });
                }
                else if (callback.finallyFunc) {
                    run(function () {
                        var ret = callback.finallyFunc(_this._storedErrResolution);
                        if (isThenable(ret)) {
                            var newTask = ret;
                            // The finally returned a new promise, so wait for it to run first
                            var alwaysMethod = function () { callback.task.reject(_this._storedErrResolution); };
                            // We use "then" here to emulate "always" because isThenable only
                            // checks if the object has a "then", not an "always".
                            newTask.then(alwaysMethod, alwaysMethod);
                        }
                        else {
                            callback.task.reject(_this._storedErrResolution);
                        }
                    }, function (e) {
                        _this._handleException(e, 'SyncTask caught exception in failure finally block: ' + e.toString());
                        callback.task.reject(_this._storedErrResolution);
                    });
                }
                else {
                    callback.task.reject(_this._storedErrResolution);
                }
            });
            this._resolving = false;
            // Handle any callbacks added while the above loop was running.
            if (this._storedCallbackSets.length) {
                this._resolveFailures();
            }
        };
        SyncTask.prototype._handleException = function (e, message) {
            if (exports.config.exceptionsToConsole) {
                console.error(message);
            }
            if (exports.config.exceptionHandler) {
                exports.config.exceptionHandler(e);
            }
        };
        return SyncTask;
    })();
    Internal.SyncTask = SyncTask;
})(Internal = exports.Internal || (exports.Internal = {}));
function whenAll(tasks) {
    if (tasks.length === 0) {
        return Resolved([]);
    }
    var outTask = Defer();
    var countRemaining = tasks.length;
    var foundError = null;
    var results = Array(tasks.length);
    var checkFinish = function () {
        if (--countRemaining === 0) {
            if (foundError !== null) {
                outTask.reject(foundError);
            }
            else {
                outTask.resolve(results);
            }
        }
    };
    tasks.forEach(function (task, index) {
        if (isThenable(task)) {
            task.then(function (res) {
                results[index] = res;
                checkFinish();
            }, function (err) {
                if (foundError === null) {
                    foundError = (err !== null) ? err : true;
                }
                checkFinish();
            });
        }
        else {
            // Not a task, so resolve directly with the item
            results[index] = task;
            checkFinish();
        }
    });
    return outTask.promise();
}
exports.whenAll = whenAll;
