# Bundled Stage Media Provenance

## Scope and Approval

This record covers the two original public presentation assets approved by the
project owner on 2026-08-10 HST for the first bounded Stage media proof in
[ADR 0040](../adr/0040-bundled-stage-presentation-media.md). Approval is limited
to these exact bytes, their use in the synthetic `the-stolen-artifact` content
version 2 package, and the locally bundled public LG webOS Stage presentation.

Neither asset contains participant data, private scenario content, speech,
recording, a copied melody, a trademark, or third-party stock material.

## Cinematic Gallery Image

- File: `apps/tv/lg-webos/assets/presentation/stage-discovery-cinematic-gallery-1920x1080.png`
- Dimensions: 1920 by 1080
- Size: 2,588,828 bytes
- SHA-256: `08b8670b046f7e9c271e641e31dbdea556ecd556024b4b13ee515d1c9ba278db`
- Creation date: 2026-08-10 HST
- Creation method: Codex built-in OpenAI image-generation workflow, followed
  by deterministic resampling with the macOS image tooling

The original prompt requested a wholly original, grand museum gallery at night
with an empty pedestal, muddy footprints, plum-and-gold theatrical lighting,
no people, no text, no private clue, and no essential information encoded only
in the image. An incidental watch-like object in the first output was removed
with a precise edit. The owner explicitly selected the cleaned version without
that object.

The finalization pass used the cleaned first-party candidate as its sole image
input and required preservation of the empty pedestal, architecture, display
cases, framed painting, flowers, distant banquet tables, amber light, purple
shadows, reflective floor, and muddy footprints. It explicitly prohibited a
watch, medallion, jewelry, cord, clue, weapon, paper, artifact, text, logo,
person, UI, watermark, or any replacement narrative prop. The result was
resampled to the exact 1920-by-1080 packaged-Stage dimensions.

No named artist, copyrighted character, third-party image, stock asset, or
external reference artwork was supplied to either image-generation pass.

## Cinematic Vault Atmosphere

- File: `apps/tv/lg-webos/assets/presentation/stage-discovery-cinematic-vault.wav`
- Format: stereo, 44.1-kHz, signed 16-bit PCM WAV
- Duration: 8 seconds
- Size: 1,411,244 bytes
- SHA-256: `3187fe4ba7769021bcbf0919adf4a8ac6089e510b274783dfcc357ded02ebe98`
- Creation date: 2026-08-10 HST
- Creation method: deterministic Python standard-library synthesis reproduced
  by `tooling/generate_stage_atmosphere.py`

The generator uses only seeded integer-cycle sine banks to create a seamless,
noise-like room tone. It contains no sample, recording, imported waveform,
third-party package, network call, model output, or copied melody. The audio is
nonverbal, nonessential atmosphere and remains optional during play.

## Verification and Boundary

The webOS build verifies both exact digests, format signatures, dimensions or
audio parameters, duration, and bounded size before embedding either asset.
The committed presentation manifest carries logical identifiers and digests,
not media bytes, file paths, or network URLs. Runtime server input cannot select
an arbitrary media source.

This provenance record documents project review; it is not a general license
grant and does not change Guilty Party's proprietary licensing terms.
