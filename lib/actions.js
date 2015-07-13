var fs = require('fs');
var _ = require('lodash');

var File = require('./file.js');

function compile(options) {
    options = options || {};
    return function(file) {
        if (options.regex && !options.regex.test(file.path)) {
            return file;
        }
        try {
            return new File(file.path, options.compiler(file.contents));
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
    }
}

function log(file) {
    console.log("wrote " + file.path);
    console.log(file.contents);
    return file;
}

function write(file) {
    // TODO return an observable and then flatMap it
    fs.writeFileSync(file.path, file.contents);
    return file;
}

module.exports = {
    compile: compile,
    concat: concat,
    log: log,
    write: write
};
