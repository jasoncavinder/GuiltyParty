# ADR 0021: Mobile Screen Capture and Stage Casting

## Status

Accepted

## Date

2026-08-06

---

# Context

The Companion displays participant-private information and creator-owned
scenario content. The product has accepted requirements to obscure app-switcher
snapshots, detect and discourage capture where reliable signals exist, and
prevent or obscure capture where the operating system permits it. It must not
claim universal prevention.

iOS/iPadOS and Android provide materially different controls. Android secure
windows can block ordinary screenshots, screen recording, and non-secure
display output. iOS reports a still screenshot only after capture, while it can
report active recording or mirroring state in time for the application to cover
content. A physical phone may also legitimately initiate a public Stage on an
AirPlay television. That public route must not be confused with mirroring the
phone's private Companion projection.

# Decision

## Protected Companion Content

During an active session, the installed Companion treats the following as
protected from unintended capture:

- character secrets and objectives
- private clues, evidence, inventory, notes, and communications
- individual votes and private actions
- account, participant, endpoint, and recovery information
- unpublished, licensed, or otherwise creator-controlled scenario content not
  deliberately authorized for the public Stage route

The entire active-session Companion window uses the platform's strongest
supported protection rather than attempting to maintain an error-prone list of
individual secure views. Public content may still be presented through a
separately authorized Stage endpoint or route.

## Android

The production Android Companion applies `FLAG_SECURE` to every active-session
window. The protection remains enabled while private or protected scenario
content can be reached through that window, including navigation transitions,
dialogs, and task-switcher representation. The app also uses a neutral task-
switcher privacy presentation and tests that overlays or secondary activities
do not expose an unprotected frame.

There is no production-session switch that disables the secure-window policy.
The Android 14 screenshot-detection callback may be used on a deliberately
non-secure, non-session surface when it provides useful notice, but it is not a
replacement for `FLAG_SECURE` and is not treated as complete detection.

If Android, an OEM compositor, a compromised device, or external hardware
bypasses the expected protection, Guilty Party does not claim that capture was
impossible.

## iOS and iPadOS Still Screenshots

iOS/iPadOS does not provide a supported general-purpose control that prevents a
still screenshot of arbitrary application UI. The application observes the
system screenshot notification, understanding that it arrives after the image
has already been captured.

After a reported screenshot while protected Companion content was visible, the
app shows a local, accessible notice such as:

> This screenshot may contain private game content. Please delete it and do not
> share it.

The product does not claim that the screenshot was blocked, inspected, altered,
or deleted. It does not attempt to access the user's photo library to find it.

## iOS and iPadOS Active Recording or Mirroring

The application observes the current scene-capture state for active recording,
mirroring, AirPlay screen mirroring, or another reported cloning route. While a
private Companion scene is actively captured, it:

- replaces protected content with a neutral privacy shield
- stops private audio playback on that endpoint
- stops Guilty Party microphone and media publication from that endpoint
- disables private participant actions
- explains that private game content remains hidden until capture stops

When capture ends, the app revalidates endpoint and session authority and
requests a fresh authorized projection before restoring protected content. It
does not reveal a cached private view during that transition.

If shielding removes a required private capability, the accepted safe-
degradation process applies: use another authorized personal endpoint, a
privacy-preserving alternative, or a generic technical pause. Timers pause
without exposing the participant or reason when necessary.

## Public Stage Casting from a Companion Device

A private Companion **projection** is never cast or mirrored. The same physical
phone or tablet may nevertheless initiate and control a separately authorized
public Stage endpoint or public Stage media route, including an AirPlay-enabled
television.

That design preserves separate concepts:

- the phone's private Companion endpoint continues to receive only its
  participant-authorized projection
- the television or targeted output is a public Stage endpoint or route and
  receives only the server-authorized public Stage projection
- casting control does not grant the television participant identity, private
  endpoint authority, or host authority
- Stage output contains no private clues, objectives, votes, notifications, or
  Companion UI

