# Modo Rotineiro: Carpe Diem with files and voice + Multiprofessional round recording

## 1. Carpe Diem field ("o que mudou hoje?")

In the patient's evolution panel and in "Evolução avulsa":

- Microphone button next to the field: the same dictation as the assistants (live captions, then a review of the full audio that replaces the draft text). The text goes into the field, and you can edit it before updating.
- Paperclip button: attach photos (lab results, monitor, prescription chart) and PDFs. The text read from each file goes into the field under a short label with the file name, so you can see what was read and correct it before updating.
- Carpe Diem is told to use what came from files and dictation only as the doctor's report: no completing values, no inventing results.

## 2. "Gravar round" button for each sector

Where: next to the name of each unit (e.g. "UTI 1") on the bed map. It works on phones and computers; the desktop layout only gains this button.

Before recording:
- A short notice with a box to tick: "Avisei a equipe que o round será gravado" (required to start).

During recording (up to 90 minutes):
- Timer, sound-level indicator, pause/resume and finish buttons. A countdown appears in the last 10 minutes.
- The recording is saved in parts of about 10 minutes. Each part is transcribed while the round continues, so nothing is lost if the connection drops, and the result comes out quickly at the end.
- Tip on screen: say the bed or the patient's name when you move on to the next one.

At the end:
- Full transcript of the round (text) and the audio kept for listening later.
- Structure for each patient on the unit, only with what was discussed, in these topics:
  - Clinical interventions
  - Device review (catheters, tubes, drains, probes, with day counts when mentioned)
  - Culture check (collected, pending, results)
  - Antibiotics and day count (D and planned stop date when mentioned)
  - Nursing and physiotherapy (ventilation, mobilization, diet, wounds, pressure ulcer prevention)
  - Discharge and transfer (forecast, step-down)
  - Family and goals of care (bulletin, conversations, palliative care)
  - Pending items and plans
- Topics not discussed don't appear. Nothing is completed or invented.
- Discussions where the patient couldn't be identified go into a "Não identificado" block, where you choose the right bed.
- Each patient's block can be edited before saving.

Where it's saved (both, as you chose):
- Round record on each patient: inside the patient's evolution panel, a "Round multiprofissional" block with the date and topics, plus a history of earlier rounds.
- Shortcut "Usar na evolução de hoje": sends the topics into the Carpe Diem field, and you review before updating.
- On the bed map, a small "Round" mark on beds discussed today.
- On the unit: "Rounds anteriores", with date, duration, full transcript and audio player.

## 3. What does not change

- The existing evolution, discharge and bed-move flow stays the same.
- Nothing is published without your request.

## Technical details

- New tables (owner-only RLS, grants in the same migration):
  - `ward_round_sessions`: user_id, unit_id, started_at, ended_at, duration_seconds, status (recording/transcribing/structuring/ready/error), transcript, audio_paths text[], consent_confirmed_at.
  - `ward_round_items`: session_id, admission_id (nullable for "Não identificado"), round_date, topics jsonb, content text, applied_to_round_at.
- New private bucket `round-audio`, path `{user_id}/{session_id}/part-N.webm`; storage policies scoped to the owner's folder.
- Recording: MediaRecorder restarted every ~10 min (each part well under the 24 MiB transcription limit); each part is uploaded and sent to a new `round-transcribe` function (reads from storage, Lovable AI transcription first, ElevenLabs fallback only on transient failures, reusing `_shared/transcription.ts`).
- Structuring: new `round-structure` function on the strong model, input = the unit's patient list (bed, name, diagnosis, day of stay) + transcript; output validated as JSON per patient with the fixed topic keys; unknown beds go to unassigned.
- Pure rules in `src/lib/wardRound.ts` mirrored in `supabase/functions/round-structure/topics.ts` (topic list, 90-min limit, part length, output validation); a vitest keeps both equal and covers the rules.
- Carpe Diem field reuses `AgentVoiceInput` and `extract-file-text`; `carpe-diem-round` prompt gains the file/dictation fidelity rule.
- Copilot catalog updated with the new button; AGENTS.md gets one rule for the round recording module.
