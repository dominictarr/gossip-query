# gossip-query

this is a flooding gossip search for p2p.

peers make a request, and if they do not have that record
they forward it to their current peers. (and add it to a table of things they are looking for)

when they connect to a new peer, they'll request everything in the current lookup table.

when they receive 

1. user or peer asks for something.
2. check if you already have result in your cache.
3. ask peers for the thing.
4. receive the thing, process it
(async, this can be retriving it, or waiting for some more answers, or confirming it in some way)
5. broadcast answers to anyone who had requested it from you.

Sometimes a query has an exact answer: Asking for something by hash.
Other times you do a query and there can be multiple valid answers:
Results of a keyword search, which peers have a file, the later is more general,
so the former can be handled as a special case.

## format of a request

A request is a arbitary string, with a hop count. The hop count is
the distance to the originating peer. The request is from the local
user, the hop count will be 1. If it was from a friend it will be 2,
a friend of a friend will be 3, etc. This allows a configuration
setting for the maximum number of hops, and also to perform flow
control, where an overloaded peer can drop requests from with
higher hop counts (helping nearby peers, instead of distant peers)

hmm, combine querys into a json object with hops?

``` js
{
  <query>: <hops>,...
}
```
this way any ongoing queries can be batched on a new connection.

## License

MIT





