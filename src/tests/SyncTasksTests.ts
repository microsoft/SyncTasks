/// <reference path="dependencies.d.ts"/>

import assert = require('assert');

import SyncTasks = require('../SyncTasks');

describe('SyncTasks', function () {
    it('Simple - null resolve after then', (done) => {
        let task = SyncTasks.Defer<number>();

        task.promise().then(val => {
            assert.equal(val, null);
            done();
        }, err => {
            assert(false);
        });

        task.resolve(null);
    });

    it('Simple - null then after resolve', (done) => {
        let task = SyncTasks.Defer<number>();

        task.resolve(null);

        task.promise().then(val => {
            assert.equal(val, null);
            done();
        }, err => {
            assert(false);
        });
    });

    it('Simple - reject', (done) => {
        let task = SyncTasks.Defer<number>();

        task.reject(2);

        task.promise().then(val => {
            assert(false);
        }, err => {
            assert.equal(err, 2);
            done();
        });
    });

    it('Chain from success to success with value', (done) => {
        let task = SyncTasks.Defer<number>();

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

    it('Chain from fail to success with value', (done) => {
        let task = SyncTasks.Defer<number>();

        task.promise().then(val => {
            assert(false);
            return 3;
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
        let task = SyncTasks.Defer<number>();

        task.promise().then(val => {
            assert.equal(val, 3);
            return SyncTasks.Defer<number>().resolve(4);
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

    it('Chain from fail to success with promise', (done) => {
        let task = SyncTasks.Defer<number>();

        task.promise().then(val => {
            assert(false);
            return null;
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

    it('Chain from success to fail with promise', (done) => {
        let task = SyncTasks.Defer<number>();

        task.promise().then(val => {
            assert.equal(val, 2);
            return SyncTasks.Rejected(4);
        }, err => {
            assert(false);
            return void 0;
        }).then(val => {
            assert(false);
        }, err => {
            assert.equal(err, 4);
            done();
        });

        task.resolve(2);
    });

    it('Chain from fail to fail with promise', (done) => {
        let task = SyncTasks.Defer<number>();

        task.promise().then(val => {
            assert(false);
            return void 0;
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
        let task = SyncTasks.Defer<number>();

        task.promise().then(val => {
            assert.equal(val, 3);
            let itask = SyncTasks.Resolved<number>(4);
            return itask.then(val2 => {
                assert.equal(val2, 4, 'inner');
                return 5;
            });
        }, err => {
            assert(false);
            return null;
        }).then(val => {
            assert.equal(val, 5, 'outer');
            done();
        }, err => {
            assert(false);
        });

        task.resolve(3);
    });

    it('Exception in success to fail', (done) => {
        let task = SyncTasks.Defer<number>();

        SyncTasks.config.exceptionsToConsole = false;

        task.promise().then(val => {
            let blah: any = null;
            blah.blowup();
            return void 0;
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

    it('Exception in fail to fail', (done) => {
        let task = SyncTasks.Defer<number>();

        SyncTasks.config.exceptionsToConsole = false;

        task.promise().then(val => {
            assert(false);
        }, err => {
            let blah: any = null;
            blah.blowup();
            return void 0;
        }).then(val => {
            assert(false);
        }, err => {
            SyncTasks.config.exceptionsToConsole = true;
            done();
        });

        task.reject(3);
    });

    it('Finally basic', (done) => {
        let task = SyncTasks.Defer<number>();

        task.promise().then(val => {
            return 4;
        }, err => {
            assert(false);
            return void 0;
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

    it('Finally with success chaining', (done) => {
        let task = SyncTasks.Defer<number>();

        let innerWorked = false;

        task.promise().then(val => {
            return 4;
        }, err => {
            assert(false);
            return void 0;
        }).finally(val => {
            assert.equal(val, 4);
            let newtask = SyncTasks.Defer<number>();
            newtask.resolve(5);   // should be ignored
            return newtask.promise().then(val2 => {
                // this must run before the outer resolution
                innerWorked = true;
            });
        }).then(val => {
            assert(innerWorked);
            assert.equal(val, 4);
            done();
        }, err => {
            assert(false);
        });

        task.resolve(3);
    });

    it('Finally with failure chaining', (done) => {
        let task = SyncTasks.Defer<number>();

        let innerWorked = false;

        task.promise().then(val => {
            assert(false);
            return void 0;
        }).finally(val => {
            assert.equal(val, 3);
            let newtask = SyncTasks.Defer<number>();
            newtask.resolve(5);   // should be ignored
            return newtask.promise().then(val2 => {
                // this must run before the outer resolution
                innerWorked = true;
            });
        }).then(val => {
            assert(false);
        }, err => {
            assert(innerWorked);
            assert.equal(err, 3);
            done();
        });

        task.reject(3);
    });

    it('whenAll basic success', (done) => {
        let task = SyncTasks.Defer<number>();
        let task2 = SyncTasks.Defer<number>();
        let task3 = SyncTasks.Defer<number>();
        let task4 = SyncTasks.Defer<number>();

        SyncTasks.whenAll([task.promise(), task2.promise(), task3.promise(), task4.promise()]).then(rets => {
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

    it('whenAll basic failure', (done) => {
        let task = SyncTasks.Defer<number>();
        let task2 = SyncTasks.Defer<number>();

        SyncTasks.whenAll([task.promise(), task2.promise()]).then(rets => {
            assert(false);
        }, err => {
            done();
        });

        task.resolve(1);
        task2.reject(2);
    });

    it('whenAll zero tasks', (done) => {
        SyncTasks.whenAll([]).then(rets => {
            done();
        }, err => {
            assert(false);
        });
    });

    it('whenAll single null task', (done) => {
        SyncTasks.whenAll([null]).then(rets => {
            done();
        }, err => {
            assert(false);
        });
    });

    it('whenAll tasks and nulls', (done) => {
        let task = SyncTasks.Defer<number>();

        SyncTasks.whenAll([null, task.promise()]).then(rets => {
            done();
        }, err => {
            assert(false);
        });

        task.resolve(1);
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

        SyncTasks.whenAll([innerTask1.promise(), innerTask2.promise()]).then(rets => {
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

        SyncTasks.whenAll([innerTask1.promise(), innerTask2.promise()]).then(rets => {
            assert(rets.length === 2);
            assert(rets[0] === 1);
            assert(rets[1] === 2);
            done();
        }, err => {
            assert(false);
        });
    });
});
