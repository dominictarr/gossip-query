var GossipQuery = require('../')
var pull = require('pull-stream')

var tape = require('tape')

function GQ (store, id) {
  var gq = GossipQuery({
    check: function (key, cb) { cb(null, store[key]) },
    process: function (key, value, cb) { cb(null, value) },
    isQuery: function (key) { return true },
    isResponse: function (value) { return null != value  }
  })
  gq.id = id
  return gq
}

function connect(a, b) {
  var A = a.createStream(b.id), B = b.createStream(a.id)
  pull(A, B, A)
}

tape('simple', function (t) {

  var g1 = GQ({foo:'baz'})
  var g2 = GQ({})

  connect(g1, g2)

  g2.query('foo', function (err, value) {
    t.equal(value, 'baz')
    t.end()
  })

})

tape('double', function (t) {

  var g1 = GQ({foo:'baz'}, 1)
  var g2 = GQ({}, 2)
  var g3 = GQ({}, 3)

  connect(g1, g2)
  connect(g2, g3)

  g3.query('foo', function (err, value) {
    t.equal(value, 'baz')
    t.end()
  })

  console.log(g1.state)
  console.log(g2.state)
  console.log(g3.state)

})

tape('loop', function (t) {

  var g1 = GQ({foo:'baz'}, 1)
  var g2 = GQ({}, 2)
  var g3 = GQ({}, 3)

  connect(g1, g2)
  connect(g2, g3)
  connect(g1, g3)

  g3.query('foo', function (err, value) {
    t.equal(value, 'baz')
    t.end()
  })

  console.log(g1.state)
  console.log(g2.state)
  console.log(g3.state)

})

tape('empty loop', function (t) {

  var g1 = GQ({}, 1)
  var g2 = GQ({}, 2)
  var g3 = GQ({}, 3)

  connect(g1, g2)
  connect(g2, g3)
  connect(g1, g3)

  g3.query('foo', function (err, value) {
    t.equal(value, 'baz')
    t.end()
  })

  //when we connect a 4th peer, it will get queried
  //and broadcast it's answer
  var g4 = GQ({foo: 'baz'}, 4)
  connect(g1, g4)

})

