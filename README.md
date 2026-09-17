# TH08 portable

This repository contains the source-only TH08 3.4.0 C++/SDL3 portable and Web implementation.

## Layout

- `th08_web/`: TH08 game, SDL runtime, documentation, and source tests.
- `th10_web/launcher/`: the shared Eagler Touhou launcher and browser package subsystem used by TH08.
- `portable/`: shared GLES renderer, numeric compatibility code, input code, build orchestration, and validation tools.
- `tools/`: the pinned Emscripten installer and its metadata.

## Build

Install the pinned toolchain, then build the browser runtime:

```powershell
python tools/download-emscripten.py
node portable/build.mjs --th08
```

Build outputs are written below `th08_web/artifacts/` and are intentionally not tracked.

## thprac

The TH08 Runtime contains a source-level port of thprac's practice parameters and
section patches. Enable thprac in the Eagler Touhou Launcher, enter the game's
Practice menu, then choose a stage section, boss phase, resources, gauge, time,
night value, familiar count, and rank. Practice Replays embed a validated
`THPRAC08` trailer; playback restores the same parameters. Backspace opens the
in-game assist panel and F1-F7 operate its controls. A run that uses an assist is
not eligible for Replay saving.

Generated section tables and bytecode patch adapters are checked against the
local `thprac` repository with:

```powershell
node portable/generate-thprac.mjs --check
node portable/check-th08-practice.mjs
```

## Assets and licensing

This repository does not include original Touhou executable, data, music, replay, or save files. A runnable package must be assembled locally from files you are legally allowed to use.

Licensing is component-specific. Keep the notices and licenses beside each bundled component; no blanket license is asserted for the original game or its assets.
