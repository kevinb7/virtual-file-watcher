var watch = require('./lib/watch.js');

var actions = require('./lib/actions.js');
var compile = actions.compile;
var concat = actions.concat;
var log = actions.log;
var write = actions.write;
var minify = actions.minify;

var babel = require('babel-core');

var sourcePaths = [
    'example/src/test1.js',
    'example/src/test2.js'
];

watch(sourcePaths, { debug: true, once: true })
    .transform(compile({
        compiler: function (code) { return babel.transform(code).code },
        regex: /^example\/src/
    }))
    .transform(concat('example/build/bundle.js'))
    .transform(write)
    .transform(log)
    .transform(minify)
    .transform(log)
    .transform(write)
    .end();

// TODO: run tests
// TODO: add newer... check all sources including deps
// TODO: make reporting compiler errors more general, try this with TypeScript
// TODO: validate specified paths
// TODO: what about globs? turn them into an array of full specified paths
