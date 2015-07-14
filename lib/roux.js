var fs = require('fs');
var Rx = require('rx');
var chokidar = require('chokidar');
var _ = require('lodash');
var minify = require('minify');
var babel = require('babel-core');

function File(path, contents) {
    this.path = path;
    this.contents = contents;
}

Rx.Observable.prototype.pipe = function(fn) {
    var options = this.options;
    var sources = this.sources;

    var observable = this.map(function (file) {
        return fn(file, sources)
    }).filter(function (file) {
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
    observable.sources = sources;

    return observable;
};

Rx.Observable.prototype.end = function() {
    var options = this.options;

    return this.catch(function (error) {
        console.log("finished early");
        console.log(error);
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

exports.start = function (sources, options) {
    options = options || {};

    var watcher = chokidar.watch(sources, {
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
        if (!options.once) {
            // don't listen to changes if we're only running things once
            watcher.on('change', listener);
        }

        return function() {
            watcher.close();
            process.exit(0);
        };
    });

    observable.options = options;
    observable.sources = sources;

    return observable;
};

exports.babel = function(options) {
    options = options || {};
    return function(file) {
        if (options.test && !options.test(file.path)) {
            return file;
        }
        try {
            return new File(file.path, babel.transform(file.contents).code);
        } catch(e) {
            console.log("Syntax error in " + file.path);
            console.log(e.codeFrame);
            return e;
        }
    }
};

exports.concat = function(options) {
    var cache = {};
    return function (file, sources) {
        cache[file.path] = file;
        if (_.isEqual(sources, Object.keys(cache))) {
            var contents = sources.reduce(function (bundle, path) {
                var file = cache[path];
                return bundle + file.contents + '\n';
            }, '');
            return new File(null, contents);
        }
    }
};

exports.log = function(options) {
    return function(file) {
        console.log("wrote " + file.path);
        console.log(file.contents);
        return file;
    };
};

exports.write = function(options) {
    return function(file) {
        // TODO return an observable and then flatMap it
        if (options.dest instanceof Function) {
            options.dest = options.dest(file.path);
        }
        file.path = options.dest;
        fs.writeFileSync(file.path, file.contents);
        return file;
    };
};

exports.minify = function(options) {
    return function(file) {
        try {
            minify({
                ext: '.js',
                data: file.contents
            }, function(error, data) {
                if (!error) {
                    file = new File(file.path, data);
                }
            });
        } catch (e) {
            console.log(e);
        }

        return file;
    };
};

exports.cond = function(pred, action) {
    return function(file) {
        if (pred(file)) {
            return action(file);
        } else {
            return file;
        }
    };
};
