var Rx = require('rx');
var roux = require('./lib/roux.js');

var sources = [
    'example/src/test1.js',
    'example/src/test2.js'
];

roux.start(sources, { debug: true, once: false })
    .pipe(roux.babel({ test: function(path) { return /^example\/src/.test(path); } }))
    .pipe(roux.concat())
    .pipe(roux.write({ dest: 'example/build/bundle.js' }))
    .pipe(roux.log())
    .pipe(roux.minify())
    .pipe(roux.write({ dest: function(path) { return path.replace('.js', '.min.js'); } }))
    .pipe(roux.log())
    .end();

// TODO: run tests
// TODO: add newer... check all sources including deps
// TODO: make reporting compiler errors more general, try this with TypeScript
// TODO: validate specified paths
// TODO: what about globs? turn them into an array of full specified paths

// TODO: need to wrap all exposed RXJS functions so that they thread options and sources through to the next
//.groupBy(function (file) {
//    return /^example\/src/.test(file.path);
//})
//.flatMap(function (groupObs) {
//    return Rx.Observable.create(function (obs) {
//
//        groupObs.subscribe(function (o) {
//            console.log(arguments);
//            obs.onNext(o);
//        });
//
//        return function() {
//            watcher.close();
//            process.exit(0);
//        };
//    });
//})
