var fs = require('fs');
var Rx = require('rx');
var chokidar = require('chokidar');
var File = require('./file.js');

Rx.Observable.prototype.transform = function(fn) {
    var options = this.options;

    var observable = this.map(fn).filter(function (file) {
        if (file instanceof Error) {
            if (options.debug) {
                console.log("DEBUG: " + file);
            }
            if (options.once) {
                throw file;
            }
        }

        return file instanceof File;
    });

    observable.options = options;

    return observable;
};

Rx.Observable.prototype.end = function() {
    var options = this.options;

    return this.catch(function (error) {
        console.log("finished early");
        // early end
    }).subscribe(function(file) {
        // next handler
        if (options.once) {
            process.exit();
        }
    }, function() {
        // error handler
    }, function () {
        // completion handler
        process.exit();
    });
};

function watch(paths, options) {
    options = options || {};

    var watcher = chokidar.watch(paths, {
        ignored: /[\/\\]\./, persistent: true
    });

    var observable = Rx.Observable.create(function (obs) {
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
        watcher.on('change', listener);

        return function() {
            watcher.close();
            process.exit(0);
        };
    });

    observable.options = options;

    return observable;
}

module.exports = watch;
