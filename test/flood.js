var N = require('./simulate')

var tape = require('tape')

function has (peer) {
  return peer.input.length
}

//broadcast to peers, except the one you received the message from.
function work (state, peer, step) {
  var N = 0
  var data = peer.input.shift()
  if(!data) throw new Error('expected message')
  //do not forward if we have already seen this message
  if(peer.state[data.value]) return 0

  peer.state[data.value] = true
  for(var k in peer.peers) {
    if(+k !== data.key) {
      console.log(peer.id,'->',k, {value: data.value, key: peer.id})
      N++
      state.network[k].input.push({value: data.value, key: peer.id})
    }
  }

  return N
}

tape('ring', function (t) {
  var state = N.initialize()
  var a = N.addPeer(state)
  var b = N.addPeer(state)
  var c = N.addPeer(state)

  N.connect(a, b); N.connect(b, c); N.connect(c, a)

  //a spontaniously (user input) decides to broadcast "foo"
  a.input.push({value:'foo', key: 0})

  var A = N.evolve(state, has, work)

  t.equal(A, 4) //5 messages moved initial, + 4 passes to a peer.

  for(var k in state.network)
    t.ok(state.network[k].state.foo)

  t.end()

})

//and then verify that everyone received the message.

tape('chain', function (t) {
  var state = N.initialize()
  var a = N.addPeer(state)
  var b = N.addPeer(state)
  var c = N.addPeer(state)

  N.connect(a, b); N.connect(b, c)

  //a spontaniously (user input) decides to broadcast "foo"
  a.input.push({value:'foo', key: 0})

  var A = N.evolve(state, has, work)

  t.equal(A, 2)

  for(var k in state.network)
    t.ok(state.network[k].state.foo)

  t.end()
})

tape('random', function (t) {
  var state = N.initialize()
  //generate a random connected network
  var a = N.random(state, 7)
  console.log(state)
  a.input.push({value:'foo', key: 0})

  var A = N.evolve(state, has, work)

  t.ok(A >= 6, A+' >= 6') //5 messages moved initial, + 4 passes to a peer.
  t.ok(A < 6*2-1) //5 messages moved initial, + 4 passes to a peer.

  for(var k in state.network)
    t.ok(state.network[k].state.foo, 'peer'+k+' has foo')

  t.end()
})


//since this network is over connected
//messages are resent, and only blocked when a peer receives a message twice.
//a clique of 4 sends 9 messages, but if any message moves, it does one more run
//through the network.
tape('fully connected', function (t) {
  var state = N.initialize()
  var a = N.clique(state, 4)
  a.input.push({value:'foo', key: 0})

  var A = N.evolve(state, has, work)

  for(var k in state.network)
    t.ok(state.network[k].state.foo, 'peer'+k+' has foo')
  t.ok(A>=4)
  t.ok(A<=10)
  t.end()
})



