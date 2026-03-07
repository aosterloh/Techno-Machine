/// <reference types="vite/client" />
import React, { useEffect, useState, useRef } from 'react';
import { AudioEngine, SubBassSettings, SynthSettings } from '../audio';
import { Play, Square, Volume2, Wand2, Save, Upload } from 'lucide-react';

const TRACKS = ['Ride', 'HH3', 'HH2', 'HH1', 'Clap', 'Snare', 'Kick 2', 'Kick 1'];

const TECHNO_HINTS = [
  "Techno Hint: Place Kicks on 1, 5, 9, and 13 for a solid 4/4 beat.",
  "Techno Hint: Claps or Snares usually go on 5 and 13.",
  "Techno Hint: Put an open Hi-Hat (HH) on the off-beats: 3, 7, 11, 15.",
  "Techno Hint: Use Ride cymbals on 1, 5, 9, 13 or 3, 7, 11, 15 for energy.",
  "Techno Hint: Add 16th note closed Hi-Hats for driving rhythm.",
  "Techno Hint: Keep the low-end clean—don't overlap bass and kick too much."
];

const sampleModules = import.meta.glob('/samples/*.wav', { query: '?url', import: 'default', eager: true });
const AVAILABLE_SAMPLES = Object.keys(sampleModules).map(path => {
  const fileName = path.split('/').pop()!;
  const displayName = fileName.replace(/\.wav$/i, '').replace(/[_\d]/g, '').trim();
  return { fileName, displayName, url: sampleModules[path] as string };
});

const DEFAULT_TRACKS = ['Ride.wav', 'HH3.wav', 'HH2.wav', 'HH1.wav', 'Clap.wav', 'Snare.wav', 'Kick_2.wav', 'Kick_1.wav'];

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const BASE_FREQS = [65.41, 69.30, 73.42, 77.78, 82.41, 87.31, 92.50, 98.00, 103.83, 110.00, 116.54, 123.47];
const MAJOR_INTERVALS = [0, 2, 4, 5, 7, 9, 11, 12];
const MINOR_INTERVALS = [0, 2, 3, 5, 7, 8, 10, 12];

type TechnoPattern = {
  name: string;
  grid: number[][]; // 8x16
};

const TECHNO_PATTERNS: TechnoPattern[] = [
  {
    name: "Minimal Techno",
    grid: [
      Array(4).fill([0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]).flat(), // Ride
      Array(4).fill([0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]).flat(), // HH3
      Array(4).fill([0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0]).flat(), // HH2
      Array(4).fill([1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0]).flat(), // HH1
      Array(4).fill([0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]).flat(), // Clap
      Array(4).fill([0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0]).flat(), // Snare
      Array(4).fill([0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]).flat(), // Kick 2
      Array(4).fill([1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0]).flat(), // Kick 1
    ]
  },
  {
    name: "Melodic Techno",
    grid: [
      Array(4).fill([1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0]).flat(), // Ride
      Array(4).fill([0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0]).flat(), // HH3
      Array(4).fill([1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1]).flat(), // HH2
      Array(4).fill([0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]).flat(), // HH1
      Array(4).fill([0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0]).flat(), // Clap
      Array(4).fill([0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]).flat(), // Snare
      Array(4).fill([0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]).flat(), // Kick 2
      Array(4).fill([1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0]).flat(), // Kick 1
    ]
  },
  {
    name: "Ambient Techno",
    grid: [
      Array(4).fill([0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]).flat(), // Ride
      Array(4).fill([0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]).flat(), // HH3
      Array(4).fill([0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0]).flat(), // HH2
      Array(4).fill([0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]).flat(), // HH1
      Array(4).fill([0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]).flat(), // Clap
      Array(4).fill([0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]).flat(), // Snare
      Array(4).fill([0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]).flat(), // Kick 2
      Array(4).fill([1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0]).flat(), // Kick 1
    ]
  },
  {
    name: "Dub Techno",
    grid: [
      Array(4).fill([0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]).flat(), // Ride
      Array(4).fill([0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0]).flat(), // HH3
      Array(4).fill([0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]).flat(), // HH2
      Array(4).fill([0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]).flat(), // HH1
      Array(4).fill([0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0]).flat(), // Clap
      Array(4).fill([0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]).flat(), // Snare
      Array(4).fill([0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]).flat(), // Kick 2
      Array(4).fill([1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0]).flat(), // Kick 1
    ]
  },
  {
    name: "Detroit Warehouse",
    grid: [
      Array(4).fill([0,0,0,0, 2,0,0,0, 0,0,0,0, 2,0,0,0]).flat(), // Ride
      Array(4).fill([0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]).flat(), // HH3
      Array(4).fill([0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]).flat(), // HH2
      Array(4).fill([0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0]).flat(), // HH1
      Array(4).fill([0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0]).flat(), // Clap
      Array(4).fill([0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]).flat(), // Snare
      Array(4).fill([0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]).flat(), // Kick 2
      Array(4).fill([1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0]).flat(), // Kick 1
    ]
  },
  {
    name: "Berlin Berghain",
    grid: [
      Array(4).fill([0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]).flat(), // Ride
      Array(4).fill([0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,4,4]).flat(), // HH3
      Array(4).fill([1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1]).flat(), // HH2
      Array(4).fill([0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]).flat(), // HH1
      Array(4).fill([0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]).flat(), // Clap
      Array(4).fill([0,0,0,0, 2,0,0,0, 0,0,0,0, 2,0,0,0]).flat(), // Snare
      Array(4).fill([1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0]).flat(), // Kick 2
      Array(4).fill([0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]).flat(), // Kick 1
    ]
  },
  {
    name: "Acid Minimal",
    grid: [
      Array(4).fill([8,0,0,0, 0,0,0,0, 8,0,0,0, 0,0,0,0]).flat(), // Ride
      Array(4).fill([0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]).flat(), // HH3
      Array(4).fill([0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]).flat(), // HH2
      Array(4).fill([0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0]).flat(), // HH1
      Array(4).fill([0,0,0,0, 0,0,0,0, 0,0,0,0, 1,0,0,0]).flat(), // Clap
      Array(4).fill([0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]).flat(), // Snare
      Array(4).fill([0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]).flat(), // Kick 2
      Array(4).fill([1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0]).flat(), // Kick 1
    ]
  },
  {
    name: "Dub Techno Echoes",
    grid: [
      Array(4).fill([0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]).flat(), // Ride
      Array(4).fill([0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0]).flat(), // HH3
      Array(4).fill([0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]).flat(), // HH2
      Array(4).fill([0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]).flat(), // HH1
      Array(4).fill([0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]).flat(), // Clap
      Array(4).fill([0,0,0,0, 4,0,0,0, 0,0,0,0, 0,0,0,0]).flat(), // Snare
      Array(4).fill([1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0]).flat(), // Kick 2
      Array(4).fill([0,0,0,0, 2,0,0,0, 0,0,0,0, 2,0,0,0]).flat(), // Kick 1
    ]
  },
  {
    name: "Industrial Stomp",
    grid: [
      Array(4).fill([0,0,2,0, 0,0,2,0, 0,0,2,0, 0,0,2,0]).flat(), // Ride
      Array(4).fill([0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]).flat(), // HH3
      Array(4).fill([1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0]).flat(), // HH2
      Array(4).fill([0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]).flat(), // HH1
      Array(4).fill([0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0]).flat(), // Clap
      Array(4).fill([0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]).flat(), // Snare
      Array(4).fill([0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]).flat(), // Kick 2
      Array(4).fill([1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0]).flat(), // Kick 1
    ]
  }
];

const MELODIC_TECHNO_CHORDS = [
  [0, 2, 4], // i
  [0, 2, 4, 6], // i7
  [3, 5, 7], // iv
  [4, 6, 8], // v
  [5, 7, 9], // VI
  [6, 8, 10], // VII
  [0, 2, 4, 7], // i9
  [0, 3, 4], // sus4
];

interface Props {
  grid: number[][]; // 8 rows x 64 cols
  setGrid: React.Dispatch<React.SetStateAction<number[][]>>;
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  onTemplateSelect?: (genre: string) => void;
}

type MoogStep = { scaleDegree: number } | null;
type TrackMode = 'n' | 'm' | 's';

