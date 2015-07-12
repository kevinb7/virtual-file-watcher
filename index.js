var util = require('util');
var EventEmitter = require('events').EventEmitter;
var fs = require('fs');
var chokidar = require('chokidar');
var babel = require('babel-core');

var watcher = chokidar.watch('test/src', {
    ignored: /[\/\\]\./, persistent: true
});

var log = console.log.bind(console);

function RealFile(path) {
    this.path = path;
    this.content = null;
    fs.readFile(path, function(err, data) {
        this.content = data.toString('utf-8');
        this.emit("update", this);
    }.bind(this));
}

util.inherits(RealFile, EventEmitter);

RealFile.prototype.update = function() {
    fs.readFile(this.path, function(err, data) {
        this.content = data.toString('utf-8');
        this.emit("update", this);
    }.bind(this));
};

RealFile.prototype.read = function() {
    if (!this.content) {
        this.content = fs.readFileSync(this.path);
    }
    return this.content;
};

var realFiles = {};
var paths = ["test/src/test1.js", "test/src/test2.js"];
paths.forEach(function (path) {
    realFiles[path] = new RealFile(path);
});

function VirtualFile(sources, update) {
    this.sources = sources;
    this.content = null;
    var _this = this;
    var callback = function(content) {
        _this.content = content;
        _this.emit("update", _this);
    };
    sources.forEach(function (source) {
        source.on("update", function (source) {
            update(_this, source, callback);
        });
    });
}

// TODO: add a process method that returns another instance which is automatically listening to the source

util.inherits(VirtualFile, EventEmitter);

var virtualFiles = {};
paths.forEach(function (path) {
    virtualFiles[path] = new VirtualFile([realFiles[path]], function (vf, source, callback) {
        try {
            callback(babel.transform(source.content).code);
        } catch (e) {
            console.log(e.codeFrame);
        }
    });
});


var concatFile = new VirtualFile(
    paths.map(function (path) { return virtualFiles[path]; }),
    function(vf, source, callback) {
        // TODO guarantee that all sources have content first
        var allContent = vf.sources.every(function(source) {
            return source.content !== null;
        });
        if (allContent) {
            var content = vf.sources.map(function (source) {
                return source.content;
            }).join("\n");
            callback(content);
        }
    }
);

concatFile.on("update", function(concatFile) {
    console.log(concatFile.content);
    fs.writeFile("test/build/bundle.js", concatFile.content, function (err) {
        if (!err) {
            console.log("[BAKE] wrote bundle.js");
        }
    });
});

watcher
    .on('add', function(path) {
        log('File', path, 'has been added');
    })
    .on('addDir', function(path) { log('Directory', path, 'has been added'); })
    .on('change', function(path) {
        log('File', path, 'has been changed');
        realFiles[path].update();
    })
    .on('unlink', function(path) { log('File', path, 'has been removed'); })
    .on('unlinkDir', function(path) { log('Directory', path, 'has been removed'); })
    .on('error', function(error) { log('Error happened', error); })
    .on('ready', function() { log('Initial scan complete. Ready for changes.'); });
