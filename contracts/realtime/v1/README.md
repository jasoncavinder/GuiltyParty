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

An eligible, feature-negotiated Stage may receive a bounded logical
`presentation` decoration inside its already-authorized public scene. It never
contains a URL, path, bytes, or private audience. The Stage may report coarse
ephemeral availability, mute, playback, and reduced-motion status; the server
relays that status only to an independently eligible Host. Presentation status
is not retained in the journal and does not affect canonical replay.
