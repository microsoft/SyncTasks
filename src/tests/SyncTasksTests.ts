/// <reference path="dependencies.d.ts"/>

import assert = require('assert');

import SyncTasks = require('../SyncTasks');

describe('SyncTasks', function () {
    function noop() {/*noop*/}

    // Amount of time to wait to ensure all sync and trivially async (e.g. setTimeout(..., 0)) things have finished.
    // Useful to do something 'later'.
    const waitTime = 25;

    it('Simple - null resolve after then', (done) => {
        const task = SyncTasks.Defer<number|null>();

        task.promise().then(val => {
            assert.equal(val, null);
            done();
        }, err => {
            assert(false);
        });

        task.resolve(null);
    });

    it('Simple - null then after resolve', (done) => {
        const task = SyncTasks.Defer<number|null>();

        task.resolve(null);

        task.promise().then(val => {
            assert.equal(val, null);
            done();
        }, err => {
            assert(false);
        });
    });

    it('Simple - reject', (done) => {
        const task = SyncTasks.Defer<number>();

        task.reject(2);

        task.promise().then(val => {
            assert(false);
        }, err => {
            assert.equal(err, 2);
            done();
        });
    });

    it('Chain from success to success with value', (done) => {
        const task = SyncTasks.Defer<number>();

        task.promise().then(val => {
            assert.equal(val, 3);
            return 4;
        }, err => {
            assert(false);
            return null;
        }).then(val => {
            assert.equal(val, 4);
            done();
        }, err => {
            assert(false);
        });

        task.resolve(3);
    });

    it('Chain from error to success with value', (done) => {
        const task = SyncTasks.Defer<number>();

        task.promise().then(val => {
            assert(false);
            return -1;
        }, err => {
            assert.equal(err, 2);
            return 4;
        }).then(val => {
            assert.equal(val, 4);
            done();
        }, err => {
            assert(false);
        });

        task.reject(2);
    });

    it('Chain from success to success with promise', (done) => {
        const task = SyncTasks.Defer<number>();

        task.promise().then(val => {
            assert.equal(val, 3);
            return SyncTasks.Resolved<number>(4);
        }, err => {
            assert(false);
            return -1;
        }).then(val => {
            assert.equal(val, 4);
            done();
        }, err => {
            assert(false);
        });

        task.resolve(3);
    });

    it('Chain from error to success with promise', (done) => {
        const task = SyncTasks.Defer<number>();

        task.promise().then(val => {
            assert(false);
            return -1;
        }, err => {
            assert.equal(err, 3);
            return SyncTasks.Resolved(4);
        }).then(val => {
            assert.equal(val, 4);
            done();
        }, err => {
            assert(false);
        });

        task.reject(3);
    });

    it('Chain from success to error with promise', (done) => {
        const task = SyncTasks.Defer<number>();

        task.promise().then(val => {
            assert.equal(val, 2);
            return SyncTasks.Rejected(4);
        }, err => {
            assert(false);
            return -1;
        }).then(val => {
            assert(false);
        }, err => {
            assert.equal(err, 4);
            done();
        });

        task.resolve(2);
    });

    it('Chain from error to error with promise', (done) => {
        const task = SyncTasks.Defer<number>();

        task.promise().then(val => {
            assert(false);
            return -1;
        }, err => {
            assert.equal(err, 2);
            return SyncTasks.Rejected(4);
        }).then(val => {
            assert(false);
        }, err => {
            assert.equal(err, 4);
            done();
        });

        task.reject(2);
    });

    it('Chain from success to promise to success with promise', (done) => {
        const task = SyncTasks.Defer<number>();

        task.promise().then(val => {
            assert.equal(val, 3);
            const itask = SyncTasks.Resolved<number>(4);
            return itask.then(val2 => {
                assert.equal(val2, 4, 'inner');
                return 5;
            });
        }, err => {
            assert(false);
            return 2;
        }).then(val => {
            assert.equal(val, 5, 'outer');
            done();
        }, err => {
            assert(false);
        });

        task.resolve(3);
    });

    it('Exception in success to error', (done) => {
        const task = SyncTasks.Defer<number>();

        SyncTasks.config.exceptionsToConsole = false;

        task.promise().then(val => {
            const blah: any = null;
            blah.blowup();
        }, err => {
            assert(false);
        }).then(val => {
            assert(false);
        }, err => {
            SyncTasks.config.exceptionsToConsole = true;
            done();
        });

        task.resolve(3);
    });

    it('Exception in error to error', (done) => {
        const task = SyncTasks.Defer<number>();

        SyncTasks.config.exceptionsToConsole = false;

        task.promise().then(val => {
            assert(false);
        }, err => {
            const blah: any = null;
            blah.blowup();
        }).then(val => {
            assert(false);
        }, err => {
            SyncTasks.config.exceptionsToConsole = true;
            done();
        });

        task.reject(3);
    });

    it('"done" basic', (done) => {
        const task = SyncTasks.Defer<number>();

        task.promise().then(val => {
            return 4;
        }, err => {
            assert(false);
            return -1;
        }).done(val => {
            assert.equal(val, 4);
            return 2;   // should be ignored
        }).then(val => {
            assert.equal(val, 4);
            done();
        }, err => {
            assert(false);
        });

        task.resolve(3);
    });

    it('"done" does not chain', (done) => {
        const task = SyncTasks.Defer<number>();
        const innertask = SyncTasks.Defer<number>();

        let innerFinished = false;

        task.promise().then(val => {
            return 4;
        }, err => {
            assert(false);
            return -1;
        }).done(val => {
            assert.equal(val, 4);
            return innertask.promise().then(() => {
                innerFinished = true;
                return 2;   // should be ignored
            });
        }).then(val => {
            assert(!innerFinished);
            assert.equal(val, 4);
            done();
        }, err => {
            assert(false);
        });

        task.resolve(3);
        innertask.resolve(1);
    });

    it('Finally basic', (done) => {
        const task = SyncTasks.Defer<number>();

        task.promise().then(val => {
            return 4;
        }, err => {
            assert(false);
            return -1;
        }).finally(val => {
            assert.equal(val, 4);
            return 2;   // should be ignored
        }).then(val => {
            assert.equal(val, 4);
            done();
        }, err => {
            assert(false);
        });

        task.resolve(3);
    });

    it('Finally does not chain', (done) => {
        const task = SyncTasks.Defer<number>();
        const innertask = SyncTasks.Defer<number>();

        let innerFinished = false;

        task.promise().then(val => {
            return 4;
        }, err => {
            assert(false);
            return -1;
        }).finally(val => {
            assert.equal(val, 4);
            return innertask.promise().then(() => {
                innerFinished = true;
                return 2;   // should be ignored
            });
        }).then(val => {
            assert(!innerFinished);
            assert.equal(val, 4);
            done();
        }, err => {
            assert(false);
        });

        task.resolve(3);
        innertask.resolve(1);
    });

    it('"all" basic success', (done) => {
        const task = SyncTasks.Defer<number>();
        const task2 = SyncTasks.Defer<number>();
        const task3 = SyncTasks.Defer<number>();
        const task4 = SyncTasks.Defer<number>();

        SyncTasks.all([task.promise(), task2.promise(), task3.promise(), task4.promise()]).then(rets => {
            assert.equal(rets.length, 4);
            assert.equal(rets[0], 1);
            assert.equal(rets[1], 2);
            assert.equal(rets[2], 3);
            assert.equal(rets[3], 4);
            done();
        }, err => {
            assert(false);
        });

        task.resolve(1);
        task2.resolve(2);
        task3.resolve(3);
        task4.resolve(4);
    });

    it('"all" basic failure', (done) => {
        const task = SyncTasks.Defer<number>();
        const task2 = SyncTasks.Defer<number>();

        SyncTasks.all([task.promise(), task2.promise()]).then(rets => {
            assert(false);
        }, err => {
            done();
        });

        task.resolve(1);
        task2.reject(2);
    });

    it('"all" zero tasks', (done) => {
        SyncTasks.all([]).then(rets => {
            assert.equal(rets.length, 0);
            done();
        }, err => {
            assert(false);
        });
    });

    it('"all" single null task', (done) => {
        SyncTasks.all([null]).then(rets => {
            assert.equal(rets.length, 1);
            done();
        }, err => {
            assert(false);
        });
    });

    it('"all" tasks and nulls', (done) => {
        const task = SyncTasks.Defer<number>();

        SyncTasks.all([null, task.promise()]).then(rets => {
            assert.equal(rets.length, 2);
            done();
        }, err => {
            assert(false);
        });

        task.resolve(1);
    });

    it('"race" basic success', (done) => {
        const task = SyncTasks.Defer<number>();
        const task2 = SyncTasks.Defer<number>();
        const task3 = SyncTasks.Defer<number>();
        const task4 = SyncTasks.Defer<number>();

        SyncTasks.race([task.promise(), task2.promise(), task3.promise(), task4.promise()]).then(ret => {
            assert.equal(ret, 1);
            done();
        }, err => {
            assert(false);
        });

        task.resolve(1);
        task2.resolve(2);
        task3.resolve(3);
        task4.resolve(4);
    });

    it('"race" basic failure', (done) => {
        const task = SyncTasks.Defer<number>();
        const task2 = SyncTasks.Defer<number>();

        SyncTasks.race([task.promise(), task2.promise()]).then(ret => {
            assert(false);
        }, err => {
            assert.equal(err, 1);
            done();
        });

        task.reject(1);
        task2.resolve(2);
    });

    it('"race" zero tasks', (done) => {
        SyncTasks.race([]).then(ret => {
            assert(false);
        }, err => {
            assert(false);
        });

        setTimeout(() => done(), 20);
    });

    it('"race" single null task', (done) => {
        SyncTasks.race([null]).then(ret => {
            assert.equal(ret, null);
            done();
        }, err => {
            assert(false);
        });
    });

    it('"race" tasks and nulls', (done) => {
        const task = SyncTasks.Defer<number>();

        SyncTasks.race([null, task.promise()]).then(ret => {
            assert.equal(ret, null);
            done();
        }, err => {
            assert(false);
        });

        task.resolve(2);
    });

    it('Callbacks resolve synchronously', (done) => {
        const task = SyncTasks.Defer<number>();
        let resolvedCount = 0;

        task.promise().then(() => {
            ++resolvedCount;
        }, err => {
            assert(false);
        });

        task.resolve(1);
        assert(resolvedCount === 1);
        done();
    });

    it('Callbacks resolve in order added', (done) => {
        const task = SyncTasks.Defer<number>();
        let resolvedCount = 0;

        task.promise().then(() => {
            assert(resolvedCount === 0);
            ++resolvedCount;
        }, err => {
            assert(false);
        });

        task.promise().then(() => {
            assert(resolvedCount === 1);
            ++resolvedCount;
        }, err => {
            assert(false);
        });

        task.resolve(1);
        assert(resolvedCount === 2);
        done();
    });

    it('Failure callbacks resolve in order added', (done) => {
        const task = SyncTasks.Defer<number>();
        let rejectedCount = 0;

        task.promise().then(() => {
            assert(false);
        }, err => {
            assert(rejectedCount === 0);
            ++rejectedCount;
        });

        task.promise().then(() => {
            assert(false);
        }, err => {
            assert(rejectedCount === 1);
            ++rejectedCount;
        });

        task.reject(1);
        assert(rejectedCount === 2);
        done();
    });

    it('"unhandledErrorHandler": Failure without any callback', (done) => {
        let unhandledErrorHandlerCalled = false;

        const oldUnhandledErrorHandler = SyncTasks.config.unhandledErrorHandler;
        SyncTasks.config.unhandledErrorHandler = () => {
            unhandledErrorHandlerCalled = true;
        };

        SyncTasks.Rejected<number>();

        setTimeout(() => {
            SyncTasks.config.unhandledErrorHandler = oldUnhandledErrorHandler;
            assert(unhandledErrorHandlerCalled);
            done();
        }, 20);
    });

    it('"unhandledErrorHandler": Failure with only success callback', (done) => {
        let unhandledErrorHandlerCalled = false;

        const oldUnhandledErrorHandler = SyncTasks.config.unhandledErrorHandler;
        SyncTasks.config.unhandledErrorHandler = () => {
            unhandledErrorHandlerCalled = true;
        };

        SyncTasks.Rejected<number>().then(() => {
            assert(false);
        });

        setTimeout(() => {
            SyncTasks.config.unhandledErrorHandler = oldUnhandledErrorHandler;
            assert(unhandledErrorHandlerCalled);
            done();
        }, 20);
    });

    it('"unhandledErrorHandler": Failure with success callback with failure callback', (done) => {
        let catchBlockReached = false;

        SyncTasks.Rejected<number>().then(() => {
            assert(false);
        }).catch(() => {
            catchBlockReached = true;
        });

        setTimeout(() => {
            assert(catchBlockReached);
            done();
        }, 20);
    });

    it('"unhandledErrorHandler": Success to inner failure without any callback', (done) => {
        let unhandledErrorHandlerCalled = false;

        const oldUnhandledErrorHandler = SyncTasks.config.unhandledErrorHandler;
        SyncTasks.config.unhandledErrorHandler = () => {
            unhandledErrorHandlerCalled = true;
        };

        SyncTasks.Resolved<number>(4).then(() => {
            return SyncTasks.Rejected<number>();
        });

        setTimeout(() => {
            SyncTasks.config.unhandledErrorHandler = oldUnhandledErrorHandler;
            assert(unhandledErrorHandlerCalled);
            done();
        }, 20);
    });

    it('"unhandledErrorHandler": Failure to inner failure without any callback', (done) => {
        let unhandledErrorHandlerCalled = 0;

        const oldUnhandledErrorHandler = SyncTasks.config.unhandledErrorHandler;
        SyncTasks.config.unhandledErrorHandler = (n: number) => {
            unhandledErrorHandlerCalled = n;
        };

        SyncTasks.Rejected<number>(1).catch(() => {
            return SyncTasks.Rejected<number>(2);
        });
        // Note: the outer "catch" has no failure handling so the inner error leaks out.

        setTimeout(() => {
            SyncTasks.config.unhandledErrorHandler = oldUnhandledErrorHandler;
            assert.equal(unhandledErrorHandlerCalled, 2);
            done();
        }, 20);
    });

    it('"unhandledErrorHandler": Each chained promise must handle', (done) => {
        let unhandledErrorHandlerCalled = false;
        let catchBlockReached = false;

        const oldUnhandledErrorHandler = SyncTasks.config.unhandledErrorHandler;
        SyncTasks.config.unhandledErrorHandler = () => {
            unhandledErrorHandlerCalled = true;
        };

        const task = SyncTasks.Rejected<void>();
        task.catch(() => {
            catchBlockReached = true;
        });

        // Does not handle failure.
        task.then(() => {
            assert(false);
        });

        setTimeout(() => {
            SyncTasks.config.unhandledErrorHandler = oldUnhandledErrorHandler;
            assert(unhandledErrorHandlerCalled);
            assert(catchBlockReached);
            done();
        }, 20);
    });

    it('"unhandledErrorHandler": "fail" never "handles" the failure', (done) => {
        let unhandledErrorHandlerCalled = false;
        let failBlockReached = false;

        const oldUnhandledErrorHandler = SyncTasks.config.unhandledErrorHandler;
        SyncTasks.config.unhandledErrorHandler = () => {
            unhandledErrorHandlerCalled = true;
        };

        SyncTasks.Rejected<number>().fail(() => {
            failBlockReached = true;
            // If this was .catch, it would resolve the promise (with undefined) and the failure would be handled.
        });

        setTimeout(() => {
            SyncTasks.config.unhandledErrorHandler = oldUnhandledErrorHandler;
            assert(unhandledErrorHandlerCalled);
            assert(failBlockReached);
            done();
        }, 20);
    });

    it('"unhandledErrorHandler": "done" does not create another "unhandled"', (done) => {
        let unhandledErrorHandlerCalled = false;
        let catchBlockReached = false;

        const oldUnhandledErrorHandler = SyncTasks.config.unhandledErrorHandler;
        SyncTasks.config.unhandledErrorHandler = () => {
            unhandledErrorHandlerCalled = true;
        };

        SyncTasks.Rejected<void>().done(() => {
            // Should not create a separate "unhandled" error since there is no way to "handle" it from here.
            // The existing "unhandled" error should continue to be "unhandled", as other tests have verified.
        }).catch(() => {
            // "Handle" the failure.
            catchBlockReached = true;
        });

        setTimeout(() => {
            SyncTasks.config.unhandledErrorHandler = oldUnhandledErrorHandler;
            assert(!unhandledErrorHandlerCalled);
            assert(catchBlockReached);
            done();
        }, 20);
    });

    it('"unhandledErrorHandler": "fail" does not create another "unhandled"', (done) => {
        let unhandledErrorHandlerCalled = false;
        let catchBlockReached = false;

        const oldUnhandledErrorHandler = SyncTasks.config.unhandledErrorHandler;
        SyncTasks.config.unhandledErrorHandler = () => {
            unhandledErrorHandlerCalled = true;
        };

        SyncTasks.Rejected<void>().fail(() => {
            // Should not create a separate "unhandled" error since there is no way to "handle" it from here.
            // The existing "unhandled" error should continue to be "unhandled", as other tests have verified.
        }).catch(() => {
            // "Handle" the failure.
            catchBlockReached = true;
        });

        setTimeout(() => {
            SyncTasks.config.unhandledErrorHandler = oldUnhandledErrorHandler;
            assert(!unhandledErrorHandlerCalled);
            assert(catchBlockReached);
            done();
        }, 20);
    });

    it('Add callback while resolving', (done) => {
        const task = SyncTasks.Defer<number>();
        const promise = task.promise();
        let resolvedCount = 0;

        const innerTask1 = SyncTasks.Defer<number>();
        const innerTask2 = SyncTasks.Defer<number>();

        promise.then(() => {
            // While resolving: add callback to same promise.
            promise.then(() => {
                innerTask2.resolve(++resolvedCount);
            }, err => {
                assert(false);
            });
            // This line should be reached before innerTask2 resolves.
            innerTask1.resolve(++resolvedCount);
        }, err => {
            assert(false);
        });

        task.resolve(1);

        SyncTasks.all([innerTask1.promise(), innerTask2.promise()]).then(rets => {
            assert(rets.length === 2);
            assert(rets[0] === 1);
            assert(rets[1] === 2);
            done();
        }, err => {
            assert(false);
        });
    });

    it('Add callback while rejecting', (done) => {
        const task = SyncTasks.Defer<number>();
        const promise = task.promise();
        let rejectedCount = 0;

        const innerTask1 = SyncTasks.Defer<number>();
        const innerTask2 = SyncTasks.Defer<number>();

        promise.then(() => {
            assert(false);
        }, err => {
            // While resolving: add callback to same promise.
            promise.then(() => {
                assert(false);
            }, err => {
                innerTask2.resolve(++rejectedCount);
            });
            // This line should be reached before innerTask2 resolves.
            innerTask1.resolve(++rejectedCount);
        });

        task.reject(1);

        SyncTasks.all([innerTask1.promise(), innerTask2.promise()]).then(rets => {
            assert(rets.length === 2);
            assert(rets[0] === 1);
            assert(rets[1] === 2);
            done();
        }, err => {
            assert(false);
        });
    });

    it('Cancel task (happy path)', () => {
        let canceled = false;
        let cancelContext: any;

        const task = SyncTasks.Defer<number>();
        const promise = task.promise();
        task.onCancel((context) => {
            canceled = true;
            cancelContext = context;
            task.reject(5);
        });

        promise.cancel(4);

        // Check the cancel caused rejection.
        return promise.then(() => {
            assert(false);
            return SyncTasks.Rejected();
        }, (err) => {
            assert.equal(err, 5);
            assert(canceled);
            assert.equal(cancelContext, 4);
            return SyncTasks.Resolved<number>(1);
        });
    });

    it('Cancel chain cancels task (bubble up)', () => {
        let canceled = false;
        let cancelContext: any;

        const task = SyncTasks.Defer<number>();
        const promise = task.promise();
        task.onCancel((context) => {
            canceled = true;
            cancelContext = context;
            task.reject(5);
        });

        const chain = promise.then(() => {
            assert(false);
            return SyncTasks.Rejected();
        }, (err) => {
            assert.equal(err, 5);
            assert(canceled);
            assert.equal(cancelContext, 4);
            return -1;
        });

        chain.cancel(4);

        // Check the chain cancel caused task rejection.
        return promise.then(() => {
            assert(false);
            return SyncTasks.Rejected();
        }, (err) => {
            assert.equal(err, 5);
            assert(canceled);
            assert.equal(cancelContext, 4);
            return SyncTasks.Resolved<number>(1);
        });
    });

    it('Cancel deep chain cancels task (bubble up)', () => {
        let canceled = false;
        let cancelContext: any;

        const task = SyncTasks.Defer<number>();
        const promise = task.promise();
        task.onCancel((context) => {
            canceled = true;
            cancelContext = context;
            task.reject(5);
        });

        const chain = promise.then(() => {
            assert(false);
            return SyncTasks.Rejected();
        }, (err) => {
            assert.equal(err, 5);
            assert(canceled);
            assert.equal(cancelContext, 4);
            return -1;
        })
            // Make the chain longer to further separate the cancel from the task.
            .always(noop)
            .always(noop)
            .always(noop);

        chain.cancel(4);

        // Check the chain cancel caused task rejection.
        return promise.then(() => {
            assert(false);
            return SyncTasks.Rejected();
        }, (err) => {
            assert.equal(err, 5);
            assert(canceled);
            assert.equal(cancelContext, 4);
            return SyncTasks.Resolved<number>(1);
        });
    });

    it('Cancel finished task does not call cancellation handlers', () => {
        const task = SyncTasks.Defer<number>();
        const promise = task.promise();
        task.onCancel((context) => {
            assert(false);
        });

        task.resolve(2);
        promise.cancel(4);
    });

    it('Cancel finished task does not cancel inner', () => {
        const task = SyncTasks.Defer<number>();
        const promise = task.promise();
        task.onCancel((context) => {
            assert(false);
        });

        promise.then(() => {
            const inner = SyncTasks.Defer<number>();
            inner.onCancel((context) => {
                assert(false);
            });
            return inner.promise();
        });

        task.resolve(2);
        promise.cancel(4);
    });

    it('Cancel task then resolve during cancellation then does not call further handlers', () => {
        let canceled = false;

        const task = SyncTasks.Defer<number>();
        const promise = task.promise();
        task.onCancel(() => {
            canceled = true;
        });
        task.onCancel(() => {
            task.resolve(2);
        });
        task.onCancel(() => {
            assert(false);
        });

        promise.cancel();
        assert(canceled);

        // Check the onCancel caused task resolution.
        return promise;
    });

    it('Cancel task then reject during cancellation then does not call further handlers', () => {
        let canceled = false;

        const task = SyncTasks.Defer<number>();
        const promise = task.promise();
        task.onCancel(() => {
            canceled = true;
        });
        task.onCancel(() => {
            task.reject(5);
        });
        task.onCancel(() => {
            assert(false);
        });

        promise.cancel();
        assert(canceled);

        // Check the onCancel caused task rejection.
        return promise.then(() => {
            assert(false);
            return SyncTasks.Rejected();
        }, (err) => {
            assert.equal(err, 5);
            return SyncTasks.Resolved<number>(2);
        });
    });

    it('Cancel inner does not cancel root task (no bubble out)', () => {
        let canceled = false;
        let cancelContext: any;

        const task = SyncTasks.Defer<number>();
        const promise = task.promise();
        task.onCancel((context) => {
            assert(false);
        });

        const inner = SyncTasks.Defer<number>();
        inner.onCancel((context) => {
            canceled = true;
            cancelContext = context;
            inner.reject(5);
        });
        const innerPromise = inner.promise();

        const chain = promise.then(() => {
            return innerPromise;
        }, (err) => {
            assert(false);
            return SyncTasks.Rejected();
        }).catch(err => {
            assert.equal(err, 5);
            assert(canceled);
            assert.equal(cancelContext, 4);
            return SyncTasks.Resolved<number>(2);
        });

        innerPromise.cancel(4);
        task.resolve(2);
        return chain;
    });

    it('Cancel chain cancels inner task (bubble in), with task resolved late', () => {
        let canceled = false;
        let cancelContext: any;

        const task = SyncTasks.Defer<number>();
        const promise = task.promise();

        const chain = promise.then(() => {
            const inner = SyncTasks.Defer<number>();
            inner.onCancel((context) => {
                canceled = true;
                cancelContext = context;
                inner.reject(5);
            });
            return inner.promise();
        }, (err) => {
            assert(false);
            return SyncTasks.Rejected();
        }).catch(err => {
            assert.equal(err, 5);
            assert(canceled);
            assert.equal(cancelContext, 4);
            return SyncTasks.Resolved<number>(2);
        });

        chain.cancel(4);
        task.resolve(1);
        return chain;
    });

    it('Cancel chain cancels inner task (bubble in), with task resolved early', () => {
        let canceled = false;
        let cancelContext: any;

        const task = SyncTasks.Defer<number>();
        const promise = task.promise();

        const chain = promise.then(() => {
            const inner = SyncTasks.Defer<number>();
            inner.onCancel((context) => {
                canceled = true;
                cancelContext = context;
                inner.reject(5);
            });
            setTimeout(() => {
                chain.cancel(4);
            }, waitTime);
            return inner.promise();
        }, (err) => {
            assert(false);
            return SyncTasks.Rejected();
        }).catch(err => {
            assert.equal(err, 5);
            assert(canceled);
            assert.equal(cancelContext, 4);
            return SyncTasks.Resolved<number>(2);
        });

        task.resolve(1);
        return chain;
    });

    it('Cancel chain cancels inner chained task, with task resolved late', () => {
        let canceled = false;
        let cancelContext: any;

        const task = SyncTasks.Defer<number>();
        const promise = task.promise();

        const chain = promise.then(() => {
            const inner = SyncTasks.Defer<number>();
            inner.onCancel((context) => {
                canceled = true;
                cancelContext = context;
                inner.reject(5);
            });
            return inner.promise().then(() => {
                // Chain another promise in place to make sure it works its way up to inner at some point.
                return 6;
            });
        }, (err) => {
            assert(false);
            return SyncTasks.Rejected();
        }).catch(err => {
            assert.equal(err, 5);
            assert(canceled);
            assert.equal(cancelContext, 4);
            return SyncTasks.Resolved<number>(2);
        });

        chain.cancel(4);
        task.resolve(1);
        return chain;
    });

    it('Cancel chain cancels inner chained task, with task resolved early', () => {
        let canceled = false;
        let cancelContext: any;

        const task = SyncTasks.Defer<number>();
        const promise = task.promise();

        const ret = promise.then(() => {
            const newTask = SyncTasks.Defer<number>();
            newTask.onCancel((context) => {
                canceled = true;
                cancelContext = context;
                newTask.reject(5);
            });
            setTimeout(() => {
                ret.cancel(4);
            }, waitTime);
            return newTask.promise().then(() => {
                // Chain another promise in place to make sure it works its way up to the newTask at some point.
                return 6;
            });
        }, (err) => {
            assert(false);
            return SyncTasks.Rejected();
        }).catch(err => {
            assert.equal(err, 5);
            assert(canceled);
            assert.equal(cancelContext, 4);
            return SyncTasks.Resolved<number>(2);
        });

        task.resolve(1);
        return ret;
    });

    it('Cancel .all task cancels array of tasks', () => {
        let canceled1 = false;
        let canceled2 = false;

        const task1 = SyncTasks.Defer<number>();
        const promise1 = task1.promise();
        task1.onCancel((context) => {
            canceled1 = true;
            assert.equal(context, 4);
        });

        const task2 = SyncTasks.Defer<number>();
        const promise2 = task2.promise();
        task2.onCancel((context) => {
            canceled2 = true;
            assert.equal(context, 4);
        });

        const allPromise = SyncTasks.all([promise1, promise2]);
        allPromise.cancel(4);
        assert(canceled1);
        assert(canceled2);
    });

    it('Cancel chain from .all cancels array of tasks', () => {
        let canceled1 = false;

        const task1 = SyncTasks.Defer<number>();
        const promise1 = task1.promise();
        task1.onCancel((context) => {
            canceled1 = true;
            assert.equal(context, 4);
        });

        const chain = SyncTasks.all([promise1])
            .always(noop);

        chain.cancel(4);
        assert(canceled1);
    });

    it('Cancel .race task cancels array of tasks', () => {
        let canceled1 = false;
        let canceled2 = false;

        const task1 = SyncTasks.Defer<number>();
        const promise1 = task1.promise();
        task1.onCancel((context) => {
            canceled1 = true;
            assert.equal(context, 4);
        });

        const task2 = SyncTasks.Defer<number>();
        const promise2 = task2.promise();
        task2.onCancel((context) => {
            canceled2 = true;
            assert.equal(context, 4);
        });

        const allPromise = SyncTasks.race([promise1, promise2]);
        allPromise.cancel(4);
        assert(canceled1);
        assert(canceled2);
    });

    it('Cancel chain from .race cancels array of task', () => {
        let canceled1 = false;

        const task1 = SyncTasks.Defer<number>();
        const promise1 = task1.promise();
        task1.onCancel((context) => {
            canceled1 = true;
            assert.equal(context, 4);
        });

        const chain = SyncTasks.race([promise1])
            .always(noop);

        chain.cancel(4);
        assert(canceled1);
    });

    it('Cancel chain cancels inner chained .all task, with task resolved late', () => {
        let canceled = false;
        let cancelContext: any;

        const task = SyncTasks.Defer<number>();
        const promise = task.promise();

        const ret = promise.then(() => {
            const newTask = SyncTasks.Defer<number>();
            newTask.onCancel((context) => {
                canceled = true;
                cancelContext = context;
                newTask.reject(5);
            });
            return SyncTasks.all([newTask.promise()]).then(() => {
                // Chain another promise in place to make sure it works its way up to the newTask at some point.
                return 6;
            });
        }, (err) => {
            assert(false);
            return SyncTasks.Rejected();
        }).catch(err => {
            assert.equal(err, 5);
            assert(canceled);
            assert.equal(cancelContext, 4);
            return SyncTasks.Resolved<number>(2);
        });

        ret.cancel(4);
        task.resolve(1);
        return ret;
    });

    it('Cancel chain cancels inner chained .all task, with task resolved early', () => {
        let canceled = false;
        let cancelContext: any;

        const task = SyncTasks.Defer<number>();
        const promise = task.promise();

        const ret = promise.then(() => {
            const newTask = SyncTasks.Defer<number>();
            newTask.onCancel((context) => {
                canceled = true;
                cancelContext = context;
                newTask.reject(5);
            });
            setTimeout(() => {
                ret.cancel(4);
            }, waitTime);
            return SyncTasks.all([newTask.promise()]).then(() => {
                // Chain another promise in place to make sure it works its way up to the newTask at some point.
                return 6;
            });
        }, (err) => {
            assert(false);
            return SyncTasks.Rejected();
        }).catch(err => {
            assert.equal(err, 5);
            assert(canceled);
            assert.equal(cancelContext, 4);
            return SyncTasks.Resolved<number>(2);
        });

        task.resolve(1);
        return ret;
    });

    it('Cancel shared task does not cancel children (no bubble down)', () => {
        const task = SyncTasks.Defer<number>();
        const promise = task.promise();

        const inner1 = SyncTasks.Defer<number>();
        inner1.onCancel((context) => {
            assert(false);
        });

        const inner2 = SyncTasks.Defer<number>();
        inner2.onCancel((context) => {
            assert(false);
        });

        promise.then(() => inner1.promise());
        promise.then(() => inner2.promise());

        promise.cancel(4);
        task.resolve(1);
    });

    it('Cancel chain of shared task does not cancel other chain (no bubble across)', () => {
        let canceled = false;
        let cancelContext: any;

        const task = SyncTasks.Defer<number>();
        const promise = task.promise();

        const inner1 = SyncTasks.Defer<number>();
        inner1.onCancel((context) => {
            canceled = true;
            cancelContext = context;
        });

        const inner2 = SyncTasks.Defer<number>();
        inner2.onCancel((context) => {
            assert(false);
        });

        const chain1 = promise.then(() => inner1.promise());
        promise.then(() => inner2.promise());

        chain1.cancel(4);
        task.resolve(1);
        assert(canceled);
        assert.equal(cancelContext, 4);
    });

    it('Cancel throws for "double cancel"', () => {
        const oldCatchExceptions = SyncTasks.config.catchExceptions;
        SyncTasks.config.catchExceptions = false;

        const promise = SyncTasks.Defer<void>().promise();
        promise.cancel();
        try {
            promise.cancel();
            assert.ok(false);
        } catch (e) {
            // Expected.
            SyncTasks.config.catchExceptions = oldCatchExceptions;
        }
    });

    it('Cancel does not throw for "double cancel" due to bubble up', () => {
        const oldCatchExceptions = SyncTasks.config.catchExceptions;
        SyncTasks.config.catchExceptions = false;

        let countCancels = 0;
        const task = SyncTasks.Defer<void>();
        task.onCancel(context => {
            countCancels++;
        });

        const root = task.promise();
        const promise1 = root.then(noop);
        const promise2 = root.then(noop);

        try {
            promise1.cancel();
            promise2.cancel();
            SyncTasks.config.catchExceptions = oldCatchExceptions;
        } catch (e) {
            assert.ok(false);
        }

        // Make sure the root's cancel was called, but we should not be called back more than once.
        assert.equal(countCancels, 1);
    });

    it('Cancel does not throw for "double cancel" due to bubble in', () => {
        const oldCatchExceptions = SyncTasks.config.catchExceptions;
        SyncTasks.config.catchExceptions = false;

        const task = SyncTasks.Defer<number>();
        const promise = task.promise();

        const chain = promise.then(() => {
            const inner = SyncTasks.Defer<number>();
            const innerPromise = inner.promise();
            innerPromise.cancel();
            return innerPromise;
        });

        try {
            chain.cancel(32);
            task.resolve(1);
            SyncTasks.config.catchExceptions = oldCatchExceptions;
        } catch (e) {
            assert.ok(false);
        }
    });

    it('Cancel .all does not throw for "double cancel" due to bubble up', () => {
        const oldCatchExceptions = SyncTasks.config.catchExceptions;
        SyncTasks.config.catchExceptions = false;

        const promise1 = SyncTasks.Defer<void>().promise();
        const promise2 = SyncTasks.Defer<void>().promise();
        const sink = SyncTasks.all([promise1, promise2]);

        try {
            sink.cancel();
            promise1.cancel();
            SyncTasks.config.catchExceptions = oldCatchExceptions;
        } catch (e) {
            assert.ok(false);
        }
    });

    it('Cancel .all does not throw for "double cancel" due to bubble up for already canceled promise', () => {
        const oldCatchExceptions = SyncTasks.config.catchExceptions;
        SyncTasks.config.catchExceptions = false;

        const promise1 = SyncTasks.Defer<void>().promise();
        const promise2 = SyncTasks.Defer<void>().promise();
        const sink = SyncTasks.all([promise1, promise2]);

        try {
            promise1.cancel();
            sink.cancel();
            SyncTasks.config.catchExceptions = oldCatchExceptions;
        } catch (e) {
            assert.ok(false);
        }
    });

    it('Cancel .race does not throw for "double cancel" due to bubble up', () => {
        const oldCatchExceptions = SyncTasks.config.catchExceptions;
        SyncTasks.config.catchExceptions = false;

        const promise1 = SyncTasks.Defer<void>().promise();
        const promise2 = SyncTasks.Defer<void>().promise();
        const sink = SyncTasks.race([promise1, promise2]);

        try {
            sink.cancel();
            promise1.cancel();
            SyncTasks.config.catchExceptions = oldCatchExceptions;
        } catch (e) {
            assert.ok(false);
        }
    });

    it('Cancel .race does not throw for "double cancel" due to bubble up for already canceled promise', () => {
        const oldCatchExceptions = SyncTasks.config.catchExceptions;
        SyncTasks.config.catchExceptions = false;

        const promise1 = SyncTasks.Defer<void>().promise();
        const promise2 = SyncTasks.Defer<void>().promise();
        const sink = SyncTasks.race([promise1, promise2]);

        try {
            promise1.cancel();
            sink.cancel();
            SyncTasks.config.catchExceptions = oldCatchExceptions;
        } catch (e) {
            assert.ok(false);
        }
    });

    it('Cancel resolved promise does not call cancellation handlers', () => {
        const defer = SyncTasks.Defer<void>();
        const promise = defer.promise();

        defer.onCancel(() => {
            assert(false, 'Handler should not be called');
        });

        defer.resolve(void 0);
        promise.cancel();
    });

    it('Multiple bubble promise cancellation results in single cancel handler callbacks', () => {
        const defer = SyncTasks.Defer<void>();
        const promise1 = defer.promise().then(() => { /* noop */});
        const promise2 = defer.promise().then(() => { /* noop */});
        let callbackCount = 0;

        defer.onCancel(() => {
            callbackCount++;
        });

        promise1.cancel();
        promise2.cancel();

        assert.equal(callbackCount, 1, 'onCancel handler not called correct number of times');
    });

    it('deferCallback', (done) => {
        let got = false;
        let got2 = false;
        SyncTasks.asyncCallback(() => {
            got = true;
        });
        setTimeout(() => {
            assert(got);
            assert(got2);
            done();
        }, 1);
        SyncTasks.asyncCallback(() => {
            got2 = true;
        });
        assert(!got);
        assert(!got2);
    });

    it('thenDeferred Simple', (done) => {
        const task = SyncTasks.Defer<number>();

        let tooEarly = true;
        task.promise().then(val => {
            assert.equal(val, 1);
            return 2;
        }, err => {
            assert(false);
            return null;
        }).thenAsync(val => {
            assert.equal(val, 2);
            assert(!tooEarly);
            done();
        }, err => {
            assert(false);
        });

        SyncTasks.asyncCallback(() => {
            tooEarly = false;
        });
        task.resolve(1);

        assert(tooEarly);
    });

    it('thenDeferred Failure', (done) => {
        const task = SyncTasks.Defer<number>();

        let tooEarly = true;
        task.promise().then(val => {
            assert.equal(val, 1);
            return SyncTasks.Rejected(4);
        }, err => {
            assert(false);
            return 5;
        }).thenAsync(val => {
            assert(false);
        }, err => {
            assert.equal(err, 4);
            assert(!tooEarly);
            done();
        });

        SyncTasks.asyncCallback(() => {
            tooEarly = false;
        });
        task.resolve(1);

        assert(tooEarly);
    });

    it('toEs6Promise Simple', (done) => {
        const task = SyncTasks.Defer<number>();
        let tooEarly = true;

        task.promise().toEs6Promise().then(val => {
            assert.equal(val, 3.50);
            done();
        }, err => {
            assert(false);
        });
        
        SyncTasks.asyncCallback(() => {
            tooEarly = false;
        });
        task.resolve(3.50);

        assert(tooEarly);
    });

    it('toEs6Promise Resolved', (done) => {
        const resolved = SyncTasks.Resolved<number>(42);
        let tooEarly = true;

        resolved.toEs6Promise().then(val => {
            assert.equal(val, 42);
            assert(tooEarly);
            done();
        }, err => {
            assert(false);
        });

        SyncTasks.asyncCallback(() => {
            tooEarly = false;
        });
        assert(tooEarly);
    });

    it('toEs6Promise Rejected', (done) => {
        const rejected = SyncTasks.Rejected<number>(42);
        let tooEarly = true;

        rejected.toEs6Promise().then(val => {
            assert(false);
        }, err => {
            assert.equal(err, 42);
            assert(tooEarly);
            done();
        });

        SyncTasks.asyncCallback(() => {
            tooEarly = false;
        });
        assert(tooEarly);
    });

    it('toEs6Promise and back', (done) => {
        const task = SyncTasks.Defer<number>();
        const stPromise = task.promise();
        const esPromise = stPromise.toEs6Promise();
        const stPromiseAgain = SyncTasks.fromThenable(esPromise);
        
        stPromiseAgain.then(val => {
            assert.equal(val, 100500);
            done();
        }, err => {
            assert(false);
        });

        task.resolve(100500);
    });
});
