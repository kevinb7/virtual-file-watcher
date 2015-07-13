var fs = require('fs');
var _ = require('lodash');
var minify = require('minify');

var File = require('./file.js');

exports.compile = function(options) {
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
};

exports.concat = function(paths, dest) {
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
};

exports.log = function(file) {
    console.log("wrote " + file.path);
    //console.log(file.contents);
    return file;
};

exports.write = function(file) {
    // TODO return an observable and then flatMap it
    fs.writeFileSync(file.path, file.contents);
    return file;
};

exports.minify = function(file) {
    try {
        minify({
            ext: '.js',
            data: file.contents
        }, function(error, data) {
            if (!error) {
                file = new File(file.path.replace('.js', '.min.js'), data);
            }
        });
    } catch (e) {
        console.log(e);
    }

    return file;
};
