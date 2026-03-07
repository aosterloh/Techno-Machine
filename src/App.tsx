/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import { WebcamCapture } from './components/WebcamCapture';
import { Sequencer } from './components/Sequencer';
import { Music, Camera, CameraOff, Info, X } from 'lucide-react';
import Markdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';

const SPECIFICATION_TEXT = `# Techno Playground - Product Specification

## Overview
Techno Playground is a web-based step sequencer designed for live performance and rapid techno pattern creation. It features a 16-step grid, multiple drum/synth tracks, a dedicated Moog-style bass synthesizer, and per-track delay effects.

## Core Features
1.  **16-Step Sequencer**: A grid-based interface for triggering drum samples and synth notes.
2.  **Multi-Track Architecture**:
    *   8 Sample-based tracks (Kick, Snare, Hi-Hats, Ride, Vocals, etc.).
    *   1 Synthesized Moog Bass track with ADSR envelope controls.
3.  **Real-time Audio Engine**: Built using the Web Audio API for low-latency playback.
4.  **Per-Track Controls**:
    *   **Volume**: Individual gain control for each track.
    *   **Mute/Solo**: Quick toggles for performance dynamics.
    *   **Delay**: High-feedback delay effect with 5 intensity levels.
5.  **Global Controls**:
    *   **BPM**: Tempo control (60-200 BPM).
    *   **Swing**: Humanization for the rhythm.
    *   **Master Volume**: Overall output control.
6.  **Performance Shortcuts**:
    *   **Spacebar**: Instantly clears all active Mutes and Solos.

## Technical Stack
- **Frontend**: React 19, TypeScript.
- **Styling**: Tailwind CSS (v4).
- **Audio**: Web Audio API (Custom \`AudioEngine\` class).
- **Icons**: Lucide React.
- **Animations**: Motion (framer-motion).

## How to Recreate This App from Scratch

### Step 1: Set up the Audio Engine
Create a class that manages an \`AudioContext\`. Implement methods to:
- Load audio buffers from URLs.
- Play buffers at specific times (using \`ctx.currentTime\`).
- Create a synthesized bass using \`OscillatorNode\` and \`BiquadFilterNode\`.
- Implement a feedback delay loop using \`DelayNode\` and \`GainNode\`.

### Step 2: Build the Sequencer Logic
- Use a \`requestAnimationFrame\` or \`setInterval\` based clock to track the "current step".
- Maintain a state (2D array) for the grid (tracks x steps).
- At each step, trigger the corresponding audio events in the \`AudioEngine\`.

### Step 3: Design the UI
- Use a dark, industrial theme with Tailwind CSS.
- Create a \`Sequencer\` component that maps through tracks and steps.
- Implement the "Moog Bass" row with custom ADSR sliders.
- Add performance toggles (M/S) and the Delay dropdown.

### Step 4: Performance Optimizations
- Preload samples on mount.
- Use \`useEffect\` for the timing loop to ensure it stays in sync with the Web Audio clock.
- Add keyboard listeners for common actions.

## Design Philosophy
The UI should feel like a piece of hardware. Use high-contrast colors (Emerald for drums, Purple for bass, Blue for delay) and visible grid structures to help the user stay oriented during a fast-paced performance.`;

