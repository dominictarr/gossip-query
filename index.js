//1 user request

/*
  queried (check local cache) ->
  requests (broadcast to select peers) ->
  received (received requests) ->
  results (respond to any current queries)
*/

/*

hmm, so I notice this is a chain of {}
with async steps between them.

hmm, or maybe they are input/output pairs
and the output of one happens to be the input of another?

OH! but if it's in your local cache, maybe you go straight
to results without boardcasting?

also, processing on messages received may move the request
to results, or it might drop it (if it was invalid)

---

what if we just started with local queries and results?

*/

module.exports = function (opts) {
  //opts has {check, process, isQuery, isResponse}
  var state = {}
  function next () {
    throw new Error('not yet implemented')
  }

  //loopy thing that checks the local store when new queries are added
  function onUpdate () {
    for(var k in state) {
      if(!state[k].checked) {
        opts.check(k, function (err, value) {
          state[k].checked = true
          if(value && !state[k].value) {
            state[k].value = value
          }
          onUpdate()
        }
      }
    }
  }

  //loopy thing that processes items received

  return {
    state: state,
    createStream: function (peerId) {
      return {
        source: function (end, cb) {
          //read the next pieces of data from the state object.
          ;(function read () {
            var data = {}
            for(var k in state) {
              if(
                //ready means it's been processed,
                //or we already had it locally.
                state[k].ready &&
                state[k].value != null &&
                state[k].requestedBy[peerId]
                !state[k].responded[peerId]
              ) {
                state[k].responded[peerId] = true
                data[k] = state[k].value
              }
              else if(
                !state[k].ready && state[k].query &&
                !state[k].requestedFrom[peerId]
              ) {
                state[k].requestedFrom[peerId] = true
                data[k] = state[k].weight //the number of hops, etc
              }
            }
            //next(read) calls read again when something changes in the state.
            if(isEmpty(data)) next(read)
            else cb(null, data)
          })()
        },
        sink: function (read) {
          read(null, function more (end, data) {
            //TODO: if end, remove peerID from the responded, requested{From,By} properties
            //process this message and possibly update the state.
            var update = false
            for(var k in data) {
              if(isRequest(data[k]) {
                //if we already have seen this query:
                if(state[k]) {
                  state[k].requestedBy[peerId] = true
                  update = true
                }
                else {
                  state[k] = {
                    ready: false,
                    query: false,
                    weight: increase(data[k]),
                    value: null,
                    requestedBy: {},
                    requestedFrom: {}
                    respondedTo: {},
                  }
                  state[k].requestedBy[peerId] = true
                  update = true
                }
              }
              else if(isResponse(data[k]) {
                //if this is a response,
                state[k].value = data[k]
                state[k].processing = true
                update = true
              }
            }
            if(update) next()
            read(null, more)
          })
        }
      }
    },

    query: function (query, cb) {
      //add to state object and update
    }
  }
}

