var GossipQuery = require('../')
var pull = require('pull-stream')

var tape = require('tape')

var check_cb, process_cb

function once (fn) {
  var called = false
  return function (a,b,c) {
    if(called) throw new Error('called twice')
    called = true
    return fn(a, b, c)
  }
}

function GQ (store) {
  return GossipQuery({
    check: function (key, cb) {
      check_cb = once(cb)
    },
    process: function (key, value, cb) {
      process_cb = once(cb)
    },
    isQuery: function (key) { return true },
    isResponse: function (value) { return null != value  }
  })
}

/*
all these tests are sync, because it makes it really
easy to reason about the ordering of events and
produce correct tests

copied these tests from ./index.js and added explicit
ordering from the cb's but I think these cases test cases
are too simple to really have problems. This still looks
like 
*/

tape('simple', function (t) {
  var gq = GQ({query: true})
  gq.query('query', function (err, value) {
    t.equal(value, true)
    t.notOk(err)
    t.end()
  })
  check_cb(null, true)
})

tape('stream: send request', function (t) {
  var gq = GQ({}), _value
  gq.query('query', function (err, value) {
    _value = value
  })
  t.notOk(_value)

  var stream = gq.createStream(), a = [], read_cb


  stream.sink(function (_, cb) {
    read_cb = cb
  })

  //{!2 orderings...

  stream.source(null, function (err, msg) {
    if(err) throw err
    t.deepEqual(msg, {query: -1})

    //read_cb causes process.
    read_cb(null, {query: 'result'})
    process_cb(null, 'result')

    t.equal(_value, 'result')
    t.end()
  })

  check_cb() //not found

  //...}
})

tape('stream: send response', function (t) {
  var gq = GQ({foo: 'bar'})
  var stream = gq.createStream(), read_cb

  stream.sink(function (_, cb) {
    read_cb = cb
  })

  //send a request
  read_cb(null, {foo: -1})

  stream.source(null, function (err, msg) {
    if(err) throw err
    t.deepEqual(msg, {foo: 'bar'})
    t.end()
  })

  check_cb(null, 'bar')
})

tape('stream: broadcast request', function (t) {
  var gq = GQ({})
  var stream1 = gq.createStream(), read_cb1

  stream1.sink(function (_, cb) {
    read_cb1 = cb
  })

  var stream2 = gq.createStream(), read_cb2

  stream2.sink(function (_, cb) {
    read_cb2 = cb
  })

  //send a request
  read_cb1(null, {foo: -1})

  stream2.source(null, function (err, msg) {
    if(err) throw err
    t.deepEqual(msg, {foo: -2})
    //then send a response...
    read_cb2(null, {foo: 'bar'})
    process_cb(null, 'bar')
  })

  //response should make it back to stream1
  stream1.source(null, function (err, msg) {
    t.deepEqual(msg, {foo: 'bar'})
    t.end()
  })

  check_cb() //not found

})



