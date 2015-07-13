var watch = require('./lib/watch.js');

var actions = require('./lib/actions.js');
var compile = actions.compile;
var concat = actions.concat;
var log = actions.log;
var write = actions.write;

var sourcePaths = [
    'example/src/test1.js',
    'example/src/test2.js'
];

watch(sourcePaths, { debug: true })
    .transform(compile({ regex: /^example\/src/ }))
    .transform(concat(sourcePaths, "example/build/bundle.js"))
    .transform(log)
    .transform(write)
    .take(1)
    .end();

// TODO: run tests
// TODO: quit if anything errors when options.once = true;
