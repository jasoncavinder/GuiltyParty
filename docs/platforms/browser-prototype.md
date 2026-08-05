# Browser Host and Stage Prototype

## Status and Scope

The Host Console and Stage are dependency-free browser proof-of-concept surfaces for the local MVP. They validate LAN addressing, server-authorized commands, recipient-specific projections, and realtime refreshes.

This runbook does not claim native iOS support, LG webOS packaging, device pairing, transport security, or production readiness.

## Start a Local Session

1. Choose a random Host token containing at least 24 characters. Do not commit or log it.
2. Start the server from the repository root:

   ```sh
   GP_HOST_TOKEN='replace-with-a-random-value-at-least-24-characters' make run-server
   ```

3. In separate terminals, serve the two browser surfaces:

   ```sh
   make run-host
   make run-stage
   ```

4. Open `http://localhost:8080` for the Host Console and `http://localhost:8081` for the Stage.
5. Enter `http://localhost:3000` in each surface. Enter the process Host token only in the Host Console.

The AI remains disabled unless the operator separately sets both `GP_AI_ENDPOINT` and `GP_AI_MODEL` to an approved local endpoint and model identifier.

## LAN Browser Check

Replace `192.168.1.20` with the Mac's current LAN address and start the server with exact browser origins:

```sh
GP_HOST_TOKEN='replace-with-a-random-value-at-least-24-characters' \
GP_ALLOWED_ORIGINS='http://192.168.1.20:8080,http://192.168.1.20:8081' \
make run-server
```

Open `http://192.168.1.20:8080` and `http://192.168.1.20:8081` from trusted devices on the same LAN, then configure both surfaces to use `http://192.168.1.20:3000`.

Do not use `127.0.0.1` on a television or phone to reach the Mac. Do not add wildcard origins. A packaged runtime that sends `Origin: null` requires the operator to add the exact value `null`; do this only on a trusted development LAN.

## Journal Replay and Reset

The server writes accepted synthetic state transitions to `server/data/mvp-session.jsonl` by default and replays them against the embedded scenario version on restart. Override the path with `GP_JOURNAL_PATH` when needed.

To reset the prototype, stop the server and delete only the configured journal file. The default reset command from the repository root is:

```sh
rm server/data/mvp-session.jsonl
```

Authority tokens are process-local. Restarting the server invalidates browser tokens even though canonical scenario state is replayed.

## Current Demonstration Boundary

The Host Console may create synthetic participant identities so assignment and public projection changes can be observed. Those buttons do not emulate private Companion connections and intentionally discard the returned participant authority without logging it.

Private Companion projections, participant voting, native iOS behavior, physical LG webOS packaging, and full acceptance replay remain follow-up work.
