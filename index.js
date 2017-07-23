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
/*
{
  //incoming queries
  queried: {

  },
  requests: {
    //<query>: <hops>,
  },
  received: {
    //<query>: result
  },
  results: {

  }
}
*/

function request (state) {
  var queries = state.queries)
  state.queries = {}
  for(var k in queries)
    //remember in process queries
    state._queries[k] = queries[k]
    get(k, function (err, value) {
        state._queries[k] = null
      if(value)
        state.results[k] = value
      else
        state.requests[k] = queries[k]

      update(state)
    })

}


