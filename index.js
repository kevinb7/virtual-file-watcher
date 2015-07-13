var fs = require('fs');
var EventEmitter = require('events').EventEmitter;
var Rx = require('rx');
var _ = require('lodash');
var chokidar = require('chokidar');
var babel = require('babel-core');


function File(path, contents) {
    this.path = path;
    this.contents = contents;
}

function watch(dir) {
    var ee = new EventEmitter();
    var watcher = chokidar.watch(dir, {
        ignored: /[\/\\]\./, persistent: true
    });

    var observable = Rx.Observable.fromEventPattern(
        function addHandler (h) {
            ee.on("update", h);
        },
        function delHandler (h) {
            ee.removeListener("update", h);
        });

    watcher.on('add', function(path) {
        fs.readFile(path, function(err, data) {
            if (err) {
                console.error(err);
                return;
            }
            ee.emit("update", new File(path, data.toString('utf-8')));
        });
    });

    watcher.on('change', function(path) {
        fs.readFile(path, function(err, data) {
            if (err) {
                console.error(err);
                return;
            }
            ee.emit("update", new File(path, data.toString('utf-8')));
        });
    });

    return observable;
}

var watcher = watch('example/src');
var sourcePaths = [
    'example/src/test1.js',
    'example/src/test2.js'
];

function pick(files) {
    return function (file) {
        return files.indexOf(file.path) !== -1;
    }
}

function error(file) {
    return file instanceof File;
}

function compile(options) {
    // TODO: don't compile dependencies
    return function(file) {
        try {
            return new File(file.path, babel.transform(file.contents).code);
        } catch(e) {
            console.log(e.codeFrame);
            return e;
        }
    }
}

function concat(paths, dest) {
    var cache = {};
    return function (file) {
        cache[file.path] = file;
        if (_.isEqual(paths, Object.keys(cache))) {
            var contents = paths.reduce(function (bundle, path) {
                var file = cache[path];
                return bundle + file.contents + '\n';
            }, '');
            return new File(dest, contents);
        }
    }
}

Rx.Observable.prototype.mapFilter = function(mapFn, filterFn) {
    return this.map(mapFn).filter(filterFn);
};

Rx.Observable.prototype.transform = function(fn) {
    return this.mapFilter(fn, error);
};

Rx.Observable.prototype.pick = function(paths) {
    return this.filter(pick(paths));
};

Rx.Observable.prototype.write = function() {
    return this.map(function (file) {
        fs.writeFile(file.path, file.contents);
        return file;
    });
};

Rx.Observable.prototype.log = function() {
    return this.map(function (file) {
        console.log(file.contents);
        return file;
    });
};

Rx.Observable.prototype.drain = function() {
    this.subscribe(function() {});
};

watcher
    .pick(sourcePaths)
    .transform(compile())
    .transform(concat(sourcePaths, "test/build/bundle.js"))
    .log()
    .write()
    .drain();

// TODO: run tests
