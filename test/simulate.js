
exports.initialize = function () {
  return {network: {}, peer: 0}
}

exports.addPeer = function (state) {
  state.peer ++
  return state.network[state.peer] = {
    id: state.peer,
    input: [],
    state: {},
    peers: {}
  }
}

exports.addDatabase = function database (state, peer) {
  state.peers ++
  peer.database = K
  return state.network[state.peers] = {
    //QUESTION: database responses be treated like a network input back to the original peer?
    id: state.peers ++, input: [],
    state: {},
    type: 'database'
  }
}

exports.connect = function (a, b) {
  a.peers[b.id] = true
  b.peers[a.id] = true
}

exports.random = function (state, n, addPeer, connect) {
  addPeer = addPeer || exports.addPeer
  connect = connect || exports.connect
  var first = addPeer(state)
  var peers = [first]
  while(--n) {
    var newest = addPeer(state)
    connect(newest, peers[~~(Math.random()*peers.length)])
    peers.push(newest)
  }
  return first
}

exports.clique = function (state, n, addPeer, connect) {
  addPeer = addPeer || exports.addPeer
  connect = connect || exports.connect

  var peers = []
  for(var i = 0;i < n; i++) {
    peers.push(addPeer(state))
    for(var j = 0; j < i; j++)
      connect(peers[i], peers[j])
  }
  return peers[0]
}

exports.evolve = function (state, has, work) {
  var A = 0, M = 0
  var loop = true
  while (loop) {
    loop = false
    var events = []
    for(var k in state.network) {
      var peer = state.network[k]
      if(has(peer))
        events.push(peer)
    }
    //randomly select a action and do it.
    var next = events[~~(Math.random()*events.length)]
    loop = !!events.length
    if(next) {
      A++
      M += work(state, next, A)
    }
  }
  return M
}