interface SavedPattern {
  grid: number[][];
  velocityGrid: number[][];
  moogSequence: MoogStep[];
  synth1Sequence: MoogStep[];
  synth2Sequence: MoogStep[];
  subBassSequence: number[];
  moogSettings: SynthSettings;
  synth1Settings: SynthSettings;
  synth2Settings: SynthSettings;
  subBassSettings: SubBassSettings;
}

export function Sequencer({ grid, setGrid, currentPage, setCurrentPage, onTemplateSelect }: Props) {
  const [velocityGrid, setVelocityGrid] = useState<number[][]>(Array(8).fill(null).map(() => Array(64).fill(1)));
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [currentStep, setCurrentStep] = useState(0);
  const [volumes, setVolumes] = useState<number[]>(Array(8).fill(0.8));
  const [tracks, setTracks] = useState<string[]>(DEFAULT_TRACKS);
  const [trackModes, setTrackModes] = useState<TrackMode[]>(Array(12).fill('n'));
  const [activeTrackModes, setActiveTrackModes] = useState<TrackMode[]>(Array(12).fill('n'));
  const [fxSettings, setFxSettings] = useState<{delay: number, reverb: number}[]>(Array(12).fill({delay: 0, reverb: 0}));
  
  const [moogSequence, setMoogSequence] = useState<MoogStep[]>(Array(64).fill(null));
  const [moogVolume, setMoogVolume] = useState(0.8);
  const [moogSettings, setMoogSettings] = useState<SynthSettings>({
    decay: 0.2,
    cutoff: 800,
    resonance: 2,
    filterType: 'lowpass',
    waveform: 'sawtooth',
    envAmount: 0.5
  });

  const [synth1Sequence, setSynth1Sequence] = useState<MoogStep[]>(Array(64).fill(null));
  const [synth1Volume, setSynth1Volume] = useState(0.6);
  const [synth1Settings, setSynth1Settings] = useState<SynthSettings>({
    decay: 0.15,
    cutoff: 2000,
    resonance: 1,
    filterType: 'lowpass',
    waveform: 'square',
    envAmount: 0.3
  });

  const [synth2Sequence, setSynth2Sequence] = useState<MoogStep[]>(Array(64).fill(null));
  const [synth2Volume, setSynth2Volume] = useState(0.6);
  const [synth2Settings, setSynth2Settings] = useState<SynthSettings>({
    decay: 0.3,
    cutoff: 1500,
    resonance: 1,
    filterType: 'none',
    waveform: 'sawtooth',
    envAmount: 0.2
  });

  const [savedPatterns, setSavedPatterns] = useState<(SavedPattern | null)[]>(Array(4).fill(null));

  const [subBassSequence, setSubBassSequence] = useState<number[]>(Array(64).fill(0));
  const [subBassVolume, setSubBassVolume] = useState(0.6);
  const [subBassSettings, setSubBassSettings] = useState<SubBassSettings>({
    decay: 0.4,
    sustain: 0.001,
    cutoff: 100,
    resonance: 1,
    envAmount: 0.5
  });
  
  const [hintIndex, setHintIndex] = useState(0);
  
  const [barLength, setBarLength] = useState(4);
  const [currentBar, setCurrentBar] = useState(1);

  const handleSaveSong = () => {
    const songData = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      grid,
      bpm,
      volumes,
      trackModes,
      fxSettings,
      moogSequence,
      moogVolume,
      moogSettings,
      synth1Sequence,
      synth1Volume,
      synth1Settings,
      synth2Sequence,
      synth2Volume,
      synth2Settings,
      subBassSequence,
      subBassVolume,
      subBassSettings,
      velocityGrid,
    };

    const blob = new Blob([JSON.stringify(songData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `techno-song-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleLoadSong = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        
        // Basic validation and state updates
        if (data.grid) setGrid(data.grid);
        if (data.bpm) setBpm(data.bpm);
        if (data.volumes) setVolumes(data.volumes);
        if (data.trackModes) setTrackModes(data.trackModes);
        if (data.fxSettings) setFxSettings(data.fxSettings);
        if (data.moogSequence) setMoogSequence(data.moogSequence);
        if (data.moogVolume) setMoogVolume(data.moogVolume);
        if (data.moogSettings) setMoogSettings(data.moogSettings);
        if (data.synth1Sequence) setSynth1Sequence(data.synth1Sequence);
        if (data.synth1Volume) setSynth1Volume(data.synth1Volume);
        if (data.synth1Settings) setSynth1Settings(data.synth1Settings);
        if (data.synth2Sequence) setSynth2Sequence(data.synth2Sequence);
        if (data.synth2Volume) setSynth2Volume(data.synth2Volume);
        if (data.synth2Settings) setSynth2Settings(data.synth2Settings);
        if (data.subBassSequence) setSubBassSequence(data.subBassSequence);
        if (data.subBassVolume) setSubBassVolume(data.subBassVolume);
        if (data.subBassSettings) setSubBassSettings(data.subBassSettings);
        if (data.velocityGrid) setVelocityGrid(data.velocityGrid);

        // Reset transport
        setCurrentStep(0);
        setIsPlaying(false);
      } catch (err) {
        console.error("Failed to load song:", err);
        alert("Invalid song file format.");
      }
    };
    reader.readAsText(file);
    // Reset input
    event.target.value = '';
  };
  
  const [musicalKey, setMusicalKey] = useState('A');
  const [scaleType, setScaleType] = useState('minor');
  
  const audioEngineRef = useRef<AudioEngine | null>(null);

  const handleToggleCell = (row: number, colOnPage: number) => {
    const col = currentPage * 16 + colOnPage;
    let isAutofillingHH = false;
    setGrid(prev => {
      const newGrid = [...prev];
      newGrid[row] = [...newGrid[row]];
      const current = newGrid[row][col];
      
      let nextVal = 0;
      if (current === 0) nextVal = 1;
      else if (current === 1) nextVal = 2;
      else if (current === 2) nextVal = 4;
      else if (current === 4) nextVal = 8;
      else if (current === 8) nextVal = 0;
      
      newGrid[row][col] = nextVal;

      // Mirror Page 1 to other pages
      if (currentPage === 0) {
        [16, 32, 48].forEach(offset => {
          newGrid[row][col + offset] = nextVal;
        });
      }
      
      // Autofill logic only when turning ON (0 -> 1)
      if (current === 0 && nextVal === 1) {
        const trackName = tracks[row].toLowerCase();
        
        // Kick on step 1 (col 0) -> 5, 9, 13 (cols 4, 8, 12)
        if (trackName.includes('kick') && colOnPage === 0) {
          const targets = [4, 8, 12];
          targets.forEach(c => {
            const targetCol = currentPage * 16 + c;
            newGrid[row][targetCol] = 1;
            if (currentPage === 0) {
              [16, 32, 48].forEach(offset => newGrid[row][targetCol + offset] = 1);
            }
          });
        }
        
        // Snare/Clap on step 5 (col 4) -> 13 (col 12)
        if ((trackName.includes('snare') || trackName.includes('clap')) && colOnPage === 4) {
          const targetCol = currentPage * 16 + 12;
          newGrid[row][targetCol] = 1;
          if (currentPage === 0) {
            [16, 32, 48].forEach(offset => newGrid[row][targetCol + offset] = 1);
          }
        }
        
        // Hats on step 1 (col 0) -> all 16 notes on THIS page
        if (trackName.includes('hh') && colOnPage === 0) {
          isAutofillingHH = true;
          for (let c = 0; c < 16; c++) {
            const targetCol = currentPage * 16 + c;
            newGrid[row][targetCol] = 1;
            if (currentPage === 0) {
              [16, 32, 48].forEach(offset => newGrid[row][targetCol + offset] = 1);
            }
          }
        }
      }
      
      return newGrid;
    });

    if (isAutofillingHH) {
      setVelocityGrid(vPrev => {
        const newV = [...vPrev];
        newV[row] = [...newV[row]];
        for (let c = 0; c < 16; c++) {
          const targetCol = currentPage * 16 + c;
          const vel = 0.4 + Math.random() * 0.6;
          newV[row][targetCol] = vel;
          if (currentPage === 0) {
            [16, 32, 48].forEach(offset => newV[row][targetCol + offset] = vel);
          }
        }
        return newV;
      });
    }
  };
  const nextNoteTimeRef = useRef(0);
  const currentStepRef = useRef(0);
  const timerIDRef = useRef<number | null>(null);
  
  // Use refs for grid and volumes to avoid stale closures in the scheduler
  const gridRef = useRef(grid);
  const volumesRef = useRef(volumes);
  const tracksRef = useRef(tracks);
  const trackModesRef = useRef(trackModes);
  const fxSettingsRef = useRef(fxSettings);
  const velocityGridRef = useRef(velocityGrid);
  const moogSequenceRef = useRef(moogSequence);
  const moogVolumeRef = useRef(moogVolume);
  const moogSettingsRef = useRef(moogSettings);
  const synth1SequenceRef = useRef(synth1Sequence);
  const synth1VolumeRef = useRef(synth1Volume);
  const synth1SettingsRef = useRef(synth1Settings);
  const synth2SequenceRef = useRef(synth2Sequence);
  const synth2VolumeRef = useRef(synth2Volume);
  const synth2SettingsRef = useRef(synth2Settings);
  const subBassSequenceRef = useRef(subBassSequence);
  const subBassVolumeRef = useRef(subBassVolume);
  const subBassSettingsRef = useRef(subBassSettings);
  const barLengthRef = useRef(barLength);
  const musicalKeyRef = useRef(musicalKey);
  const scaleTypeRef = useRef(scaleType);
  
  const activeGridRef = useRef(grid);
  const activeVelocityGridRef = useRef(velocityGrid);
  const activeMoogSequenceRef = useRef(moogSequence);
  const activeSynth1SequenceRef = useRef(synth1Sequence);
  const activeSynth2SequenceRef = useRef(synth2Sequence);
  const activeTrackModesRef = useRef(activeTrackModes);
  const currentBarRef = useRef(1);
  const totalBarsRef = useRef(0);

  useEffect(() => { gridRef.current = grid; }, [grid]);
  useEffect(() => { volumesRef.current = volumes; }, [volumes]);
  useEffect(() => { tracksRef.current = tracks; }, [tracks]);
  useEffect(() => { trackModesRef.current = trackModes; }, [trackModes]);
  useEffect(() => { activeTrackModesRef.current = activeTrackModes; }, [activeTrackModes]);
  useEffect(() => { fxSettingsRef.current = fxSettings; }, [fxSettings]);
  useEffect(() => { velocityGridRef.current = velocityGrid; }, [velocityGrid]);
  useEffect(() => { moogSequenceRef.current = moogSequence; }, [moogSequence]);
  useEffect(() => { moogVolumeRef.current = moogVolume; }, [moogVolume]);
  useEffect(() => { moogSettingsRef.current = moogSettings; }, [moogSettings]);
  useEffect(() => { synth1SequenceRef.current = synth1Sequence; }, [synth1Sequence]);
  useEffect(() => { synth1VolumeRef.current = synth1Volume; }, [synth1Volume]);
  useEffect(() => { synth1SettingsRef.current = synth1Settings; }, [synth1Settings]);
  useEffect(() => { synth2SequenceRef.current = synth2Sequence; }, [synth2Sequence]);
  useEffect(() => { synth2VolumeRef.current = synth2Volume; }, [synth2Volume]);
  useEffect(() => { synth2SettingsRef.current = synth2Settings; }, [synth2Settings]);
  useEffect(() => { subBassSequenceRef.current = subBassSequence; }, [subBassSequence]);
  useEffect(() => { subBassVolumeRef.current = subBassVolume; }, [subBassVolume]);
  useEffect(() => { subBassSettingsRef.current = subBassSettings; }, [subBassSettings]);
  useEffect(() => { barLengthRef.current = barLength; }, [barLength]);
  useEffect(() => { musicalKeyRef.current = musicalKey; }, [musicalKey]);
  useEffect(() => { scaleTypeRef.current = scaleType; }, [scaleType]);

  useEffect(() => {
    const interval = setInterval(() => {
      setHintIndex(prev => (prev + 1) % TECHNO_HINTS.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If user is typing in an input or select, don't trigger
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      
      if (e.code === 'Space') {
        e.preventDefault();
        setTrackModes(Array(12).fill('n'));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    audioEngineRef.current = new AudioEngine();
    // Preload all available samples
    AVAILABLE_SAMPLES.forEach(sample => {
      audioEngineRef.current?.loadSample(sample.fileName, sample.url);
    });
    
    return () => {
      if (audioEngineRef.current?.ctx) {
        audioEngineRef.current.ctx.close();
      }
    };
  }, []);

  const generateSynth1 = () => {
    setSynth1Sequence(prev => {
      const newSeq = [...prev];
      const start = currentPage * 16;
      for (let i = 0; i < 16; i++) {
        const col = start + i;
        let isNote = false;
        if (i % 4 === 0) isNote = Math.random() > 0.6;
        else if (i % 2 === 0) isNote = Math.random() > 0.8;
        else isNote = Math.random() > 0.9;
        
        const val: MoogStep = isNote ? { scaleDegree: Math.floor(Math.random() * 7) } : null;
        newSeq[col] = val;
        if (currentPage === 0) {
          [16, 32, 48].forEach(offset => newSeq[col + offset] = val);
        }
      }
      return newSeq;
    });
  };

  const generateSynth2 = () => {
    setSynth2Sequence(prev => {
      const newSeq = [...prev];
      const start = currentPage * 16;
      const density = 0.3;
      for (let i = 0; i < 16; i++) {
        const col = start + i;
        const val: MoogStep = Math.random() < density ? { scaleDegree: Math.floor(Math.random() * 7) } : null;
        newSeq[col] = val;
        if (currentPage === 0) {
          [16, 32, 48].forEach(offset => newSeq[col + offset] = val);
        }
      }
      return newSeq;
    });
  };

  const generateMoogBass = () => {
    setMoogSequence(prev => {
      const newSeq = [...prev];
      const start = currentPage * 16;
      
      let availableSteps: number[] = [];
      for (let i = 0; i < 16; i++) {
        if (i % 4 === 0) {
          if (Math.random() < 0.2) availableSteps.push(i);
        } else {
          availableSteps.push(i);
        }
      }
      
      const shuffled = [...availableSteps].sort(() => 0.5 - Math.random());
      const targetNotes = Math.floor(Math.random() * 5) + 2; // 2-7 notes per page
      const selectedSteps = shuffled.slice(0, targetNotes).sort((a, b) => a - b);
      
      // Clear current page first
      for (let i = 0; i < 16; i++) {
        newSeq[start + i] = null;
        if (currentPage === 0) {
          [16, 32, 48].forEach(offset => newSeq[start + i + offset] = null);
        }
      }

      const bassDegrees = [0, 0, 0, 2, 3, 4, 4, 5, 6, -1, -2]; 
      selectedSteps.forEach((stepOnPage, index) => {
        const col = start + stepOnPage;
        let val: MoogStep = null;
        if (index === 0 || index === selectedSteps.length - 1) {
          val = { scaleDegree: 0 };
        } else {
          val = { scaleDegree: bassDegrees[Math.floor(Math.random() * bassDegrees.length)] };
        }
        newSeq[col] = val;
        if (currentPage === 0) {
          [16, 32, 48].forEach(offset => newSeq[col + offset] = val);
        }
      });
      
      return newSeq;
    });
  };

  const getFreq = (scaleDegree: number, octave: number, key: string, scale: string) => {
    const baseIndex = NOTES.indexOf(key);
    const intervals = scale === 'Major' ? MAJOR_INTERVALS : MINOR_INTERVALS;
    
    // Handle negative scale degrees by wrapping around and shifting octave
    let degree = scaleDegree;
    let octaveShift = octave;
    
    while (degree < 0) {
      degree += 7;
      octaveShift -= 1;
    }
    while (degree >= 7) {
      octaveShift += Math.floor(degree / 7);
      degree = degree % 7;
    }

    const interval = intervals[degree];
    const noteIndex = (baseIndex + interval) % 12;
    octaveShift += Math.floor((baseIndex + interval) / 12);
    
    return BASE_FREQS[noteIndex] * Math.pow(2, octaveShift);
  };

  const scheduleNote = (stepNumber: number, time: number) => {
    const anySolo = activeTrackModesRef.current.some(mode => mode === 's');
    const delayTime = 1.5 * (60.0 / bpm); // dotted quarter note

    // Play active tracks for this step using the active grid and volumes
    activeGridRef.current.forEach((row, trackIndex) => {
      const mode = activeTrackModesRef.current[trackIndex];
      if (mode === 'm' || (anySolo && mode !== 's')) return;

      const repeat = row[stepNumber];
      if (repeat > 0) {
        if (totalBarsRef.current % repeat === 0) {
          const fx = fxSettingsRef.current[trackIndex];
          let velocity = volumesRef.current[trackIndex] * activeVelocityGridRef.current[trackIndex][stepNumber];
          const trackName = tracksRef.current[trackIndex].toLowerCase();
          if (trackName.includes('hh')) {
            // Randomize velocity more significantly
            velocity = velocity * (0.5 + Math.random() * 0.5);
          }
          
          audioEngineRef.current?.playSample(tracksRef.current[trackIndex], time, velocity, {
            delay: fx.delay,
            reverb: fx.reverb,
            time: delayTime
          });
        }
      }
    });
    
    // Play Synth 1 if active
    const synth1Mode = activeTrackModesRef.current[8];
    if (synth1Mode !== 'm' && (!anySolo || synth1Mode === 's')) {
      const synth1Step = activeSynth1SequenceRef.current[stepNumber];
      if (synth1Step !== null) {
        const fx = fxSettingsRef.current[8];
        const freq = getFreq(synth1Step.scaleDegree, 0, musicalKeyRef.current, scaleTypeRef.current);
        audioEngineRef.current?.playMelodicSynth(time, freq, synth1VolumeRef.current, synth1SettingsRef.current, {
          delay: fx.delay,
          reverb: fx.reverb,
          time: delayTime
        });
      }
    }

    // Play Synth 2 if active
    const synth2Mode = activeTrackModesRef.current[9];
    if (synth2Mode !== 'm' && (!anySolo || synth2Mode === 's')) {
      const synth2Step = activeSynth2SequenceRef.current[stepNumber];
      if (synth2Step !== null) {
        const fx = fxSettingsRef.current[9];
        const freq = getFreq(synth2Step.scaleDegree, 1, musicalKeyRef.current, scaleTypeRef.current);
        audioEngineRef.current?.playMelodicSynth(time, freq, synth2VolumeRef.current, synth2SettingsRef.current, {
          delay: fx.delay,
          reverb: fx.reverb,
          time: delayTime
        });
      }
    }
    
    // Play Moog Bass if active
    const moogMode = activeTrackModesRef.current[10];
    if (moogMode !== 'm' && (!anySolo || moogMode === 's')) {
      const moogStep = activeMoogSequenceRef.current[stepNumber];
      if (moogStep !== null) {
        const fx = fxSettingsRef.current[10];
        const freq = getFreq(moogStep.scaleDegree, -1, musicalKeyRef.current, scaleTypeRef.current);
        audioEngineRef.current?.playMoogBass(time, freq, moogVolumeRef.current, moogSettingsRef.current, {
          delay: fx.delay,
          reverb: fx.reverb,
          time: delayTime
        });
      }
    }
    
    // Play Sub Bass if active
    const subBassMode = activeTrackModesRef.current[11];
    if (subBassMode !== 'm' && (!anySolo || subBassMode === 's')) {
      const val = subBassSequenceRef.current[stepNumber];
      if (val > 0) {
        const fx = fxSettingsRef.current[11];
        // Use the stored scale degree (val - 1)
        const freq = getFreq(val - 1, -2, musicalKeyRef.current, scaleTypeRef.current);
        audioEngineRef.current?.playSubBass(time, freq, subBassVolumeRef.current, subBassSettingsRef.current, {
          delay: fx.delay,
          reverb: fx.reverb,
          time: delayTime
        });
      }
    }

    // Update UI (using a slight timeout to sync with audio time roughly)
    const timeToPlay = time - audioEngineRef.current!.ctx.currentTime;
    setTimeout(() => {
      setCurrentStep(stepNumber);
    }, Math.max(0, timeToPlay * 1000));
  };

  const nextNote = () => {
    const secondsPerBeat = 60.0 / bpm;
    // 16th notes = 0.25 beats
    nextNoteTimeRef.current += 0.25 * secondsPerBeat;
    currentStepRef.current++;
    if (currentStepRef.current === 64) {
      currentStepRef.current = 0;
      
      let nextBar = currentBarRef.current + 1;
      if (nextBar > barLengthRef.current) {
        nextBar = 1;
        activeGridRef.current = gridRef.current;
        activeVelocityGridRef.current = velocityGridRef.current;
        activeMoogSequenceRef.current = moogSequenceRef.current;
        activeSynth1SequenceRef.current = synth1SequenceRef.current;
        activeSynth2SequenceRef.current = synth2SequenceRef.current;
        activeTrackModesRef.current = trackModesRef.current;
        setActiveTrackModes(trackModesRef.current);
      }
      currentBarRef.current = nextBar;
      setCurrentBar(nextBar);
      
      totalBarsRef.current++;
    }
  };

  const scheduler = () => {
    // Schedule notes up to 100ms in the future
    while (nextNoteTimeRef.current < audioEngineRef.current!.ctx.currentTime + 0.1) {
      scheduleNote(currentStepRef.current, nextNoteTimeRef.current);
      nextNote();
    }
    timerIDRef.current = requestAnimationFrame(scheduler);
  };

  useEffect(() => {
    if (isPlaying) {
      if (audioEngineRef.current?.ctx.state === 'suspended') {
        audioEngineRef.current.ctx.resume();
      }
      currentStepRef.current = 0;
      currentBarRef.current = 1;
      totalBarsRef.current = 0;
      setCurrentBar(1);
      
      activeGridRef.current = gridRef.current;
      activeVelocityGridRef.current = velocityGridRef.current;
      activeMoogSequenceRef.current = moogSequenceRef.current;
      activeTrackModesRef.current = trackModesRef.current;
      setActiveTrackModes(trackModesRef.current);
      
      nextNoteTimeRef.current = audioEngineRef.current!.ctx.currentTime + 0.05;
      scheduler();
    } else {
      if (timerIDRef.current !== null) {
        cancelAnimationFrame(timerIDRef.current);
        timerIDRef.current = null;
      }
    }
    return () => {
      if (timerIDRef.current !== null) {
        cancelAnimationFrame(timerIDRef.current);
      }
    };
  }, [isPlaying, bpm]);

  const renderModeToggle = (index: number) => {
    const mode = trackModes[index];
    const activeMode = activeTrackModes[index];
    
    const isMuteActive = activeMode === 'm';
    const isMuteSelected = mode === 'm';
    let mClass = 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700';
    if (isMuteSelected || isMuteActive) {
      if (isMuteSelected !== isMuteActive) {
        mClass = 'bg-red-900/30 text-red-400/50 border-red-800/50 animate-pulse';
      } else {
        mClass = 'bg-red-900/50 text-red-400 border-red-800 hover:bg-red-900/70';
      }
    }

    const isSoloActive = activeMode === 's';
    const isSoloSelected = mode === 's';
    let sClass = 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700';
    if (isSoloSelected || isSoloActive) {
      if (isSoloSelected !== isSoloActive) {
        sClass = 'bg-yellow-900/30 text-yellow-400/50 border-yellow-800/50 animate-pulse';
      } else {
        sClass = 'bg-yellow-900/50 text-yellow-400 border-yellow-800 hover:bg-yellow-900/70';
      }
    }
    
    return (
      <div className="flex gap-1">
        <button
          onClick={() => {
            const newModes = [...trackModes];
            newModes[index] = mode === 'm' ? 'n' : 'm';
            setTrackModes(newModes);
          }}
          className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold border transition-colors shrink-0 ${mClass}`}
        >
          M
        </button>
        <button
          onClick={() => {
            const newModes = [...trackModes];
            newModes[index] = mode === 's' ? 'n' : 's';
            setTrackModes(newModes);
          }}
          className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold border transition-colors shrink-0 ${sClass}`}
        >
          S
        </button>
      </div>
    );
  };

  const renderFXControls = (index: number) => {
    const fx = fxSettings[index];
    return (
      <div className="flex items-center gap-1 mr-4 bg-zinc-950/50 px-1.5 py-1 rounded-lg border border-zinc-800">
        <div className="flex flex-col items-center">
          <span className="text-[8px] text-zinc-500 font-bold uppercase">Dly</span>
          <select
            value={fx.delay}
            onChange={(e) => {
              const newFX = [...fxSettings];
              newFX[index] = { ...fx, delay: parseInt(e.target.value) };
              setFxSettings(newFX);
            }}
            className={`bg-zinc-900 text-[10px] font-mono border border-zinc-800 rounded px-1 py-0.5 outline-none focus:border-blue-500 ${
              fx.delay > 0 ? 'text-blue-400' : 'text-zinc-600'
            }`}
          >
            {[0, 1, 2, 3, 4].map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[8px] text-zinc-500 font-bold uppercase">Rev</span>
          <select
            value={fx.reverb}
            onChange={(e) => {
              const newFX = [...fxSettings];
              newFX[index] = { ...fx, reverb: parseInt(e.target.value) };
              setFxSettings(newFX);
            }}
            className={`bg-zinc-900 text-[10px] font-mono border border-zinc-800 rounded px-1 py-0.5 outline-none focus:border-emerald-500 ${
              fx.reverb > 0 ? 'text-emerald-400' : 'text-zinc-600'
            }`}
          >
            {[0, 1, 2, 3, 4].map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-zinc-900 p-6 rounded-2xl shadow-2xl border border-zinc-800">
      <div className="text-center h-6 mb-4">
        <p key={hintIndex} className="text-xs text-emerald-400/80 font-mono animate-in fade-in duration-1000">
          {TECHNO_HINTS[hintIndex]}
        </p>
      </div>
      
      <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`w-12 h-12 flex items-center justify-center rounded-full shrink-0 ${
              isPlaying ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'
            } text-white transition-colors`}
          >
            {isPlaying ? <Square fill="currentColor" size={20} /> : <Play fill="currentColor" size={20} className="ml-1" />}
          </button>
          
          <div className="flex items-center gap-1 bg-zinc-950/50 p-1 rounded-xl border border-zinc-800">
            {[0, 1, 2, 3].map(p => (
              <button
                key={p}
                onClick={() => setCurrentPage(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  currentPage === p 
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                P{p + 1}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4 bg-zinc-950/50 px-4 py-2 rounded-xl border border-zinc-800">
            <div className="flex flex-col">
              <label className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider mb-1">Key</label>
              <select 
                value={musicalKey} 
                onChange={(e) => setMusicalKey(e.target.value)}
                className="bg-zinc-900 text-white text-sm border border-zinc-700 rounded px-2 py-1 outline-none focus:border-emerald-500"
              >
                {NOTES.map(note => <option key={note} value={note}>{note}</option>)}
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider mb-1">Scale</label>
              <select 
                value={scaleType} 
                onChange={(e) => setScaleType(e.target.value)}
                className="bg-zinc-900 text-white text-sm border border-zinc-700 rounded px-2 py-1 outline-none focus:border-emerald-500"
              >
                <option value="Major">Major</option>
                <option value="Minor">Minor</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-zinc-950/50 px-4 py-2 rounded-xl border border-zinc-800">
            <div className="flex flex-col">
              <label className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider mb-1">Bar Reset</label>
              <select 
                value={barLength} 
                onChange={(e) => setBarLength(Number(e.target.value))}
                className="bg-zinc-900 text-white text-sm border border-zinc-700 rounded px-2 py-1 outline-none focus:border-emerald-500"
              >
                <option value={1}>1 Bar</option>
                <option value={2}>2 Bars</option>
                <option value={4}>4 Bars</option>
                <option value={8}>8 Bars</option>
              </select>
            </div>
            <div className="flex flex-col items-center justify-center px-2">
              <label className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-1">Current</label>
              <div className="text-emerald-400 font-mono font-bold text-lg leading-none">{currentBar}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-zinc-950/50 px-4 py-2 rounded-xl border border-zinc-800">
            <div className="flex flex-col">
              <label className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider mb-1">Project</label>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveSong}
                  className="p-2 bg-zinc-900 hover:bg-zinc-800 text-emerald-400 border border-zinc-700 rounded transition-colors"
                  title="Save Song to File"
                >
                  <Save size={16} />
                </button>
                <label 
                  className="p-2 bg-zinc-900 hover:bg-zinc-800 text-cyan-400 border border-zinc-700 rounded transition-colors cursor-pointer"
                  title="Load Song from File"
                >
                  <Upload size={16} />
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleLoadSong}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="flex flex-col">
            <label className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider mb-1">Tempo</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="60"
                max="200"
                value={bpm}
                onChange={(e) => setBpm(parseInt(e.target.value))}
                className="w-32 accent-emerald-500"
              />
              <span className="text-white font-mono w-12">{bpm}</span>
            </div>
          </div>

          <div className="flex flex-col">
            <label className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider mb-1">Clear</label>
            <button
              onClick={() => setTrackModes(Array(10).fill('n'))}
              className="px-3 py-1 bg-zinc-800 text-zinc-400 border border-zinc-700 rounded hover:bg-zinc-700 hover:text-white transition-colors text-xs font-bold"
            >
              All M/S
            </button>
          </div>

          <div className="flex flex-col">
            <label className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider mb-1">Pattern</label>
            <select
              onChange={(e) => {
                const idx = parseInt(e.target.value);
                if (idx >= 0) {
                  const pattern = TECHNO_PATTERNS[idx];
                  setGrid(pattern.grid);
                  
                  // Randomize velocities for HH tracks in the template (64 steps)
                  setVelocityGrid(vPrev => {
                    const newV = vPrev.map((row, r) => {
                      const trackName = tracks[r].toLowerCase();
                      if (trackName.includes('hh')) {
                        return Array(64).fill(0).map(() => 0.4 + Math.random() * 0.6);
                      }
                      return Array(64).fill(1);
                    });
                    return newV;
                  });
                  
                  // Suggest sub bass for new templates (64 steps, mirrored)
                  const subBass1 = Array(4).fill([1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0]).flat();
                  const subBass2 = Array(4).fill([1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0]).flat();

                  if (pattern.name === "Minimal Techno") {
                    setBpm(128);
                    setSubBassSequence(subBass1);
                  } else if (pattern.name === "Melodic Techno") {
                    setBpm(124);
                    setSubBassSequence(subBass1);
                  } else if (pattern.name === "Ambient Techno") {
                    setBpm(110);
                    setSubBassSequence(subBass2);
                  } else if (pattern.name === "Dub Techno") {
                    setBpm(118);
                    setSubBassSequence(subBass1);
                  }
                  
                  if (onTemplateSelect) onTemplateSelect(pattern.name);
                  e.target.value = "-1"; // reset selection
                }
              }}
              defaultValue="-1"
              className="bg-zinc-900 text-white text-sm border border-zinc-700 rounded px-2 py-1 outline-none focus:border-emerald-500"
            >
              <option value="-1" disabled>Select Template...</option>
              {TECHNO_PATTERNS.map((pattern, idx) => (
                <option key={idx} value={idx}>{pattern.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <label className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider mb-1">Save/Load</label>
            <div className="flex gap-1">
              {[0, 1, 2, 3].map(idx => (
                <button
                  key={`save-${idx}`}
                  onClick={() => {
                    if (savedPatterns[idx]) {
                      // Load
                      const p = savedPatterns[idx]!;
                      setGrid(p.grid);
                      if (p.velocityGrid) setVelocityGrid(p.velocityGrid);
                      setMoogSequence(p.moogSequence);
                      setSynth1Sequence(p.synth1Sequence || Array(64).fill(null));
                      setSynth2Sequence(p.synth2Sequence || Array(64).fill(null));
                      setSubBassSequence(p.subBassSequence);
                      if (p.moogSettings) setMoogSettings(p.moogSettings);
                      if (p.synth1Settings) setSynth1Settings(p.synth1Settings);
                      if (p.synth2Settings) setSynth2Settings(p.synth2Settings);
                      if (p.subBassSettings) setSubBassSettings(p.subBassSettings);
                    } else {
                      // Save
                      const newSaved = [...savedPatterns];
                      newSaved[idx] = {
                        grid: JSON.parse(JSON.stringify(grid)),
                        velocityGrid: JSON.parse(JSON.stringify(velocityGrid)),
                        moogSequence: [...moogSequence],
                        synth1Sequence: [...synth1Sequence],
                        synth2Sequence: [...synth2Sequence],
                        subBassSequence: [...subBassSequence],
                        moogSettings: { ...moogSettings },
                        synth1Settings: { ...synth1Settings },
                        synth2Settings: { ...synth2Settings },
                        subBassSettings: { ...subBassSettings }
                      };
                      setSavedPatterns(newSaved);
                    }
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    // Force overwrite save
                    const newSaved = [...savedPatterns];
                    newSaved[idx] = {
                      grid: JSON.parse(JSON.stringify(grid)),
                      velocityGrid: JSON.parse(JSON.stringify(velocityGrid)),
                      moogSequence: [...moogSequence],
                      synth1Sequence: [...synth1Sequence],
                      synth2Sequence: [...synth2Sequence],
                      subBassSequence: [...subBassSequence],
                      moogSettings: { ...moogSettings },
                      synth1Settings: { ...synth1Settings },
                      synth2Settings: { ...synth2Settings },
                      subBassSettings: { ...subBassSettings }
                    };
                    setSavedPatterns(newSaved);
                  }}
                  className={`w-8 h-8 rounded flex items-center justify-center text-[10px] font-bold border transition-all ${
                    savedPatterns[idx]
                      ? 'bg-zinc-700 text-emerald-400 border-emerald-500/50 shadow-[0_0_5px_rgba(16,185,129,0.3)]'
                      : 'bg-zinc-800 text-zinc-600 border-zinc-700 hover:bg-zinc-700 hover:text-zinc-400'
                  }`}
                  title={savedPatterns[idx] ? "Click to Load, Right-click to Overwrite" : "Click to Save current pattern"}
                >
                  S{idx + 1}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6 overflow-x-auto pb-4">
        <div>
          <div className="space-y-2">
            {/* Synth 1 Row */}
            <div className="flex flex-col gap-2 mb-4 pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="w-44 flex items-center justify-end gap-2 pr-2">
                  {renderModeToggle(8)}
                  <div className="w-28 text-right text-emerald-400 text-xs font-mono truncate font-bold">Pluck Synth</div>
                </div>
                <div className="flex items-center gap-2 mr-2 bg-zinc-950/50 px-2 py-1.5 rounded-lg border border-zinc-800">
                  <Volume2 size={12} className="text-zinc-500" />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={synth1Volume}
                    onChange={(e) => setSynth1Volume(parseFloat(e.target.value))}
                    className="w-16 accent-emerald-500"
                  />
                </div>
                {renderFXControls(8)}
                <div className="flex gap-1">
                  {synth1Sequence.slice(currentPage * 16, (currentPage + 1) * 16).map((stepData, colOnPage) => {
                    const col = currentPage * 16 + colOnPage;
                    return (
                      <button
                        key={`synth1-${col}`}
                        onClick={() => {
                          const newSeq = [...synth1Sequence];
                          const current = newSeq[col];
                          let nextVal: MoogStep = null;
                          if (current === null) nextVal = { scaleDegree: 0 };
                          else if (current.scaleDegree >= 0 && current.scaleDegree < 7) nextVal = { scaleDegree: current.scaleDegree + 1 };
                          else if (current.scaleDegree === 7) nextVal = { scaleDegree: -1 };
                          else if (current.scaleDegree < 0 && current.scaleDegree > -7) nextVal = { scaleDegree: current.scaleDegree - 1 };
                          else if (current.scaleDegree === -7) nextVal = null;
                          
                          newSeq[col] = nextVal;
                          if (currentPage === 0) {
                            [16, 32, 48].forEach(offset => newSeq[col + offset] = nextVal);
                          }
                          setSynth1Sequence(newSeq);
                        }}
                        className={`w-8 h-8 rounded-sm border transition-all flex items-center justify-center text-[10px] font-bold ${
                          stepData !== null
                            ? 'bg-emerald-500 border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.5)] text-emerald-950'
                            : currentStep === col && isPlaying
                            ? 'bg-zinc-700 border-zinc-600 text-transparent'
                            : col % 4 === 0
                            ? 'bg-zinc-700/40 border-zinc-600 hover:bg-zinc-600 text-transparent'
                            : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-transparent'
                        }`}
                      >
                        {stepData !== null ? (stepData.scaleDegree > 0 ? `+${stepData.scaleDegree}` : stepData.scaleDegree) : ''}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={generateSynth1}
                  className="flex items-center gap-1 px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-bold uppercase hover:bg-emerald-500/20 transition-colors ml-2"
                  title="Randomize Synth 1"
                >
                  <Wand2 size={12} />
                  Rand
                </button>
              </div>
              <div className="flex items-center gap-4 pl-[168px]">
                <div className="flex items-center gap-2 bg-zinc-950/50 px-2 py-1 rounded border border-zinc-800">
                  <span className="text-[10px] text-emerald-400 font-bold">Decay</span>
                  <input type="range" min="0.05" max="1" step="0.01" value={synth1Settings.decay} onChange={e => setSynth1Settings({...synth1Settings, decay: parseFloat(e.target.value)})} className="w-16 accent-emerald-500" />
                </div>
                <div className="flex items-center gap-2 bg-zinc-950/50 px-2 py-1 rounded border border-zinc-800">
                  <select 
                    value={synth1Settings.filterType} 
                    onChange={e => setSynth1Settings({...synth1Settings, filterType: e.target.value as any})}
                    className="bg-zinc-900 text-[10px] text-emerald-400 border border-zinc-800 rounded px-1 py-1 outline-none"
                  >
                    <option value="none">No Filter</option>
                    <option value="lowpass">Low Pass</option>
                    <option value="highpass">High Pass</option>
                  </select>
                  {synth1Settings.filterType !== 'none' && (
                    <>
                      <input 
                        type="range" 
                        min="50" 
                        max="10000" 
                        step="1" 
                        value={synth1Settings.cutoff} 
                        onChange={e => setSynth1Settings({...synth1Settings, cutoff: parseInt(e.target.value)})} 
                        className="w-20 accent-emerald-500" 
                        title="Filter Cutoff"
                      />
                      <div className="flex items-center gap-1 ml-1 border-l border-zinc-800 pl-1">
                        <span className="text-[8px] text-zinc-500 uppercase font-bold">Env</span>
                        <input 
                          type="range" 
                          min="0" 
                          max="1" 
                          step="0.01" 
                          value={synth1Settings.envAmount} 
                          onChange={e => setSynth1Settings({...synth1Settings, envAmount: parseFloat(e.target.value)})} 
                          className="w-12 accent-emerald-500" 
                          title="Filter Envelope Amount"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Synth 2 Row */}
            <div className="flex flex-col gap-2 mb-4 pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="w-44 flex items-center justify-end gap-2 pr-2">
                  {renderModeToggle(9)}
                  <div className="w-28 text-right text-blue-400 text-xs font-mono truncate font-bold">Lead Synth</div>
                </div>
                <div className="flex items-center gap-2 mr-2 bg-zinc-950/50 px-2 py-1.5 rounded-lg border border-zinc-800">
                  <Volume2 size={12} className="text-zinc-500" />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={synth2Volume}
                    onChange={(e) => setSynth2Volume(parseFloat(e.target.value))}
                    className="w-16 accent-blue-500"
                  />
                </div>
                {renderFXControls(9)}
                <div className="flex gap-1">
                  {synth2Sequence.slice(currentPage * 16, (currentPage + 1) * 16).map((stepData, colOnPage) => {
                    const col = currentPage * 16 + colOnPage;
                    return (
                      <button
                        key={`synth2-${col}`}
                        onClick={() => {
                          const newSeq = [...synth2Sequence];
                          const current = newSeq[col];
                          let nextVal: MoogStep = null;
                          if (current === null) nextVal = { scaleDegree: 0 };
                          else if (current.scaleDegree >= 0 && current.scaleDegree < 7) nextVal = { scaleDegree: current.scaleDegree + 1 };
                          else if (current.scaleDegree === 7) nextVal = { scaleDegree: -1 };
                          else if (current.scaleDegree < 0 && current.scaleDegree > -7) nextVal = { scaleDegree: current.scaleDegree - 1 };
                          else if (current.scaleDegree === -7) nextVal = null;
                          
                          newSeq[col] = nextVal;
                          if (currentPage === 0) {
                            [16, 32, 48].forEach(offset => newSeq[col + offset] = nextVal);
                          }
                          setSynth2Sequence(newSeq);
                        }}
                        className={`w-8 h-8 rounded-sm border transition-all flex items-center justify-center text-[10px] font-bold ${
                          stepData !== null
                            ? 'bg-blue-500 border-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.5)] text-blue-950'
                            : currentStep === col && isPlaying
                            ? 'bg-zinc-700 border-zinc-600 text-transparent'
                            : col % 4 === 0
                            ? 'bg-zinc-700/40 border-zinc-600 hover:bg-zinc-600 text-transparent'
                            : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-transparent'
                        }`}
                      >
                        {stepData !== null ? (stepData.scaleDegree > 0 ? `+${stepData.scaleDegree}` : stepData.scaleDegree) : ''}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={generateSynth2}
                  className="flex items-center gap-1 px-2 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded text-[10px] font-bold uppercase hover:bg-blue-500/20 transition-colors ml-2"
                  title="Randomize Synth 2"
                >
                  <Wand2 size={12} />
                  Rand
                </button>
              </div>
              <div className="flex items-center gap-4 pl-[168px]">
                <div className="flex items-center gap-2 bg-zinc-950/50 px-2 py-1 rounded border border-zinc-800">
                  <span className="text-[10px] text-blue-400 font-bold">Decay</span>
                  <input type="range" min="0.05" max="1" step="0.01" value={synth2Settings.decay} onChange={e => setSynth2Settings({...synth2Settings, decay: parseFloat(e.target.value)})} className="w-16 accent-blue-500" />
                </div>
                <div className="flex items-center gap-2 bg-zinc-950/50 px-2 py-1 rounded border border-zinc-800">
                  <select 
                    value={synth2Settings.filterType} 
                    onChange={e => setSynth2Settings({...synth2Settings, filterType: e.target.value as any})}
                    className="bg-zinc-900 text-[10px] text-blue-400 border border-zinc-800 rounded px-1 py-1 outline-none"
                  >
                    <option value="none">No Filter</option>
                    <option value="lowpass">Low Pass</option>
                    <option value="highpass">High Pass</option>
                  </select>
                  {synth2Settings.filterType !== 'none' && (
                    <>
                      <input 
                        type="range" 
                        min="50" 
                        max="10000" 
                        step="1" 
                        value={synth2Settings.cutoff} 
                        onChange={e => setSynth2Settings({...synth2Settings, cutoff: parseInt(e.target.value)})} 
                        className="w-20 accent-blue-500" 
                        title="Filter Cutoff"
                      />
                      <div className="flex items-center gap-1 ml-1 border-l border-zinc-800 pl-1">
                        <span className="text-[8px] text-zinc-500 uppercase font-bold">Env</span>
                        <input 
                          type="range" 
                          min="0" 
                          max="1" 
                          step="0.01" 
                          value={synth2Settings.envAmount} 
                          onChange={e => setSynth2Settings({...synth2Settings, envAmount: parseFloat(e.target.value)})} 
                          className="w-12 accent-blue-500" 
                          title="Filter Envelope Amount"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Moog Bass Row */}
            <div className="flex flex-col gap-2 mb-4 pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="w-44 flex items-center justify-end gap-2 pr-2">
                  {renderModeToggle(10)}
                  <div className="w-28 text-right text-purple-400 text-xs font-mono truncate font-bold">Moog Bass</div>
                </div>
                <div className="flex items-center gap-2 mr-2 bg-zinc-950/50 px-2 py-1.5 rounded-lg border border-zinc-800">
                  <Volume2 size={12} className="text-zinc-500" />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={moogVolume}
                    onChange={(e) => setMoogVolume(parseFloat(e.target.value))}
                    className="w-16 accent-purple-500"
                  />
                </div>
                {renderFXControls(10)}
                <div className="flex gap-1">
                  {moogSequence.slice(currentPage * 16, (currentPage + 1) * 16).map((stepData, colOnPage) => {
                    const col = currentPage * 16 + colOnPage;
                    return (
                      <button
                        key={`moog-${col}`}
                        onClick={() => {
                          const newSeq = [...moogSequence];
                          const current = newSeq[col];
                          let nextVal: MoogStep = null;
                          if (current === null) nextVal = { scaleDegree: 0 };
                          else if (current.scaleDegree >= 0 && current.scaleDegree < 7) nextVal = { scaleDegree: current.scaleDegree + 1 };
                          else if (current.scaleDegree === 7) nextVal = { scaleDegree: -1 };
                          else if (current.scaleDegree < 0 && current.scaleDegree > -7) nextVal = { scaleDegree: current.scaleDegree - 1 };
                          else if (current.scaleDegree === -7) nextVal = null;
                          
                          newSeq[col] = nextVal;
                          if (currentPage === 0) {
                            [16, 32, 48].forEach(offset => newSeq[col + offset] = nextVal);
                          }
                          setMoogSequence(newSeq);
                        }}
                        className={`w-8 h-8 rounded-sm border transition-all flex items-center justify-center text-[10px] font-bold ${
                          stepData !== null
                            ? 'bg-purple-500 border-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.5)] text-purple-950'
                            : currentStep === col && isPlaying
                            ? 'bg-zinc-700 border-zinc-600 text-transparent'
                            : col % 4 === 0
                            ? 'bg-zinc-700/40 border-zinc-600 hover:bg-zinc-600 text-transparent'
                            : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-transparent'
                        }`}
                      >
                        {stepData !== null ? (stepData.scaleDegree > 0 ? `+${stepData.scaleDegree}` : stepData.scaleDegree) : ''}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={generateMoogBass}
                  className="flex items-center gap-1 px-2 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/30 rounded text-[10px] font-bold uppercase hover:bg-purple-500/20 transition-colors ml-2"
                  title="Randomize Moog Sequence"
                >
                  <Wand2 size={12} />
                  Rand
                </button>
              </div>
              <div className="flex items-center gap-4 pl-[168px]">
                <div className="flex items-center gap-2 bg-zinc-950/50 px-2 py-1 rounded border border-zinc-800">
                  <span className="text-[10px] text-purple-400 font-bold">Decay</span>
                  <input type="range" min="0.05" max="1" step="0.01" value={moogSettings.decay} onChange={e => setMoogSettings({...moogSettings, decay: parseFloat(e.target.value)})} className="w-16 accent-purple-500" />
                </div>
                <div className="flex items-center gap-2 bg-zinc-950/50 px-2 py-1 rounded border border-zinc-800">
                  <select 
                    value={moogSettings.filterType} 
                    onChange={e => setMoogSettings({...moogSettings, filterType: e.target.value as any})}
                    className="bg-zinc-900 text-[10px] text-purple-400 border border-zinc-800 rounded px-1 py-1 outline-none"
                  >
                    <option value="none">No Filter</option>
                    <option value="lowpass">Low Pass</option>
                    <option value="highpass">High Pass</option>
                  </select>
                  {moogSettings.filterType !== 'none' && (
                    <>
                      <input 
                        type="range" 
                        min="50" 
                        max="10000" 
                        step="1" 
                        value={moogSettings.cutoff} 
                        onChange={e => setMoogSettings({...moogSettings, cutoff: parseInt(e.target.value)})} 
                        className="w-20 accent-purple-500" 
                        title="Filter Cutoff"
                      />
                      <div className="flex items-center gap-1 ml-1 border-l border-zinc-800 pl-1">
                        <span className="text-[8px] text-zinc-500 uppercase font-bold">Env</span>
                        <input 
                          type="range" 
                          min="0" 
                          max="1" 
                          step="0.01" 
                          value={moogSettings.envAmount} 
                          onChange={e => setMoogSettings({...moogSettings, envAmount: parseFloat(e.target.value)})} 
                          className="w-12 accent-purple-500" 
                          title="Filter Envelope Amount"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Existing Tracks */}
            {tracks.map((track, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-44 flex items-center justify-end gap-2 pr-2">
                  {renderModeToggle(i)}
                  <select
                    value={track}
                    onChange={(e) => {
                      const newTracks = [...tracks];
                      newTracks[i] = e.target.value;
                      setTracks(newTracks);
                    }}
                    className="w-28 bg-zinc-900 text-zinc-400 text-xs font-mono border border-zinc-800 rounded px-1 py-1 outline-none focus:border-emerald-500 truncate"
                  >
                    {AVAILABLE_SAMPLES.map(sample => (
                      <option key={sample.fileName} value={sample.fileName}>
                        {sample.displayName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2 mr-2 bg-zinc-950/50 px-2 py-1.5 rounded-lg border border-zinc-800">
                  <Volume2 size={12} className="text-zinc-500" />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volumes[i]}
                    onChange={(e) => {
                      const newVols = [...volumes];
                      newVols[i] = parseFloat(e.target.value);
                      setVolumes(newVols);
                    }}
                    className="w-16 accent-emerald-500"
                  />
                </div>
                {renderFXControls(i)}
                <div className="flex gap-1">
                  {grid[i] && grid[i].slice(currentPage * 16, (currentPage + 1) * 16).map((isActive, colOnPage) => {
                    const col = currentPage * 16 + colOnPage;
                    return (
                      <button
                        key={col}
                        onClick={() => handleToggleCell(i, colOnPage)}
                        className={`w-8 h-8 rounded-sm border transition-all flex items-center justify-center text-[10px] font-bold ${
                          isActive > 0
                            ? 'bg-emerald-500 border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.5)] text-emerald-950'
                            : currentStep === col && isPlaying
                            ? 'bg-zinc-700 border-zinc-600 text-transparent'
                            : col % 4 === 0
                            ? 'bg-zinc-700/40 border-zinc-600 hover:bg-zinc-600 text-transparent'
                            : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-transparent'
                        }`}
                      >
                        {isActive > 0 ? isActive : ''}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => {
                    setGrid(prev => {
                      const newGrid = [...prev];
                      newGrid[i] = [...newGrid[i]];
                      const start = currentPage * 16;
                      for (let c = 0; c < 16; c++) {
                        const col = start + c;
                        newGrid[i][col] = 0;
                        if (currentPage === 0) {
                          [16, 32, 48].forEach(offset => newGrid[i][col + offset] = 0);
                        }
                      }
                      return newGrid;
                    });
                  }}
                  className="w-6 h-8 bg-zinc-800 text-zinc-500 hover:text-red-400 border border-zinc-700 rounded-sm text-[10px] font-bold transition-colors"
                  title="Clear Row"
                >
                  C
                </button>
              </div>
            ))}

            {/* Sub Bass Row */}
            <div className="flex flex-col gap-2 pt-4 border-t border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="w-44 flex items-center justify-end gap-2 pr-2">
                  {renderModeToggle(11)}
                  <div className="w-28 text-right text-cyan-400 text-xs font-mono truncate font-bold">Sub Bass</div>
                </div>
                <div className="flex items-center gap-2 mr-2 bg-zinc-950/50 px-2 py-1.5 rounded-lg border border-zinc-800">
                  <Volume2 size={12} className="text-zinc-500" />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={subBassVolume}
                    onChange={(e) => setSubBassVolume(parseFloat(e.target.value))}
                    className="w-16 accent-cyan-500"
                  />
                </div>
                {renderFXControls(11)}
                <div className="flex gap-1">
                  {subBassSequence.slice(currentPage * 16, (currentPage + 1) * 16).map((isActive, colOnPage) => {
                    const col = currentPage * 16 + colOnPage;
                    return (
                      <button
                        key={`sub-${col}`}
                        onClick={() => {
                          const newSeq = [...subBassSequence];
                          const isTurningOn = newSeq[col] === 0;
                          const nextVal = isTurningOn ? 1 : 0;
                          newSeq[col] = nextVal;
                          
                          if (currentPage === 0) {
                            [16, 32, 48].forEach(offset => newSeq[col + offset] = nextVal);
                          }
                          
                          // Special logic: if user puts sub bass on step 2 (index 1), 
                          // fill all steps except for 1, 5, 9, 13 (indices 0, 4, 8, 12).
                          if (isTurningOn && colOnPage === 1) {
                            for (let i = 0; i < 16; i++) {
                              const targetCol = currentPage * 16 + i;
                              const fillVal = (i % 4 === 0) ? 0 : 1;
                              newSeq[targetCol] = fillVal;
                              if (currentPage === 0) {
                                [16, 32, 48].forEach(offset => newSeq[targetCol + offset] = fillVal);
                              }
                            }
                          }
                          setSubBassSequence(newSeq);
                        }}
                        className={`w-8 h-8 rounded-sm border transition-all flex items-center justify-center text-[10px] font-bold ${
                          isActive > 0
                            ? 'bg-cyan-500 border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.5)] text-cyan-950'
                            : currentStep === col && isPlaying
                            ? 'bg-zinc-700 border-zinc-600 text-transparent'
                            : col % 4 === 0
                            ? 'bg-zinc-700/40 border-zinc-600 hover:bg-zinc-600 text-transparent'
                            : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-transparent'
                        }`}
                      >
                        {isActive > 0 ? '●' : ''}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => {
                    // 1. Randomize modulation parameters
                    const newSettings = {
                      cutoff: Math.floor(40 + Math.random() * 100),
                      resonance: Math.floor(Math.random() * 12),
                      decay: parseFloat((0.1 + Math.random() * 0.4).toFixed(2)),
                      sustain: 0.001,
                      envAmount: Math.floor(200 + Math.random() * 1000)
                    };
                    setSubBassSettings(newSettings);

                    // 2. Randomize notes using a 2-note pattern of the given scale
                    // Pick 2 degrees (root + one other musical interval)
                    const d1 = 0; // Root
                    const intervals = [2, 3, 4, 5, 7]; // Musical intervals (3rd, 4th, 5th, etc)
                    const d2 = intervals[Math.floor(Math.random() * intervals.length)];
                    
                    const newSeq = [...subBassSequence];
                    let hasActiveSteps = false;
                    const start = currentPage * 16;
                    for (let i = 0; i < 16; i++) {
                      const col = start + i;
                      if (newSeq[col] > 0) {
                        const val = Math.random() > 0.5 ? d1 + 1 : d2 + 1;
                        newSeq[col] = val;
                        if (currentPage === 0) {
                          [16, 32, 48].forEach(offset => newSeq[col + offset] = val);
                        }
                        hasActiveSteps = true;
                      }
                    }
                    
                    if (hasActiveSteps) {
                      setSubBassSequence(newSeq);
                    }
                  }}
                  className="flex items-center gap-1 px-2 py-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded text-[10px] font-bold uppercase hover:bg-cyan-500/20 transition-colors ml-2"
                  title="Randomize Sub Params & Notes"
                >
                  <Wand2 size={12} />
                  Rand
                </button>
              </div>
              
              <div className="flex items-center gap-4 pl-[168px]">
                <div className="flex items-center gap-2 bg-zinc-950/50 px-2 py-1 rounded border border-zinc-800">
                  <span className="text-[10px] text-cyan-400 font-bold w-10">Cutoff</span>
                  <input 
                    type="range" 
                    min="20" 
                    max="1000" 
                    step="1" 
                    value={subBassSettings.cutoff} 
                    onChange={e => setSubBassSettings({...subBassSettings, cutoff: parseInt(e.target.value)})} 
                    className="w-20 accent-cyan-500" 
                  />
                  <span className="text-[10px] text-zinc-500 font-mono w-8">{subBassSettings.cutoff}</span>
                </div>
                <div className="flex items-center gap-2 bg-zinc-950/50 px-2 py-1 rounded border border-zinc-800">
                  <span className="text-[10px] text-cyan-400 font-bold w-10">Res</span>
                  <input 
                    type="range" 
                    min="0" 
                    max="20" 
                    step="0.1" 
                    value={subBassSettings.resonance} 
                    onChange={e => setSubBassSettings({...subBassSettings, resonance: parseFloat(e.target.value)})} 
                    className="w-20 accent-cyan-500" 
                  />
                </div>
                <div className="flex items-center gap-2 bg-zinc-950/50 px-2 py-1 rounded border border-zinc-800">
                  <span className="text-[10px] text-cyan-400 font-bold w-10">Decay</span>
                  <input 
                    type="range" 
                    min="0.05" 
                    max="2" 
                    step="0.01" 
                    value={subBassSettings.decay} 
                    onChange={e => setSubBassSettings({...subBassSettings, decay: parseFloat(e.target.value)})} 
                    className="w-20 accent-cyan-500" 
                  />
                </div>
                <div className="flex items-center gap-2 bg-zinc-950/50 px-2 py-1 rounded border border-zinc-800">
                  <span className="text-[10px] text-cyan-400 font-bold w-10">Env</span>
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.01" 
                    value={subBassSettings.envAmount} 
                    onChange={e => setSubBassSettings({...subBassSettings, envAmount: parseFloat(e.target.value)})} 
                    className="w-20 accent-cyan-500" 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
