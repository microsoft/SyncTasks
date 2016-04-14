/// <reference path="dependencies.d.ts"/>
"use strict";
var assert = require('assert');
var SyncTasks = require('../SyncTasks');
describe('SyncTasks', function () {
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
    it('Chain from fail to success with value', function (done) {
        var task = SyncTasks.Defer();
        task.promise().then(function (val) {
            assert(false);
            return 3;
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
            return SyncTasks.Defer().resolve(4);
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
    it('Chain from fail to success with promise', function (done) {
        var task = SyncTasks.Defer();
        task.promise().then(function (val) {
            assert(false);
            return null;
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
    it('Chain from success to fail with promise', function (done) {
        var task = SyncTasks.Defer();
        task.promise().then(function (val) {
            assert.equal(val, 2);
            return SyncTasks.Rejected(4);
        }, function (err) {
            assert(false);
            return void 0;
        }).then(function (val) {
            assert(false);
        }, function (err) {
            assert.equal(err, 4);
            done();
        });
        task.resolve(2);
    });
    it('Chain from fail to fail with promise', function (done) {
        var task = SyncTasks.Defer();
        task.promise().then(function (val) {
            assert(false);
            return void 0;
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
    it('Exception in success to fail', function (done) {
        var task = SyncTasks.Defer();
        SyncTasks.config.exceptionsToConsole = false;
        task.promise().then(function (val) {
            var blah = null;
            blah.blowup();
            return void 0;
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
    it('Exception in fail to fail', function (done) {
        var task = SyncTasks.Defer();
        SyncTasks.config.exceptionsToConsole = false;
        task.promise().then(function (val) {
            assert(false);
        }, function (err) {
            var blah = null;
            blah.blowup();
            return void 0;
        }).then(function (val) {
            assert(false);
        }, function (err) {
            SyncTasks.config.exceptionsToConsole = true;
            done();
        });
        task.reject(3);
    });
    it('Finally basic', function (done) {
        var task = SyncTasks.Defer();
        task.promise().then(function (val) {
            return 4;
        }, function (err) {
            assert(false);
            return void 0;
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
    it('Finally with success chaining', function (done) {
        var task = SyncTasks.Defer();
        var innerWorked = false;
        task.promise().then(function (val) {
            return 4;
        }, function (err) {
            assert(false);
            return void 0;
        }).finally(function (val) {
            assert.equal(val, 4);
            var newtask = SyncTasks.Defer();
            newtask.resolve(5); // should be ignored
            return newtask.promise().then(function (val2) {
                // this must run before the outer resolution
                innerWorked = true;
            });
        }).then(function (val) {
            assert(innerWorked);
            assert.equal(val, 4);
            done();
        }, function (err) {
            assert(false);
        });
        task.resolve(3);
    });
    it('Finally with failure chaining', function (done) {
        var task = SyncTasks.Defer();
        var innerWorked = false;
        task.promise().then(function (val) {
            assert(false);
            return void 0;
        }).finally(function (val) {
            assert.equal(val, 3);
            var newtask = SyncTasks.Defer();
            newtask.resolve(5); // should be ignored
            return newtask.promise().then(function (val2) {
                // this must run before the outer resolution
                innerWorked = true;
            });
        }).then(function (val) {
            assert(false);
        }, function (err) {
            assert(innerWorked);
            assert.equal(err, 3);
            done();
        });
        task.reject(3);
    });
    it('whenAll basic success', function (done) {
        var task = SyncTasks.Defer();
        var task2 = SyncTasks.Defer();
        var task3 = SyncTasks.Defer();
        var task4 = SyncTasks.Defer();
        SyncTasks.whenAll([task.promise(), task2.promise(), task3.promise(), task4.promise()]).then(function (rets) {
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
    it('whenAll basic failure', function (done) {
        var task = SyncTasks.Defer();
        var task2 = SyncTasks.Defer();
        SyncTasks.whenAll([task.promise(), task2.promise()]).then(function (rets) {
            assert(false);
        }, function (err) {
            done();
        });
        task.resolve(1);
        task2.reject(2);
    });
    it('whenAll zero tasks', function (done) {
        SyncTasks.whenAll([]).then(function (rets) {
            done();
        }, function (err) {
            assert(false);
        });
    });
    it('whenAll single null task', function (done) {
        SyncTasks.whenAll([null]).then(function (rets) {
            done();
        }, function (err) {
            assert(false);
        });
    });
    it('whenAll tasks and nulls', function (done) {
        var task = SyncTasks.Defer();
        SyncTasks.whenAll([null, task.promise()]).then(function (rets) {
            done();
        }, function (err) {
            assert(false);
        });
        task.resolve(1);
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
        SyncTasks.whenAll([innerTask1.promise(), innerTask2.promise()]).then(function (rets) {
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
        SyncTasks.whenAll([innerTask1.promise(), innerTask2.promise()]).then(function (rets) {
            assert(rets.length === 2);
            assert(rets[0] === 1);
            assert(rets[1] === 2);
            done();
        }, function (err) {
            assert(false);
        });
    });
    it('Cancel task happy path', function () {
        var canceled = false;
        var cancelContext;
        var task = SyncTasks.Defer();
        task.onCancel(function (context) {
            canceled = true;
            cancelContext = context;
            task.reject(5);
        });
        var promise = task.promise();
        promise.cancel(4);
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
    it('Cancel task chained', function () {
        var canceled = false;
        var cancelContext;
        var task = SyncTasks.Defer();
        task.onCancel(function (context) {
            canceled = true;
            cancelContext = context;
            task.reject(5);
        });
        var promise = task.promise();
        var secPromise = promise.then(function () {
            assert(false);
            return SyncTasks.Rejected();
        }, function (err) {
            assert.equal(err, 5);
            assert(canceled);
            assert.equal(cancelContext, 4);
            return void 0;
        });
        secPromise.cancel(4);
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
});
