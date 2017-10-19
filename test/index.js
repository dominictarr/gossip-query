
var GossipQuery = require('../')

var tape = require('tape')

var gq = GossipQuery({
  check: function (_, cb) { cb(null, true) },
  process: function (query, cb) { cb() },
  isQuery: function (query) { return true },
  isResponse: function (res) { return 'boolean' === typeof res }
})

tape('simple', function (t) {

  gq.query('query', function (err, value) {
    t.equal(value, true)
    t.notOk(err)
    t.end()
  })

  console.log(gq)

})
