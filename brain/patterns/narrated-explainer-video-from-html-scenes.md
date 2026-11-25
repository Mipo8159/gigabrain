---
name: narrated-explainer-video-from-html-scenes
description: "Narrated explainer videos built locally from HTML/SVG scenes: measured TTS durations drive the timeline, headless frames go to ffmpeg, so voice and motion can't drift. The scenes file is the source and the mp4 can always be rebuilt. For onboarding to a complex system: parts of 5–6 min, one idea per scene, recap + quiz."
metadata:
  type: feedback
---

**In short:** for an onboarding video, write scenes as HTML+SVG with narration lines.
Synthesise each line with a local TTS. Use the **measured** audio lengths to set every
animation cue. Screenshot each frame headless, encode with ffmpeg and add chapters
and captions. Nothing leaves the machine.

**Recipe (proved 2026-11-13: 6 videos, ~40 min, rendered about 5× faster than real time):**
- Install a local voice (`piper-tts` in a venv plus one `.onnx` voice) and ffmpeg.
  There are no cloud TTS calls, so work content stays local ([[nothing-leaks]]).
- Scenes: `<section data-title>` with an SVG and `<p data-say data-pause>` lines.
  Cues are relative to a line ("id+1.2", "id$"), never absolute seconds, so a
  re-voice moves the motion with it.
- Build: speak each line (cached by voice+speed+text), concatenate the audio and
  write the timeline, chapters and an `.srt`.
  Render: a deterministic `__seek(t)` page, screenshotted at 15 fps by parallel
  workers into libx264, then muxed with AAC and chapter metadata.
- QA: contact sheets of each scene's last frame, plus mid-scene stills. That caught
  overflowing labels, a travel dot ending on the wrong box, and SVG collapsing code
  indentation (fix: `white-space:pre`). A claims file maps each spoken fact to its source.
- Keep the `.scenes.html` (~20 KB) and a one-line `rebuild.sh`. The mp4 is
  disposable: it rebuilds in about 1 min per 5-min part.

**Pacing that worked for a learner new to the system:** a dense 9-min single cut was
"better, but the system is so complex". The slow cut was 5 parts × 4–10 min with
narration ~15% slower and longer pauses. Each scene teaches one idea, a route bar
shows where we are, and each part ends with a recap. The last part has a quiz with
a pause before each answer. If keeping every detail at that pace needs more parts
than agreed, add the part and say so; don't cram.

**Real artifacts on screen are copied, not recalled (2026-11-25).** A scene showing the
shape of a real record (a ticket's form fields) got one invented field from memory; a
re-fetch of the source caught it before render. Fetch the record, copy its fields,
and cite the fetch in the claims file. Under plain-language limits (≤14 words a line)
narration runs short: three 8-min floors needed 5 extra scenes. Fill with a worked
example, a record's anatomy or a hand-off scene, never longer pauses. Keep top-bar
chip labels to one word each: two-word labels overflowed the bar in 2 of 3 videos.
After any chip change, look at one frame per video.

**Why:** a narrated, animated walk-through was the format the visual learner asked
for after lesson pages ([[visual-learner-diagram-first]]). Driving cues from measured
TTS durations removes the sync bugs that hand-timed video has.

Pacing evidence (2026-11-19): ~1,000 words of narration ran 7.5 min; trimming to ~830 words and shortening gaps (0.7 s line, 1.6 s scene) gave 6.0 min. Budget ~140 spoken words per finished minute and cut words before pauses.

**Signal:** "make a video", "explain it with motion and voice", or onboarding to a
system with many glued parts.

**Next time:** reuse the engine. Gate on the length and split, which hops to cover,
and the voice. Hand the mp4s over as plain-named files in a folder Giga browses
(see [[visual-learner-diagram-first]]).
