# Realtime Control Plane v1

The v1 WebSocket endpoint is `/ws/v1`. The client must offer, and the server
must select, the `guiltyparty.control.v1` WebSocket subprotocol. A connection
that does not negotiate that value is not a v1 connection.

Both directions use the envelopes in
`../../control-plane/v1/control-plane.schema.json`:

- client to server: `ClientEnvelope`
- server to client: `ServerEnvelope`

`message_id` is unique within the sending endpoint. A direct response copies
the request's `message_id` into `correlation_id`. A command also carries an
`idempotency_id`; retries of the same logical command reuse it. A
`command_result` records acceptance or safe rejection for that identifier. An
authorized projection and command result carry the latest canonical journal
sequence in `server_sequence`. Transport identifiers and ordering metadata do
not become scenario truth.

`session_id` and `endpoint_id` are required once the server has issued those
contexts. They are optional only for compatibility discovery, joining, and
messages sent before the corresponding context exists. They identify a game
session and a connection endpoint—not a room, person, participant, character,
or device.

Schema validity never grants authority. The server authenticates the
connection, authorizes every command, and builds a recipient-specific
projection before serialization.
