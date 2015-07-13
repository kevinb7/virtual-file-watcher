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

var debug = false;

function watch(paths, options) {
    options = options || {};
    debug = !!options.debug;

    var ee = new EventEmitter();
    var watcher = chokidar.watch(paths, {
        ignored: /[\/\\]\./, persistent: true
    });

    var observable = Rx.Observable.fromEventPattern(
        function addHandler (h) {
            ee.on("update", h);
        },
        function delHandler (h) {
            ee.removeListener("update", h);
        });

    var update = function(path) {
        fs.readFile(path, function(err, data) {
            if (err) {
                console.error(err);
                return;
            }
            ee.emit("update", new File(path, data.toString('utf-8')));
        });
    };

    watcher.on('add', update);
    watcher.on('change', update);

    return observable;
}

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
    this.subscribe(function() {});
};

function compile(options) {
    options = options || {};
    return function(file) {
        if (options.regex && !options.regex.test(file.path)) {
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
        return new Error("waiting on dependencies");
    }
}

function log(file) {
    console.log("wrote " + file.path);
    return file;
}

function write(file) {
    fs.writeFile(file.path, file.contents, function (err) {
        if (err) {
            console.log(err);
        }
    });
    return file;
}

var sourcePaths = [
    'example/src/test1.js',
    'example/src/test2.js'
];

watch(sourcePaths, { debug: true })
    .transform(compile({ regex: /^example\/src/ }))
    .transform(concat(sourcePaths, "example/build/bundle.js"))
    .transform(log)
    .transform(write)
    .end();

// TODO: run tests
