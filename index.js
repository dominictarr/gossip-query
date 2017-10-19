//1 user request

/*
  queried (check local cache) ->
  requests (broadcast to select peers) ->
  received (received requests) ->
  results (respond to any current queries)
*/

var Obv = require('obv')

var STATES = {
  queried: 1,
  checking: 2,
  checked: 3,

  //I realized that this state is maybe not necessary
  //since we actually track this on a per peer basis.
  //requesting: 4,

  responded: 5, //we have received at least one response

  processing: 6,
  processed: 7 //now we can broadcast this
}

function each (obj, fn) {
  for(var k in obj)
    fn(obj[k], k, obj)
}

function isEmpty (o) {
  for(var k in o) return false
  return true
}

module.exports = function (opts) {
  //opts has {check, process, isQuery, isResponse}
  var state = {}
  var localCbs = {}

  var initialWeight = opts.initialWeight || -1
  var increment = opts.increment || function (n) { return Number(n) - 1 }
  var isRequest = opts.isRequest || function (value) { return typeof value === 'number' && value < 0 }
  var isResponse = opts.isResponse || function (value) { return !isRequest(value) }

  var obv = Obv()
  obv.set(state)
  function next (fn) {
    if(!fn) obv.set(state)
    else obv.once(fn, false)
  }


  function callback (k, value) {
    if (localCbs[k]) {
      var cbs = localCbs[k]
      delete localCbs[k]
      while (cbs.length) cbs.shift()(null, value)
    }
  }

  obv(function () {
    each(state, function (item, k) {
      //check the local store when new queries are added
      if(item.state === STATES.queried) {
        item.state = STATES.checking
        opts.check(k, function (err, value) {
          if(err) console.trace(err) // TODO: delete or reject query?
          if(value && !item.value) {
            item.state = STATES.processed
            callback(k, item.value = value)
          }
          else
            item.state = STATES.checked

          obv.set(state)
        })
      }

      //process items received
      if(item.value != null && item.state === STATES.responded) {
        item.state = STATES.processing
        opts.process(k, item.value, function (err, value) {
          if(err) console.trace(err) // TODO: reject query?
          item.state = STATES.processed
          //this is the only place that localCbs is called,
          //except for in query(key, cb) if key is already ready.
          if(value) {
            callback(k, item.value = value)
          }
          obv.set(state)
        })
      }
    })
  })

  function initial (weight) {
    return {
      state: STATES.queried,
      weight: weight,
      value: null,
      requestedBy: {},
      requestedFrom: {},
      respondedTo: {}
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
                //this item has been received & processed, respond to any other peers
                //idea: make respondedTo be a counter, for queries with multiple answers.
                state[k].state === STATES.processed &&
                state[k].requestedBy[peerId] &&
                !state[k].respondedTo[peerId]
              ) {
                state[k].respondedTo[peerId] = true
                data[k] = state[k].value
              }
              else if(
                state[k].state === STATES.checked &&
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
              //Q: how does the source decide to end?
              //A: the network connection aborts the stream.
              return
            }
            //process this message and possibly update the state.
            var update = false
            for(var k in data) {
              if(isRequest(data[k])) {
                //if we already have seen this query:
                update = true
                if(state[k]) {
                  state[k].requestedBy[peerId] = true
                }
                else {
                  state[k] = initial(increment(data[k]))
                  state[k].requestedBy[peerId] = true
                }
              }
              else if(isResponse(data[k])) {
                if(state[k].state == STATES.checked) {
                  //what states can it be in here?
                  //what if we are currently processing something and a new response arrives?
                  state[k].state = STATES.responded
                  state[k].value = data[k]
                  update = true
                }
              }
            }
            if(update) next()
            read(null, more)
          })
        }
      }
    },

    query: function (k, cb) {
      //add to state object and update
      if(state[k]) {
        if(state[k].state == STATES.processed) cb(null, state[k].value)
        else localCbs[k].push(cb)
      }
      else {
        update = true
        state[k] = initial(initialWeight)
        localCbs[k] = [cb]
      }
      if(update) next()
    }
  }
}

