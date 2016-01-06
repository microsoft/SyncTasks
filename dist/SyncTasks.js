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
var SyncTasksInternal_1 = require('./SyncTasksInternal');
exports.config = SyncTasksInternal_1.config;
exports.Defer = SyncTasksInternal_1.Defer;
exports.Resolved = SyncTasksInternal_1.Resolved;
exports.Rejected = SyncTasksInternal_1.Rejected;
exports.whenAll = SyncTasksInternal_1.whenAll;
//# sourceMappingURL=SyncTasks.js.map