Targeted AirPlay output is preferred over mirroring the entire device display.
If a platform route can only mirror the screen, the application must either
provide a verifiably public-safe Stage presentation while keeping the private
projection off that route or decline casting. It never accepts private-screen
mirroring merely because the destination is a television in the same physical
room.

## User, Host, and Server Treatment

Before play, the app says that Guilty Party discourages capture and uses
available platform protections but cannot prevent every external or compromised
capture mechanism.

A screenshot signal or local capture-protection state:

- is not canonical scenario truth
- does not notify the host, Stage, or other participants by default
- is not uploaded for analytics, discipline, reputation, or account enforcement
- does not reveal which private content was visible
- may produce only the minimum generic readiness state needed to pause or offer
  a safe alternative

Any future security-event retention or enforcement requires an approved data
lifecycle, proportionality review, user notice, and a separate decision.

## Browser and External Limitations

The browser Companion cannot reliably prevent or detect operating-system
screenshots. It uses app-visibility protections where available, minimizes
stale private content, and presents the same honest pre-session notice without
claiming native-equivalent capture controls.

No supported platform can fully prevent:

- another physical camera
- external capture hardware
- every accessibility, mirroring, or browser pathway
- a compromised, rooted, jailbroken, debugged, or modified operating system

These limitations do not justify weakening controls that are available.
Accessibility APIs such as screen readers are not treated as capture merely
because they can access an authorized semantic representation. A workflow that
requires otherwise protected mirroring needs a separately reviewed private-
capability route rather than a hidden bypass.

## Internal Testing

An internal QA build may permit screenshots for testing only with synthetic or
explicitly authorized content. The bypass is build-time restricted, visibly
identified, unavailable in production distributions, and never enabled by a
remote flag or ordinary user setting.

Verification covers app-switcher snapshots, screenshots, screen recording,
mirroring, AirPlay Stage output, route transitions, secondary windows, capture
start and stop, fresh-projection restoration, media shutdown, and relevant
phone and tablet configurations.

# Consequences

Positive:

- Android blocks common capture paths using a supported secure-window control.
- iOS proactively shields ongoing recording and mirroring while describing its
  still-screenshot limitation honestly.
- A player can use an iPhone or iPad to initiate an AirPlay Stage without
  exposing the Companion projection.
- Capture signals do not become behavioral surveillance or host discipline.

Negative:

- iOS still screenshots can contain content before the app receives notice.
- Secure windows limit legitimate user capture and some display workflows.
- AirPlay Stage support requires a distinct public projection and output route,
  not simple device-screen mirroring.
- Capture protection needs lifecycle, media, accessibility, and multi-window
  testing on real devices.

# Alternatives Considered

## Allow Capture with Only a Warning

Rejected on Android and for active iOS recording because stronger supported
controls are available and the Companion holds private and creator-controlled
content.

## Claim That iOS Screenshots Are Prevented

Rejected. The supported screenshot notification is delivered after capture.

## Notify the Host of Every Screenshot Signal

Rejected. Platform coverage is uneven, the signal can reveal private behavior,
and ordinary capture protection should not become surveillance or punishment.

## Prohibit All AirPlay Initiated by a Phone

Rejected. A physical device can host or control multiple distinct endpoints.
A separately authorized public Stage route is compatible with privacy and the
device-and-room model.

## Mirror the Companion Screen as the Stage

Rejected because private UI and notifications could reach a shared display and
because UI hiding is not an authorization boundary.

# References

- [Android `FLAG_SECURE`](https://developer.android.com/reference/android/view/WindowManager.LayoutParams#FLAG_SECURE)
- [Android screenshot-detection API](https://developer.android.com/about/versions/14/features/screenshot-detection)
- [Apple screenshot notification](https://developer.apple.com/documentation/uikit/uiapplication/userdidtakescreenshotnotification)
- [Apple scene capture state](https://developer.apple.com/documentation/uikit/uiscenecapturestate)
- [Apple task-switcher privacy guidance](https://developer.apple.com/library/archive/qa/qa1838/_index.html)
