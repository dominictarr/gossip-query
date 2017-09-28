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
  var localCbs = {}

  var initialWeight = opts.initialWeight || -1
  var increase = opts.increase || function (n) { return Number(n) + 1 }
  var isRequest = opts.isRequest || function (value) { return typeof value === 'number' && value < 0 }
  var isResponse = opts.isResponse || function (value) { return !isRequest(value) }

  function next () {
    throw new Error('not yet implemented')
  }

  function onUpdate () {
    for(var k in state) {
      //check the local store when new queries are added
      if(!state[k].checked && !state[k].checking) {
        state[k].checking = true
        opts.check(k, function (err, value) {
          if(err) console.trace(err) // TODO: delete or reject query?
          state[k].checking = false
          state[k].checked = true
          if(value && !state[k].value) {
            state[k].value = value
          }
        })
      }

      //process items received
      if(state[k].value != null && !state[k].processing && !state[k].ready) {
        state[k].processing = true
        opts.process(k, state[k].value, function (err, value) {
          if(err) console.trace(err) // TODO: reject query?
          state[k].processing = false
          state[k].ready = true
          if(value && !state[k].value) {
            state[k].value = value
            var cbs = localCbs[k]
            if (cbs) {
              delete localCbs[k]
              while (cbs.length) cbs.shift()(null, value)
            }
          }
        })
      }
    }
  }

  return {
    state: state,
    createStream: function (peerId) {
      return {
        source: function (end, cb) {
          if(end) {
            if(end !== true) console.trace(peerId, end)
            for(var k in state) {
              // TODO: use hashlru so we don't have to use delete
              delete state[k].respondedTo[peerId]
              delete state[k].requestedFrom[peerId]
            }
            return
          }
          //read the next pieces of data from the state object.
          ;(function read () {
            var data = {}
            for(var k in state) {
              if(
                //ready means it's been processed,
                //or we already had it locally (TODO).
                state[k].ready &&
                state[k].requestedBy[peerId] &&
                !state[k].respondedTo[peerId]
              ) {
                state[k].respondedTo[peerId] = true
                data[k] = state[k].value
              }
              else if(
                !state[k].ready &&
                state[k].checked &&
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
            if(end) {
              if(end !== true) console.trace(peerId, end)
              for(var k in state) {
                delete state[k].requestedBy[peerId]
              }
              return
            }
            //process this message and possibly update the state.
            var update = false
            for(var k in data) {
              if(isRequest(data[k])) {
                //if we already have seen this query:
                if(state[k]) {
                  state[k].requestedBy[peerId] = true
                  update = true
                }
                else {
                  state[k] = {
                    ready: false,
                    checked: false,
                    checking: false,
                    weight: increase(data[k]),
                    value: null,
                    requestedBy: {},
                    requestedFrom: {},
                    respondedTo: {}
                  }
                  state[k].requestedBy[peerId] = true
                  update = true
                }
              }
              else if(isResponse(data[k])) {
                //if this is a response,
                state[k].value = data[k]
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
      if(state[k]) {
        if(state[k].ready) {
          cb(null, state[k].value)
        }
        else if(!state[k].query) {
          update = true
          state[k].query = true
          localCbs[k] = [cb]
        }
        else {
          localCbs[k].push(cb)
        }
      }
      else {
        update = true
        state[k] = {
          ready: false,
          query: true,
          checked: false,
          checking: false,
          weight: initialWeight,
          value: null,
          requestedBy: {},
          requestedFrom: {},
          respondedTo: {},
        }
        localCbs[k] = [cb]
      }
      if(update) next()
    }
  }
}

