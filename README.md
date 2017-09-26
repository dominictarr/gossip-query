# gossip-query

flooding gossip search for p2p.

## pseudocode

```
something is requested,
check for it locally (async),
    if you have it
      respond to peers who requested
    else
      ask peers,
      process response (async)
      respond to peers who requested
```
> note: "peers who requested" can be the local user or a remote peer.
  if a second request is made for queries already in the system,
  the requestor is just added to the waiting callbacks, instead of starting
  that request over.

## protocol

requests are sent in the form of a JSON object, with the query string
as the key
{<query>: <hops> || <response>,...}

this way, more than one request/response can be broadcast in a single packet.
normally, `<hops>` is a negative integer
(but could be some other representation
of the weighting of how important the request is, as long as it's distinct
from any value of `<response>`)
`<response>` can be any value, and in some cases it allows only one value,
for example,
in ssb-blobs the request is the blob hash, and the response
is the size of the blob.
in a search query, the request would be the query string,
and the result is responses (which might be message ids or something like that)

for protocols that can have multiple responses, a reduce function is supplied
that combines those results.

## data structure

the state of the protocol is represented as a {} object of the state
of each request.

```
{<query>: <state>,...}
```
`state` holds information about what phase this query is in,
this contains a list of peers (can include the local user) who have
made a particular query, (and that the response will be transmitted to,
once received) it contains the value received (if we have it)

requested values should be cached for some length of time, but eventually
gc'd (maybe combining a count and a time limit)

> i'm not completely clear on what the state object needs to look like
  it might need a map of which peers have requested and which peers have
  been sent data.

## pull based

to make the protocol properly pullish (and respect back pressure)
i think the right idea is that when a peer is ready for data,
iterate over the state objects and check which have data for them,
this way it can just wait as long as necessary if the peer doesn't
want anything yet.



## processing

the processing step, (after a response is received from a peer)
is optional - but in the case of ssb-blobs would be used to request
that blob from the peer.

## License

MIT

