# Techno Playground Recreation Prompt

Use this prompt to recreate the "Techno Playground" application from scratch.

---

## App Description
Build a professional-grade web-based step sequencer called "Techno Playground" designed for live techno performance. The app features an 8-track drum sequencer, a synthesized Moog-style bass, and a sub-bass engine. It uses the Web Audio API for low-latency synthesis and playback.

## Technical Requirements
- **Framework**: React 19 with TypeScript.
- **Styling**: Tailwind CSS (v4) with a hardware-inspired dark theme.
- **Audio**: Web Audio API (implemented via a custom `AudioEngine` class).
- **Icons**: Lucide React.
- **Animations**: `motion` (from `motion/react`).

## Core Features to Implement

### 1. Audio Engine (`audio.ts`)
Create a class to manage the `AudioContext` and all synthesis/playback logic:
- **Sample Loading**: Load `.wav` files into `AudioBuffer` objects.
- **Moog Bass Synthesis**: Dual sawtooth oscillators, detuned, through a resonant low-pass filter with an ADSR envelope.
- **Sub Bass Synthesis**: Pure sine wave with a resonant low-pass filter. Implement a modulation envelope for both amplitude and filter cutoff (decay, sustain, envAmount).
- **Drum Synthesis (Fallbacks)**: Simple synthesized Kick (pitch sweep), Hi-Hat (noise + high-pass), and Snare (noise + band-pass) for cases where samples aren't loaded.
- **Global FX**: Consolidated Delay and Reverb effects. 
    - **Delay**: Feedback delay with levels 0-4 (0=off, 1-4=increasing feedback/wetness).
    - **Reverb**: Convolution-based reverb with levels 0-4.
    - Both effects are applicable per-track via a single `FXSettings` object.

### 2. Sequencer Logic
- **Timing**: Use a high-precision clock based on `audioContext.currentTime`. Implement a scheduler that looks ahead ~100ms.
- **Grid**: 16-step grid for 8 drum tracks. Each step can have a "repeat" value (1, 2, 4, 8) for rhythmic variations.
- **Moog Bass Grid**: A specialized row where users select "Scale Degrees" (0-7) instead of fixed notes.
- **Sub Bass Grid**: A toggle row for low-end reinforcement. 
    - **Special Logic**: If a user activates step 2 (index 1), automatically fill all steps except 1, 5, 9, 13 to create a driving techno sub-pattern.
    - **Randomize**: A dedicated button to generate simple 1 or 2 note sub-bass patterns.
- **Scale Logic**: Implement Major and Minor scale intervals. Map scale degrees to frequencies based on a selected Root Key (C, C#, etc.).

### 3. Song Structure & Patterns
- **Pattern Slots**: Provide 4 slots (S1-S4) to save the entire state of the machine (Drums, Moog, Sub, Octave).
- **Interaction**: Click to load, right-click to overwrite/save.
- **Bar Reset**: Allow the sequencer to reset its pattern every 1, 2, 4, or 8 bars to create longer phrases.

### 4. UI Components
- **Header**: App title, "Turn Camera On/Off" toggle (for a placeholder webcam feature), and an "Info" button for specs.
- **Global Controls**: BPM slider (60-200), Key/Scale selectors (default to A minor), Master Mute/Solo clear (Spacebar shortcut).
- **Track Rows**:
    - **Drums**: Emerald theme. Volume slider, M/S toggles, consolidated FX dropdowns (0-4), and a "Clear Row" button.
    - **Moog Bass**: Purple theme. ADSR sliders, Octave shift (-2 to +2), and a "Randomize" button.
    - **Sub Bass**: Cyan theme. Controls for LPF cutoff, resonance, decay, and filter envelope amount. Includes a "Rand" button for pattern generation.
- **Visual Feedback**: Highlight the current step in the grid. Use high-contrast colors for active steps.

### 6. Sample Handling
- Use `import.meta.glob` to dynamically detect `.wav` files in the `/samples` directory.
- Map default filenames (`Kick_1.wav`, `Snare.wav`, etc.) to the 8 drum tracks.
- Provide a dropdown on each track to change its assigned sample.

## Design Guidelines
- **Theme**: Dark industrial (`bg-zinc-950`).
- **Typography**: Sans-serif for UI, Monospace for data/BPM.
- **Hardware Feel**: Use visible borders (`border-zinc-800`), rounded corners (`rounded-xl`), and subtle glows for active states.
- **Responsiveness**: Ensure the grid is usable on desktop and tablet.

## Implementation Notes
- Ensure the `AudioContext` is resumed on user interaction (e.g., clicking Play).
- Use `useRef` for values needed inside the high-frequency scheduler to avoid stale closures.
### 7. Optional: Computer Vision Placeholder
- Implement a "Turn Camera On" feature that displays a webcam feed.
- Include a mock `WebcamCapture` component that simulates grid updates based on visual input (e.g., "detecting stones" on a physical grid).
