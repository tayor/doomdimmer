# DoomDimmer Detection Heuristic

DoomDimmer uses a local heuristic rather than machine learning.

The detector scores:

- Continuous passive scrolling duration.
- Time since click, typing, input, pointer, or navigation engagement.
- Scroll event density in a rolling window.
- Scroll direction consistency.
- Tab visibility and focus.
- Whether the user is typing in editable controls.

The detector stores only bounded aggregate metrics in memory. It does not read page text and does not export raw event streams.

## Stage Model

- `normal`: no visual intervention.
- `watching`: local score is rising but no effect is applied.
- `grayscale`: page begins fading toward grayscale.
- `blur`: page begins progressively blurring.
- `reflection`: user must complete the restore prompt or use accessibility restore mode.
- `cooldown`: detection is temporarily suppressed after restore.
- `paused` / `disabled`: detection is inactive.

Slow article reading is protected by requiring both enough continuous duration and enough scroll density before stage promotion.

Users can tune continuous duration, no-engagement window, grayscale start, blur start, reflection-required timing, cooldown, and scroll density from settings.

## Protected Contexts

DoomDimmer pauses or resets detection for:

- Hidden tabs.
- Recent page load.
- Editable fields.
- Form interaction.
- Payment, checkout, login, signup, and account-like URLs.
- Meaningful click, pointer, keyboard, or input engagement.