export default function App() {
  // 8 rows, 64 cols for 4 pages. 0 means off, 1/2/4/8 means repeat interval
  const [grid, setGrid] = useState<number[][]>(
    Array(8).fill(null).map(() => Array(64).fill(0))
  );
  const [currentPage, setCurrentPage] = useState(0);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [genreInfo, setGenreInfo] = useState<{title: string, content: string} | null>(null);

  const GENRE_DETAILS: Record<string, string> = {
    "Minimal Techno": "### Minimal Techno\n\n**BPM:** 125-130\n\n**Drums:** Sparse, focus on the kick and subtle hi-hats.\n\n**Percussion:** Occasional clicks and pops.\n\n**Harmony/Melody:** Repetitive, minimal changes, often just one or two notes.",
    "Melodic Techno": "### Melodic Techno\n\n**BPM:** 120-125\n\n**Drums:** Driving kick, crisp claps, and energetic rides.\n\n**Percussion:** Polyrhythmic elements.\n\n**Harmony/Melody:** Emotional, arpeggiated synths, minor scales.",
    "Ambient Techno": "### Ambient Techno\n\n**BPM:** 100-115\n\n**Drums:** Soft, muffled kicks, lots of reverb.\n\n**Percussion:** Textural, organic sounds.\n\n**Harmony/Melody:** Lush pads, evolving soundscapes, deep chords.",
    "Dub Techno": "### Dub Techno\n\n**BPM:** 115-120\n\n**Drums:** Deep, heavy kick, delayed snares.\n\n**Percussion:** Shakers and metallic hits.\n\n**Harmony/Melody:** Chord stabs with long delay tails, deep sub bass."
  };

  const handleTemplateSelect = (genre: string) => {
    if (GENRE_DETAILS[genre]) {
      setGenreInfo({ title: genre, content: GENRE_DETAILS[genre] });
    }
  };

  const handleGridUpdate = useCallback((newGrid: boolean[][]) => {
    setGrid(prev => {
      const start = currentPage * 16;
      return prev.map((row, r) => row.map((val, c) => {
        // Only update columns on the current page
        if (c >= start && c < start + 16) {
          const colOnPage = c - start;
          const isStone = newGrid[r][colOnPage];
          if (isStone && val === 0) return 1; // new stone defaults to 1
          if (!isStone) return 0; // stone removed
          return val; // stone still there, keep existing repeat value
        }
        
        // Mirror Page 1 to other pages if we are on Page 1
        if (currentPage === 0 && c >= 16) {
          const colOnPage = c % 16;
          const isStone = newGrid[r][colOnPage];
          if (isStone && prev[r][colOnPage] === 0) return 1;
          if (!isStone) return 0;
          return prev[r][colOnPage];
        }

        return val; // other pages stay as they are
      }));
    });
  }, [currentPage]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <header className="flex items-center justify-between border-b border-zinc-800 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
              <Music size={24} />
            </div>
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Techno Playground</h1>
                <p className="text-zinc-400 text-sm">Professional Techno Sequencer & Performance Tool</p>
              </div>
              <button
                onClick={() => setIsInfoOpen(true)}
                className="p-2 text-zinc-500 hover:text-emerald-400 transition-colors rounded-full hover:bg-emerald-500/10"
                title="Product Specification"
              >
                <Info size={20} />
              </button>
            </div>
          </div>
          
          <button
            onClick={() => setIsCameraOn(!isCameraOn)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              isCameraOn 
                ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' 
                : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
            }`}
          >
            {isCameraOn ? (
              <>
                <CameraOff size={18} />
                <span>Turn Camera Off</span>
              </>
            ) : (
              <>
                <Camera size={18} />
                <span>Turn Camera On</span>
              </>
            )}
          </button>
        </header>

        <div className="flex flex-col gap-8 items-center">
          <div className="w-full">
            <Sequencer 
              grid={grid} 
              setGrid={setGrid} 
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              onTemplateSelect={handleTemplateSelect} 
            />
          </div>
          
          {isCameraOn && (
            <div className="w-full max-w-2xl space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
              <WebcamCapture onGridUpdate={handleGridUpdate} />
            </div>
          )}
        </div>

        <AnimatePresence>
          {genreInfo && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
              >
                <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                  <h2 className="text-xl font-bold text-cyan-400">Genre Guide</h2>
                  <button
                    onClick={() => setGenreInfo(null)}
                    className="p-2 text-zinc-500 hover:text-white transition-colors rounded-lg hover:bg-zinc-800"
                  >
                    <X size={24} />
                  </button>
                </div>
                <div className="p-8 prose prose-invert prose-cyan max-w-none">
                  <div className="markdown-body">
                    <Markdown>{genreInfo.content}</Markdown>
                  </div>
                </div>
                <div className="p-6 border-t border-zinc-800 bg-zinc-900/50 flex justify-end">
                  <button
                    onClick={() => setGenreInfo(null)}
                    className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-lg transition-colors"
                  >
                    Start Producing
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {isInfoOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl"
              >
                <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                  <h2 className="text-xl font-bold text-emerald-400 flex items-center gap-2">
                    <Info size={24} />
                    Product Specification
                  </h2>
                  <button
                    onClick={() => setIsInfoOpen(false)}
                    className="p-2 text-zinc-500 hover:text-white transition-colors rounded-lg hover:bg-zinc-800"
                  >
                    <X size={24} />
                  </button>
                </div>
                <div className="p-8 overflow-y-auto prose prose-invert prose-emerald max-w-none">
                  <div className="markdown-body">
                    <Markdown>{SPECIFICATION_TEXT}</Markdown>
                  </div>
                </div>
                <div className="p-6 border-t border-zinc-800 bg-zinc-900/50 flex justify-end">
                  <button
                    onClick={() => setIsInfoOpen(false)}
                    className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg transition-colors"
                  >
                    Got it
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
