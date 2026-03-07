# Techno Playground - Product Specification

## Overview
Techno Playground is a professional-grade web-based step sequencer designed for live performance and rapid techno pattern creation. It features a 16-step grid, multiple drum tracks, a dedicated Moog-style bass synthesizer, a sub-bass engine, and a rhythmic chord progression generator.

## Core Features
1.  **16-Step Sequencer**: A grid-based interface for triggering drum samples and synth notes.
2.  **Multi-Track Architecture**:
    *   **8 Drum Tracks**: Sample-based tracks (Kick, Snare, Hi-Hats, Ride, etc.) with per-row clear buttons.
    *   **Moog Bass**: Synthesized bass with ADSR envelope, resonant filter, and scale-degree logic.
    *   **Sub Bass**: Dedicated low-end track playing 2 octaves below root with LPF control.
3.  **Advanced Moog Bass Logic**:
    *   **Scale Degrees**: Grid numbers represent steps within the selected scale (Major/Minor) rather than fixed octaves.
    *   **Octave Shift**: Global octave control (-2 to +2) for the bass sequence.
4.  **Chord Progression Engine**:
    *   **Melodic Techno Palette**: Uses minor, minor 7th, 9th, and suspended chords.
    *   **2-Bar Phrases**: Generates 8-beat progressions with variable rhythmic density (1, 2, or 4 stabs per bar).
    *   **Stab Sound**: "Pluggy" deep house stabs using dual oscillators and resonant pluck filters.
5.  **Song Structure Management**:
    *   **S1-S4 Slots**: Save and recall full patterns (Drums, Moog, Sub, Octave, Chords) to build song structures (Intro, Drop, etc.).
    *   **C1-C4 Slots**: Independent saving for chord progressions.
6.  **Genre Templates**:
    *   Presets for Minimal, Melodic, Ambient, and Dub Techno with tailored BPM and patterns.
7.  **Real-time Audio Engine**: Built using the Web Audio API for low-latency playback and per-track delay effects.

## Technical Stack
- **Frontend**: React 19, TypeScript.
- **Styling**: Tailwind CSS (v4) with a hardware-inspired dark theme.
- **Audio**: Web Audio API (Custom `AudioEngine` class).
- **Icons**: Lucide React.

## How to Recreate This App

### Step 1: Audio Engine & Synthesis
- Implement an `AudioEngine` class to handle sample loading and playback.
- Create a `playMoog` method using `OscillatorNode` (Sawtooth) and `BiquadFilterNode` with an ADSR envelope.
- Create a `playChord` method using dual oscillators (Sawtooth + Triangle) with slight detuning and a resonant LPF pluck.
- Implement a `playSub` method for pure sine-wave low end.

### Step 2: Sequencer Logic
- Use a high-precision clock (Web Audio `currentTime`) for scheduling.
- Maintain state for a 16-step grid across 8 drum tracks and a specialized `MoogStep` array for the bass.
- Implement scale logic: Map grid values (0-7) to frequencies based on the selected Key and Scale (Major/Minor).

### Step 3: Pattern & Chord Storage
- Create a `SavedPattern` interface to store the entire state of the machine.
- Implement `localStorage` or in-memory slots (S1-S4, C1-C4) with right-click to overwrite functionality.

### Step 4: UI Design
- **Drums**: Emerald accents, 16-step toggles.
- **Moog Bass**: Purple accents, ADSR sliders, scale-degree grid.
- **Sub Bass**: Cyan accents, LPF knob.
- **Chords**: Blue accents, progression generator button.

## Design Philosophy
The UI should feel like a piece of hardware. Use high-contrast colors and visible grid structures. Performance is key: ensure all controls are accessible and provide immediate visual feedback.
