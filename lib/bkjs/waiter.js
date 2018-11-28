/*!
 * Async waiter helper for handlebars
 * Provides the async helper functionality
 *
 * Copyright (c) 2012-2014 Barc, Inc.
 *
 * @source https://github.com/barc/express-hbs/blob/master/lib/async.js
 * @license MIT License
 */

'use strict';

var alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_';

var genId = function() {
    var res = '';

    for (var i=0 ; i<8 ; ++i) {
        res += alphabet[Math.floor(Math.random() * alphabet.length)];
    }

    return res;
}

function Waiter() {
    if (! (this instanceof Waiter)) {
        return new Waiter();
    }

    // found values
    this.values = {};

    // callback when done
    this.callback = null;

    this.resolved = false;

    this.count = 0;
};

Waiter.prototype.wait = function() {
    ++this.count;
};

// resolve the promise
Waiter.prototype.resolve = function(name, val) {
    var self = this;

    this.values[name] = val;

    // done with all items
    if (--this.count === 0) {
        this.resolved = true;

        // we may not have a done callback yet
        if (this.callback) {
            this.callback(this.values);
        }

        // free mem
        Object.keys(this.values).forEach(function(id) {
            self.values[id] = null;
        });
    }
};

// sets the done callback for the waiter
// notifies when the promise is complete
Waiter.prototype.done = function(fn) {
    this.callback = fn;

    if (this.resolved) {
        fn(this.values);
    }
};

module.exports = function() {
    // baton which contains the current
    // set of deferreds
    var waiter;

    var obj = Object.create(null);

    // callback fn when all async helpers have finished running
    // if there were no async helpers, then it will callback right away
    obj.done = function done(fn) {
        // no async things called
        if (! waiter) {
            return fn({});
        }

        waiter.done(fn);

        // clear the waiter for the next template
        waiter = undefined;
    };

    obj.resolve = function resolve(fn, context) {
        // we want to do async things, need a waiter for that
        if (! waiter) {
            waiter = new Waiter();
        }

        var id = '__' + genId() + '__';

        var curWaiter = waiter;

        waiter.wait();

        fn(context, function(res) {
            // timeout workaround for counter 
            var tid = setTimeout(function() {
                curWaiter.resolve(id, res);

                clearTimeout(tid);
            }, 0);
        });

        // return the id placeholder
        // this will be replaced later
        return id;
    };

    return obj;
};