/// <reference path="dependencies.d.ts"/>
"use strict";
var assert = require('assert');
var SyncTasks = require('../SyncTasks');
describe('SyncTasks', function () {
    function noop() { }
    // Amount of time to wait to ensure all sync and trivially async (e.g. setTimeout(..., 0)) things have finished.
    // Useful to do something 'later'.
    var waitTime = 25;
    it('Simple - null resolve after then', function (done) {
        var task = SyncTasks.Defer();
        task.promise().then(function (val) {
            assert.equal(val, null);
            done();
        }, function (err) {
            assert(false);
        });
        task.resolve(null);
    });
    it('Simple - null then after resolve', function (done) {
        var task = SyncTasks.Defer();
        task.resolve(null);
        task.promise().then(function (val) {
            assert.equal(val, null);
            done();
        }, function (err) {
            assert(false);
        });
    });
    it('Simple - reject', function (done) {
        var task = SyncTasks.Defer();
        task.reject(2);
        task.promise().then(function (val) {
            assert(false);
        }, function (err) {
            assert.equal(err, 2);
            done();
        });
    });
    it('Chain from success to success with value', function (done) {
        var task = SyncTasks.Defer();
        task.promise().then(function (val) {
            assert.equal(val, 3);
            return 4;
        }, function (err) {
            assert(false);
            return null;
        }).then(function (val) {
            assert.equal(val, 4);
            done();
        }, function (err) {
            assert(false);
        });
        task.resolve(3);
    });
    it('Chain from error to success with value', function (done) {
        var task = SyncTasks.Defer();
        task.promise().then(function (val) {
            assert(false);
            return -1;
        }, function (err) {
            assert.equal(err, 2);
            return 4;
        }).then(function (val) {
            assert.equal(val, 4);
            done();
        }, function (err) {
            assert(false);
        });
        task.reject(2);
    });
    it('Chain from success to success with promise', function (done) {
        var task = SyncTasks.Defer();
        task.promise().then(function (val) {
            assert.equal(val, 3);
            return SyncTasks.Resolved(4);
        }, function (err) {
            assert(false);
            return -1;
        }).then(function (val) {
            assert.equal(val, 4);
            done();
        }, function (err) {
            assert(false);
        });
        task.resolve(3);
    });
    it('Chain from error to success with promise', function (done) {
        var task = SyncTasks.Defer();
        task.promise().then(function (val) {
            assert(false);
            return -1;
        }, function (err) {
            assert.equal(err, 3);
            return SyncTasks.Resolved(4);
        }).then(function (val) {
            assert.equal(val, 4);
            done();
        }, function (err) {
            assert(false);
        });
        task.reject(3);
    });
    it('Chain from success to error with promise', function (done) {
        var task = SyncTasks.Defer();
        task.promise().then(function (val) {
            assert.equal(val, 2);
            return SyncTasks.Rejected(4);
        }, function (err) {
            assert(false);
            return -1;
        }).then(function (val) {
            assert(false);
        }, function (err) {
            assert.equal(err, 4);
            done();
        });
        task.resolve(2);
    });
    it('Chain from error to error with promise', function (done) {
        var task = SyncTasks.Defer();
        task.promise().then(function (val) {
            assert(false);
            return -1;
        }, function (err) {
            assert.equal(err, 2);
            return SyncTasks.Rejected(4);
        }).then(function (val) {
            assert(false);
        }, function (err) {
            assert.equal(err, 4);
            done();
        });
        task.reject(2);
    });
    it('Chain from success to promise to success with promise', function (done) {
        var task = SyncTasks.Defer();
        task.promise().then(function (val) {
            assert.equal(val, 3);
            var itask = SyncTasks.Resolved(4);
            return itask.then(function (val2) {
                assert.equal(val2, 4, 'inner');
                return 5;
            });
        }, function (err) {
            assert(false);
            return null;
        }).then(function (val) {
            assert.equal(val, 5, 'outer');
            done();
        }, function (err) {
            assert(false);
        });
        task.resolve(3);
    });
    it('Exception in success to error', function (done) {
        var task = SyncTasks.Defer();
        SyncTasks.config.exceptionsToConsole = false;
        task.promise().then(function (val) {
            var blah = null;
            blah.blowup();
        }, function (err) {
            assert(false);
        }).then(function (val) {
            assert(false);
        }, function (err) {
            SyncTasks.config.exceptionsToConsole = true;
            done();
        });
        task.resolve(3);
    });
    it('Exception in error to error', function (done) {
        var task = SyncTasks.Defer();
        SyncTasks.config.exceptionsToConsole = false;
        task.promise().then(function (val) {
            assert(false);
        }, function (err) {
            var blah = null;
            blah.blowup();
        }).then(function (val) {
            assert(false);
        }, function (err) {
            SyncTasks.config.exceptionsToConsole = true;
            done();
        });
        task.reject(3);
    });
    it('"done" basic', function (done) {
        var task = SyncTasks.Defer();
        task.promise().then(function (val) {
            return 4;
        }, function (err) {
            assert(false);
            return -1;
        }).done(function (val) {
            assert.equal(val, 4);
            return 2; // should be ignored
        }).then(function (val) {
            assert.equal(val, 4);
            done();
        }, function (err) {
            assert(false);
        });
        task.resolve(3);
    });
    it('"done" does not chain', function (done) {
        var task = SyncTasks.Defer();
        var innertask = SyncTasks.Defer();
        var innerFinished = false;
        task.promise().then(function (val) {
            return 4;
        }, function (err) {
            assert(false);
            return -1;
        }).done(function (val) {
            assert.equal(val, 4);
            return innertask.promise().then(function () {
                innerFinished = true;
                return 2; // should be ignored
            });
        }).then(function (val) {
            assert(!innerFinished);
            assert.equal(val, 4);
            done();
        }, function (err) {
            assert(false);
        });
        task.resolve(3);
        innertask.resolve(1);
    });
    it('Finally basic', function (done) {
        var task = SyncTasks.Defer();
        task.promise().then(function (val) {
            return 4;
        }, function (err) {
            assert(false);
            return -1;
        }).finally(function (val) {
            assert.equal(val, 4);
            return 2; // should be ignored
        }).then(function (val) {
            assert.equal(val, 4);
            done();
        }, function (err) {
            assert(false);
        });
        task.resolve(3);
    });
    it('Finally does not chain', function (done) {
        var task = SyncTasks.Defer();
        var innertask = SyncTasks.Defer();
        var innerFinished = false;
        task.promise().then(function (val) {
            return 4;
        }, function (err) {
            assert(false);
            return -1;
        }).finally(function (val) {
            assert.equal(val, 4);
            return innertask.promise().then(function () {
                innerFinished = true;
                return 2; // should be ignored
            });
        }).then(function (val) {
            assert(!innerFinished);
            assert.equal(val, 4);
            done();
        }, function (err) {
            assert(false);
        });
        task.resolve(3);
        innertask.resolve(1);
    });
    it('"all" basic success', function (done) {
        var task = SyncTasks.Defer();
        var task2 = SyncTasks.Defer();
        var task3 = SyncTasks.Defer();
        var task4 = SyncTasks.Defer();
        SyncTasks.all([task.promise(), task2.promise(), task3.promise(), task4.promise()]).then(function (rets) {
            assert.equal(rets.length, 4);
            assert.equal(rets[0], 1);
            assert.equal(rets[1], 2);
            assert.equal(rets[2], 3);
            assert.equal(rets[3], 4);
            done();
        }, function (err) {
            assert(false);
        });
        task.resolve(1);
        task2.resolve(2);
        task3.resolve(3);
        task4.resolve(4);
    });
    it('"all" basic failure', function (done) {
        var task = SyncTasks.Defer();
        var task2 = SyncTasks.Defer();
        SyncTasks.all([task.promise(), task2.promise()]).then(function (rets) {
            assert(false);
        }, function (err) {
            done();
        });
        task.resolve(1);
        task2.reject(2);
    });
    it('"all" zero tasks', function (done) {
        SyncTasks.all([]).then(function (rets) {
            assert.equal(rets.length, 0);
            done();
        }, function (err) {
            assert(false);
        });
    });
    it('"all" single null task', function (done) {
        SyncTasks.all([null]).then(function (rets) {
            assert.equal(rets.length, 1);
            done();
        }, function (err) {
            assert(false);
        });
    });
    it('"all" tasks and nulls', function (done) {
        var task = SyncTasks.Defer();
        SyncTasks.all([null, task.promise()]).then(function (rets) {
            assert.equal(rets.length, 2);
            done();
        }, function (err) {
            assert(false);
        });
        task.resolve(1);
    });
    it('"race" basic success', function (done) {
        var task = SyncTasks.Defer();
        var task2 = SyncTasks.Defer();
        var task3 = SyncTasks.Defer();
        var task4 = SyncTasks.Defer();
        SyncTasks.race([task.promise(), task2.promise(), task3.promise(), task4.promise()]).then(function (ret) {
            assert.equal(ret, 1);
            done();
        }, function (err) {
            assert(false);
        });
        task.resolve(1);
        task2.resolve(2);
        task3.resolve(3);
        task4.resolve(4);
    });
    it('"race" basic failure', function (done) {
        var task = SyncTasks.Defer();
        var task2 = SyncTasks.Defer();
        SyncTasks.race([task.promise(), task2.promise()]).then(function (ret) {
            assert(false);
        }, function (err) {
            assert.equal(err, 1);
            done();
        });
        task.reject(1);
        task2.resolve(2);
    });
    it('"race" zero tasks', function (done) {
        SyncTasks.race([]).then(function (ret) {
            assert(false);
        }, function (err) {
            assert(false);
        });
        setTimeout(function () { return done(); }, 20);
    });
    it('"race" single null task', function (done) {
        SyncTasks.race([null]).then(function (ret) {
            assert.equal(ret, null);
            done();
        }, function (err) {
            assert(false);
        });
    });
    it('"race" tasks and nulls', function (done) {
        var task = SyncTasks.Defer();
        SyncTasks.race([null, task.promise()]).then(function (ret) {
            assert.equal(ret, null);
            done();
        }, function (err) {
            assert(false);
        });
        task.resolve(2);
    });
    it('Callbacks resolve synchronously', function (done) {
        var task = SyncTasks.Defer();
        var resolvedCount = 0;
        task.promise().then(function () {
            ++resolvedCount;
        }, function (err) {
            assert(false);
        });
        task.resolve(1);
        assert(resolvedCount === 1);
        done();
    });
    it('Callbacks resolve in order added', function (done) {
        var task = SyncTasks.Defer();
        var resolvedCount = 0;
        task.promise().then(function () {
            assert(resolvedCount === 0);
            ++resolvedCount;
        }, function (err) {
            assert(false);
        });
        task.promise().then(function () {
            assert(resolvedCount === 1);
            ++resolvedCount;
        }, function (err) {
            assert(false);
        });
        task.resolve(1);
        assert(resolvedCount === 2);
        done();
    });
    it('Failure callbacks resolve in order added', function (done) {
        var task = SyncTasks.Defer();
        var rejectedCount = 0;
        task.promise().then(function () {
            assert(false);
        }, function (err) {
            assert(rejectedCount === 0);
            ++rejectedCount;
        });
        task.promise().then(function () {
            assert(false);
        }, function (err) {
            assert(rejectedCount === 1);
            ++rejectedCount;
        });
        task.reject(1);
        assert(rejectedCount === 2);
        done();
    });
    it('"unhandledErrorHandler": Failure without any callback', function (done) {
        var unhandledErrorHandlerCalled = false;
        var oldUnhandledErrorHandler = SyncTasks.config.unhandledErrorHandler;
        SyncTasks.config.unhandledErrorHandler = function () {
            unhandledErrorHandlerCalled = true;
        };
        SyncTasks.Rejected();
        setTimeout(function () {
            SyncTasks.config.unhandledErrorHandler = oldUnhandledErrorHandler;
            assert(unhandledErrorHandlerCalled);
            done();
        }, 20);
    });
    it('"unhandledErrorHandler": Failure with only success callback', function (done) {
        var unhandledErrorHandlerCalled = false;
        var oldUnhandledErrorHandler = SyncTasks.config.unhandledErrorHandler;
        SyncTasks.config.unhandledErrorHandler = function () {
            unhandledErrorHandlerCalled = true;
        };
        SyncTasks.Rejected().then(function () {
            assert(false);
        });
        setTimeout(function () {
            SyncTasks.config.unhandledErrorHandler = oldUnhandledErrorHandler;
            assert(unhandledErrorHandlerCalled);
            done();
        }, 20);
    });
    it('"unhandledErrorHandler": Failure with success callback with failure callback', function (done) {
        var catchBlockReached = false;
        SyncTasks.Rejected().then(function () {
            assert(false);
        }).catch(function () {
            catchBlockReached = true;
        });
        setTimeout(function () {
            assert(catchBlockReached);
            done();
        }, 20);
    });
    it('"unhandledErrorHandler": Success to inner failure without any callback', function (done) {
        var unhandledErrorHandlerCalled = false;
        var oldUnhandledErrorHandler = SyncTasks.config.unhandledErrorHandler;
        SyncTasks.config.unhandledErrorHandler = function () {
            unhandledErrorHandlerCalled = true;
        };
        SyncTasks.Resolved().then(function () {
            return SyncTasks.Rejected();
        });
        setTimeout(function () {
            SyncTasks.config.unhandledErrorHandler = oldUnhandledErrorHandler;
            assert(unhandledErrorHandlerCalled);
            done();
        }, 20);
    });
    it('"unhandledErrorHandler": Failure to inner failure without any callback', function (done) {
        var unhandledErrorHandlerCalled = 0;
        var oldUnhandledErrorHandler = SyncTasks.config.unhandledErrorHandler;
        SyncTasks.config.unhandledErrorHandler = function (n) {
            unhandledErrorHandlerCalled = n;
        };
        SyncTasks.Rejected(1).catch(function () {
            return SyncTasks.Rejected(2);
        });
        // Note: the outer "catch" has no failure handling so the inner error leaks out.
        setTimeout(function () {
            SyncTasks.config.unhandledErrorHandler = oldUnhandledErrorHandler;
            assert.equal(unhandledErrorHandlerCalled, 2);
            done();
        }, 20);
    });
    it('"unhandledErrorHandler": Each chained promise must handle', function (done) {
        var unhandledErrorHandlerCalled = false;
        var catchBlockReached = false;
        var oldUnhandledErrorHandler = SyncTasks.config.unhandledErrorHandler;
        SyncTasks.config.unhandledErrorHandler = function () {
            unhandledErrorHandlerCalled = true;
        };
        var task = SyncTasks.Rejected();
        task.catch(function () {
            catchBlockReached = true;
        });
        // Does not handle failure.
        task.then(function () {
            assert(false);
        });
        setTimeout(function () {
            SyncTasks.config.unhandledErrorHandler = oldUnhandledErrorHandler;
            assert(unhandledErrorHandlerCalled);
            assert(catchBlockReached);
            done();
        }, 20);
    });
    it('"unhandledErrorHandler": "fail" never "handles" the failure', function (done) {
        var unhandledErrorHandlerCalled = false;
        var failBlockReached = false;
        var oldUnhandledErrorHandler = SyncTasks.config.unhandledErrorHandler;
        SyncTasks.config.unhandledErrorHandler = function () {
            unhandledErrorHandlerCalled = true;
        };
        SyncTasks.Rejected().fail(function () {
            failBlockReached = true;
            // If this was .catch, it would resolve the promise (with undefined) and the failure would be handled.
        });
        setTimeout(function () {
            SyncTasks.config.unhandledErrorHandler = oldUnhandledErrorHandler;
            assert(unhandledErrorHandlerCalled);
            assert(failBlockReached);
            done();
        }, 20);
    });
    it('"unhandledErrorHandler": "done" does not create another "unhandled"', function (done) {
        var unhandledErrorHandlerCalled = false;
        var catchBlockReached = false;
        var oldUnhandledErrorHandler = SyncTasks.config.unhandledErrorHandler;
        SyncTasks.config.unhandledErrorHandler = function () {
            unhandledErrorHandlerCalled = true;
        };
        SyncTasks.Rejected().done(function () {
            // Should not create a separate "unhandled" error since there is no way to "handle" it from here.
            // The existing "unhandled" error should continue to be "unhandled", as other tests have verified.
        }).catch(function () {
            // "Handle" the failure.
            catchBlockReached = true;
        });
        setTimeout(function () {
            SyncTasks.config.unhandledErrorHandler = oldUnhandledErrorHandler;
            assert(!unhandledErrorHandlerCalled);
            assert(catchBlockReached);
            done();
        }, 20);
    });
    it('"unhandledErrorHandler": "fail" does not create another "unhandled"', function (done) {
        var unhandledErrorHandlerCalled = false;
        var catchBlockReached = false;
        var oldUnhandledErrorHandler = SyncTasks.config.unhandledErrorHandler;
        SyncTasks.config.unhandledErrorHandler = function () {
            unhandledErrorHandlerCalled = true;
        };
        SyncTasks.Rejected().fail(function () {
            // Should not create a separate "unhandled" error since there is no way to "handle" it from here.
            // The existing "unhandled" error should continue to be "unhandled", as other tests have verified.
        }).catch(function () {
            // "Handle" the failure.
            catchBlockReached = true;
        });
        setTimeout(function () {
            SyncTasks.config.unhandledErrorHandler = oldUnhandledErrorHandler;
            assert(!unhandledErrorHandlerCalled);
            assert(catchBlockReached);
            done();
        }, 20);
    });
    it('Add callback while resolving', function (done) {
        var task = SyncTasks.Defer();
        var promise = task.promise();
        var resolvedCount = 0;
        var innerTask1 = SyncTasks.Defer();
        var innerTask2 = SyncTasks.Defer();
        promise.then(function () {
            // While resolving: add callback to same promise.
            promise.then(function () {
                innerTask2.resolve(++resolvedCount);
            }, function (err) {
                assert(false);
            });
            // This line should be reached before innerTask2 resolves.
            innerTask1.resolve(++resolvedCount);
        }, function (err) {
            assert(false);
        });
        task.resolve(1);
        SyncTasks.all([innerTask1.promise(), innerTask2.promise()]).then(function (rets) {
            assert(rets.length === 2);
            assert(rets[0] === 1);
            assert(rets[1] === 2);
            done();
        }, function (err) {
            assert(false);
        });
    });
    it('Add callback while rejecting', function (done) {
        var task = SyncTasks.Defer();
        var promise = task.promise();
        var rejectedCount = 0;
        var innerTask1 = SyncTasks.Defer();
        var innerTask2 = SyncTasks.Defer();
        promise.then(function () {
            assert(false);
        }, function (err) {
            // While resolving: add callback to same promise.
            promise.then(function () {
                assert(false);
            }, function (err) {
                innerTask2.resolve(++rejectedCount);
            });
            // This line should be reached before innerTask2 resolves.
            innerTask1.resolve(++rejectedCount);
        });
        task.reject(1);
        SyncTasks.all([innerTask1.promise(), innerTask2.promise()]).then(function (rets) {
            assert(rets.length === 2);
            assert(rets[0] === 1);
            assert(rets[1] === 2);
            done();
        }, function (err) {
            assert(false);
        });
    });
    it('Cancel task (happy path)', function () {
        var canceled = false;
        var cancelContext;
        var task = SyncTasks.Defer();
        var promise = task.promise();
        task.onCancel(function (context) {
            canceled = true;
            cancelContext = context;
            task.reject(5);
        });
        promise.cancel(4);
        // Check the cancel caused rejection.
        return promise.then(function () {
            assert(false);
            return SyncTasks.Rejected();
        }, function (err) {
            assert.equal(err, 5);
            assert(canceled);
            assert.equal(cancelContext, 4);
            return SyncTasks.Resolved();
        });
    });
    it('Cancel chain cancels task (bubble up)', function () {
        var canceled = false;
        var cancelContext;
        var task = SyncTasks.Defer();
        var promise = task.promise();
        task.onCancel(function (context) {
            canceled = true;
            cancelContext = context;
            task.reject(5);
        });
        var chain = promise.then(function () {
            assert(false);
            return SyncTasks.Rejected();
        }, function (err) {
            assert.equal(err, 5);
            assert(canceled);
            assert.equal(cancelContext, 4);
            return -1;
        });
        chain.cancel(4);
        // Check the chain cancel caused task rejection.
        return promise.then(function () {
            assert(false);
            return SyncTasks.Rejected();
        }, function (err) {
            assert.equal(err, 5);
            assert(canceled);
            assert.equal(cancelContext, 4);
            return SyncTasks.Resolved();
        });
    });
    it('Cancel deep chain cancels task (bubble up)', function () {
        var canceled = false;
        var cancelContext;
        var task = SyncTasks.Defer();
        var promise = task.promise();
        task.onCancel(function (context) {
            canceled = true;
            cancelContext = context;
            task.reject(5);
        });
        var chain = promise.then(function () {
            assert(false);
            return SyncTasks.Rejected();
        }, function (err) {
            assert.equal(err, 5);
            assert(canceled);
            assert.equal(cancelContext, 4);
            return -1;
        })
            .always(noop)
            .always(noop)
            .always(noop);
        chain.cancel(4);
        // Check the chain cancel caused task rejection.
        return promise.then(function () {
            assert(false);
            return SyncTasks.Rejected();
        }, function (err) {
            assert.equal(err, 5);
            assert(canceled);
            assert.equal(cancelContext, 4);
            return SyncTasks.Resolved();
        });
    });
    it('Cancel finished task does not call cancellation handlers', function () {
        var task = SyncTasks.Defer();
        var promise = task.promise();
        task.onCancel(function (context) {
            assert(false);
        });
        task.resolve();
        promise.cancel(4);
    });
    it('Cancel finished task does not cancel inner', function () {
        var canceled = false;
        var cancelContext;
        var task = SyncTasks.Defer();
        var promise = task.promise();
        task.onCancel(function (context) {
            assert(false);
        });
        var chain = promise.then(function () {
            var inner = SyncTasks.Defer();
            inner.onCancel(function (context) {
                assert(false);
            });
            return inner.promise();
        });
        task.resolve();
        promise.cancel(4);
    });
    it('Cancel task then resolve during cancellation then does not call further handlers', function () {
        var canceled = false;
        var task = SyncTasks.Defer();
        var promise = task.promise();
        task.onCancel(function () {
            canceled = true;
        });
        task.onCancel(function () {
            task.resolve();
        });
        task.onCancel(function () {
            assert(false);
        });
        promise.cancel();
        assert(canceled);
        // Check the onCancel caused task resolution.
        return promise;
    });
    it('Cancel task then reject during cancellation then does not call further handlers', function () {
        var canceled = false;
        var task = SyncTasks.Defer();
        var promise = task.promise();
        task.onCancel(function () {
            canceled = true;
        });
        task.onCancel(function () {
            task.reject(5);
        });
        task.onCancel(function () {
            assert(false);
        });
        promise.cancel();
        assert(canceled);
        // Check the onCancel caused task rejection.
        return promise.then(function () {
            assert(false);
            return SyncTasks.Rejected();
        }, function (err) {
            assert.equal(err, 5);
            return SyncTasks.Resolved();
        });
    });
    it('Cancel inner does not cancel root task (no bubble out)', function () {
        var canceled = false;
        var cancelContext;
        var task = SyncTasks.Defer();
        var promise = task.promise();
        task.onCancel(function (context) {
            assert(false);
        });
        var inner = SyncTasks.Defer();
        inner.onCancel(function (context) {
            canceled = true;
            cancelContext = context;
            inner.reject(5);
        });
        var innerPromise = inner.promise();
        var chain = promise.then(function () {
            return innerPromise;
        }, function (err) {
            assert(false);
            return SyncTasks.Rejected();
        }).catch(function (err) {
            assert.equal(err, 5);
            assert(canceled);
            assert.equal(cancelContext, 4);
            return SyncTasks.Resolved();
        });
        innerPromise.cancel(4);
        task.resolve();
        return chain;
    });
    it('Cancel chain cancels inner task (bubble in), with task resolved late', function () {
        var canceled = false;
        var cancelContext;
        var task = SyncTasks.Defer();
        var promise = task.promise();
        var chain = promise.then(function () {
            var inner = SyncTasks.Defer();
            inner.onCancel(function (context) {
                canceled = true;
                cancelContext = context;
                inner.reject(5);
            });
            return inner.promise();
        }, function (err) {
            assert(false);
            return SyncTasks.Rejected();
        }).catch(function (err) {
            assert.equal(err, 5);
            assert(canceled);
            assert.equal(cancelContext, 4);
            return SyncTasks.Resolved();
        });
        chain.cancel(4);
        task.resolve();
        return chain;
    });
    it('Cancel chain cancels inner task (bubble in), with task resolved early', function () {
        var canceled = false;
        var cancelContext;
        var task = SyncTasks.Defer();
        var promise = task.promise();
        var chain = promise.then(function () {
            var inner = SyncTasks.Defer();
            inner.onCancel(function (context) {
                canceled = true;
                cancelContext = context;
                inner.reject(5);
            });
            setTimeout(function () {
                chain.cancel(4);
            }, waitTime);
            return inner.promise();
        }, function (err) {
            assert(false);
            return SyncTasks.Rejected();
        }).catch(function (err) {
            assert.equal(err, 5);
            assert(canceled);
            assert.equal(cancelContext, 4);
            return SyncTasks.Resolved();
        });
        task.resolve();
        return chain;
    });
    it('Cancel chain cancels inner chained task, with task resolved late', function () {
        var canceled = false;
        var cancelContext;
        var task = SyncTasks.Defer();
        var promise = task.promise();
        var chain = promise.then(function () {
            var inner = SyncTasks.Defer();
            inner.onCancel(function (context) {
                canceled = true;
                cancelContext = context;
                inner.reject(5);
            });
            return inner.promise().then(function () {
                // Chain another promise in place to make sure it works its way up to inner at some point.
                return 6;
            });
        }, function (err) {
            assert(false);
            return SyncTasks.Rejected();
        }).catch(function (err) {
            assert.equal(err, 5);
            assert(canceled);
            assert.equal(cancelContext, 4);
            return SyncTasks.Resolved();
        });
        chain.cancel(4);
        task.resolve();
        return chain;
    });
    it('Cancel chain cancels inner chained task, with task resolved early', function () {
        var canceled = false;
        var cancelContext;
        var task = SyncTasks.Defer();
        var promise = task.promise();
        var ret = promise.then(function () {
            var newTask = SyncTasks.Defer();
            newTask.onCancel(function (context) {
                canceled = true;
                cancelContext = context;
                newTask.reject(5);
            });
            setTimeout(function () {
                ret.cancel(4);
            }, waitTime);
            return newTask.promise().then(function () {
                // Chain another promise in place to make sure it works its way up to the newTask at some point.
                return 6;
            });
        }, function (err) {
            assert(false);
            return SyncTasks.Rejected();
        }).catch(function (err) {
            assert.equal(err, 5);
            assert(canceled);
            assert.equal(cancelContext, 4);
            return SyncTasks.Resolved();
        });
        task.resolve();
        return ret;
    });
    it('Cancel .all task cancels array of tasks', function () {
        var canceled1 = false;
        var canceled2 = false;
        var task1 = SyncTasks.Defer();
        var promise1 = task1.promise();
        task1.onCancel(function (context) {
            canceled1 = true;
            assert.equal(context, 4);
        });
        var task2 = SyncTasks.Defer();
        var promise2 = task2.promise();
        task2.onCancel(function (context) {
            canceled2 = true;
            assert.equal(context, 4);
        });
        var allPromise = SyncTasks.all([promise1, promise2]);
        allPromise.cancel(4);
        assert(canceled1);
        assert(canceled2);
    });
    it('Cancel chain from .all cancels array of tasks', function () {
        var canceled1 = false;
        var task1 = SyncTasks.Defer();
        var promise1 = task1.promise();
        task1.onCancel(function (context) {
            canceled1 = true;
            assert.equal(context, 4);
        });
        var chain = SyncTasks.all([promise1])
            .always(noop);
        chain.cancel(4);
        assert(canceled1);
    });
    it('Cancel .race task cancels array of tasks', function () {
        var canceled1 = false;
        var canceled2 = false;
        var task1 = SyncTasks.Defer();
        var promise1 = task1.promise();
        task1.onCancel(function (context) {
            canceled1 = true;
            assert.equal(context, 4);
        });
        var task2 = SyncTasks.Defer();
        var promise2 = task2.promise();
        task2.onCancel(function (context) {
            canceled2 = true;
            assert.equal(context, 4);
        });
        var allPromise = SyncTasks.race([promise1, promise2]);
        allPromise.cancel(4);
        assert(canceled1);
        assert(canceled2);
    });
    it('Cancel chain from .race cancels array of task', function () {
        var canceled1 = false;
        var task1 = SyncTasks.Defer();
        var promise1 = task1.promise();
        task1.onCancel(function (context) {
            canceled1 = true;
            assert.equal(context, 4);
        });
        var chain = SyncTasks.race([promise1])
            .always(noop);
        chain.cancel(4);
        assert(canceled1);
    });
    it('Cancel chain cancels inner chained .all task, with task resolved late', function () {
        var canceled = false;
        var cancelContext;
        var task = SyncTasks.Defer();
        var promise = task.promise();
        var ret = promise.then(function () {
            var newTask = SyncTasks.Defer();
            newTask.onCancel(function (context) {
                canceled = true;
                cancelContext = context;
                newTask.reject(5);
            });
            return SyncTasks.all([newTask.promise()]).then(function () {
                // Chain another promise in place to make sure it works its way up to the newTask at some point.
                return 6;
            });
        }, function (err) {
            assert(false);
            return SyncTasks.Rejected();
        }).catch(function (err) {
            assert.equal(err, 5);
            assert(canceled);
            assert.equal(cancelContext, 4);
            return SyncTasks.Resolved();
        });
        ret.cancel(4);
        task.resolve();
        return ret;
    });
    it('Cancel chain cancels inner chained .all task, with task resolved early', function () {
        var canceled = false;
        var cancelContext;
        var task = SyncTasks.Defer();
        var promise = task.promise();
        var ret = promise.then(function () {
            var newTask = SyncTasks.Defer();
            newTask.onCancel(function (context) {
                canceled = true;
                cancelContext = context;
                newTask.reject(5);
            });
            setTimeout(function () {
                ret.cancel(4);
            }, waitTime);
            return SyncTasks.all([newTask.promise()]).then(function () {
                // Chain another promise in place to make sure it works its way up to the newTask at some point.
                return 6;
            });
        }, function (err) {
            assert(false);
            return SyncTasks.Rejected();
        }).catch(function (err) {
            assert.equal(err, 5);
            assert(canceled);
            assert.equal(cancelContext, 4);
            return SyncTasks.Resolved();
        });
        task.resolve();
        return ret;
    });
    it('Cancel shared task does not cancel children (no bubble down)', function () {
        var task = SyncTasks.Defer();
        var promise = task.promise();
        var inner1 = SyncTasks.Defer();
        inner1.onCancel(function (context) {
            assert(false);
        });
        var inner2 = SyncTasks.Defer();
        inner2.onCancel(function (context) {
            assert(false);
        });
        promise.then(function () { return inner1.promise(); });
        promise.then(function () { return inner2.promise(); });
        promise.cancel(4);
        task.resolve();
    });
    it('Cancel chain of shared task does not cancel other chain (no bubble across)', function () {
        var canceled = false;
        var cancelContext;
        var task = SyncTasks.Defer();
        var promise = task.promise();
        var inner1 = SyncTasks.Defer();
        inner1.onCancel(function (context) {
            canceled = true;
            cancelContext = context;
        });
        var inner2 = SyncTasks.Defer();
        inner2.onCancel(function (context) {
            assert(false);
        });
        var chain1 = promise.then(function () { return inner1.promise(); });
        promise.then(function () { return inner2.promise(); });
        chain1.cancel(4);
        task.resolve();
        assert(canceled);
        assert.equal(cancelContext, 4);
    });
    it('deferCallback', function (done) {
        var got = false;
        var got2 = false;
        SyncTasks.asyncCallback(function () {
            got = true;
        });
        setTimeout(function () {
            assert(got);
            assert(got2);
            done();
        }, 1);
        SyncTasks.asyncCallback(function () {
            got2 = true;
        });
        assert(!got);
        assert(!got2);
    });
    it('thenDeferred Simple', function (done) {
        var task = SyncTasks.Defer();
        var tooEarly = true;
        task.promise().then(function (val) {
            assert.equal(val, 1);
            return 2;
        }, function (err) {
            assert(false);
            return null;
        }).thenAsync(function (val) {
            assert.equal(val, 2);
            assert(!tooEarly);
            done();
        }, function (err) {
            assert(false);
        });
        SyncTasks.asyncCallback(function () {
            tooEarly = false;
        });
        task.resolve(1);
        assert(tooEarly);
    });
});
