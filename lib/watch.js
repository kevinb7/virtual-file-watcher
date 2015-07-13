var fs = require('fs');
var Rx = require('rx');
var chokidar = require('chokidar');
var File = require('./file.js');

var debug = false;

Rx.Observable.prototype.transform = function(fn) {
    return this.map(fn).filter(function (file) {
        if (debug) {
            if (file instanceof Error) {
                console.log("DEBUG: " + file.message);
            }
        }
        return file instanceof File;
    });
};

Rx.Observable.prototype.end = function() {
    return this.catch(function (error) {
        console.log("Error: " + error);
    }).subscribe(function() {}, function() {}, function () {
        process.exit();
    });
};

function watch(paths, options) {
    options = options || {};
    debug = !!options.debug;

    var watcher = chokidar.watch(paths, {
        ignored: /[\/\\]\./, persistent: true
    });

    return Rx.Observable.create(function (obs) {
        var listener = function (path) {
            fs.readFile(path, function(err, data) {
                if (err) {
                    console.error(err);
                    return;
                }
                obs.onNext(new File(path, data.toString('utf-8')));
            });
        };

        watcher.on('add', listener);
        watcher.on('update', listener);

        return function() {
            watcher.close();
            process.exit(0);
        };
    });
}

module.exports = watch;
