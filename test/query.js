var N = require('./simulate')

function has (peer) {
  return peer.input.length
}

function work2 (state, peer, step) {
  var N = 0
  var data = peer.input.shift()
  console.log(data.key, '=>', peer.id, data.value) 
  //if we are a database, respond with the value we have for that.
  if(peer.type === 'database') {
    //if(peer.state[data.value])
    console.log('read_db', data)
    state.network[data.key].input.push({
      key: peer.id, value: {
        key: data.value.key,
        value: {
          key: data.value.value,
          value: peer.state[data.value.value]
        }
      }
    })
  }
  else if(peer.database) {
    if(data.key === peer.database) {
      var key = data.value.value.key, value = data.value.value.value
      peer.state[key] = value
      console.log('output:', peer.request[key], value)
    }
    else {
      console.log('query db', data)
      peer.request = peer.request || {}
      peer.request[data.value] = data.key
      state.network[peer.database].input.push({key: peer.id, value: data})
    }
  }
  else
    console.log(data)
}

var tape = require('tape')

//next step: implement "databases" as if it's a peer nested inside a peer.

tape('single instance, query it, look up in database, respond', function (t) {
  var state = N.initialize()
  var a = N.addPeer(state)
  var db = N.addStore(state, a)
  db.state.foo = 'bar'
  a.input.push({key: 0, value: 'foo'})
  N.evolve(state, has, work2)
  console.log(JSON.stringify(state, null, 2))
  t.end()
})













