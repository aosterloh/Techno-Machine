import React, { useRef, useEffect, useState } from 'react';
import { Camera, SlidersHorizontal, Loader2 } from 'lucide-react';

interface Point { x: number; y: number; }

interface Props {
  onGridUpdate: (grid: boolean[][]) => void;
}

export function WebcamCapture({ onGridUpdate }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  
  // Sliders for sensitivity
  const [darknessThreshold, setDarknessThreshold] = useState(100);
  const [fillThreshold, setFillThreshold] = useState(20);

  // 4 corners of the grid
  const [corners, setCorners] = useState<Point[]>([
    { x: 100, y: 150 },
    { x: 700, y: 150 },
    { x: 700, y: 450 },
    { x: 100, y: 450 },
  ]);

  const draggingCornerRef = useRef<number | null>(null);
  const cornersRef = useRef(corners);
  const thresholdsRef = useRef({ darknessThreshold, fillThreshold });
  const lastGridRef = useRef<string>("");

  useEffect(() => { cornersRef.current = corners; }, [corners]);
  useEffect(() => { thresholdsRef.current = { darknessThreshold, fillThreshold }; }, [darknessThreshold, fillThreshold]);

  useEffect(() => {
    async function setupWebcam() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(e => console.error("Video play error:", e));
          };
        }
        setHasPermission(true);
      } catch (err) {
        console.error("Error accessing webcam:", err);
        setHasPermission(false);
      }
    }
    setupWebcam();
    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Bilinear interpolation for grid mapping
  const getPoint = (u: number, v: number, pts: Point[]) => {
    const p0 = pts[0]; // top-left
    const p1 = pts[1]; // top-right
    const p2 = pts[2]; // bottom-right
    const p3 = pts[3]; // bottom-left

    const topX = p0.x + (p1.x - p0.x) * u;
    const topY = p0.y + (p1.y - p0.y) * u;
    const bottomX = p3.x + (p2.x - p3.x) * u;
    const bottomY = p3.y + (p2.y - p3.y) * u;

    const x = topX + (bottomX - topX) * v;
    const y = topY + (bottomY - topY) * v;
    return { x, y };
  };

  useEffect(() => {
    let animationFrameId: number;

    const draw = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) {
        animationFrameId = requestAnimationFrame(draw);
        return;
      }

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      // Zoom 30% by cropping the video source when drawing to canvas
      const zoom = 1.3;
      const sw = video.videoWidth / zoom;
      const sh = video.videoHeight / zoom;
      const sx = (video.videoWidth - sw) / 2;
      const sy = (video.videoHeight - sh) / 2;

      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

      const currentCorners = cornersRef.current;
      const { darknessThreshold, fillThreshold } = thresholdsRef.current;

      // Draw grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      
      for (let c = 0; c <= 16; c++) {
        const top = getPoint(c/16, 0, currentCorners);
        const bottom = getPoint(c/16, 1, currentCorners);
        ctx.beginPath();
        ctx.moveTo(top.x, top.y);
        ctx.lineTo(bottom.x, bottom.y);
        ctx.stroke();
      }
      for (let r = 0; r <= 8; r++) {
        const left = getPoint(0, r/8, currentCorners);
        const right = getPoint(1, r/8, currentCorners);
        ctx.beginPath();
        ctx.moveTo(left.x, left.y);
        ctx.lineTo(right.x, right.y);
        ctx.stroke();
      }

      // Detect stones
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const newGrid = Array(8).fill(null).map(() => Array(16).fill(false));

      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 16; c++) {
          const u = (c + 0.5) / 16;
          const v = (r + 0.5) / 8;
          const pt = getPoint(u, v, currentCorners);
          
          let darkCount = 0;
          let totalCount = 0;
          const radius = 4; // Sample a 9x9 box around center
          
          for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
              const px = Math.floor(pt.x + dx);
              const py = Math.floor(pt.y + dy);
              if (px >= 0 && px < canvas.width && py >= 0 && py < canvas.height) {
                const i = (py * canvas.width + px) * 4;
                const brightness = (data[i] + data[i+1] + data[i+2]) / 3;
                if (brightness < darknessThreshold) darkCount++;
                totalCount++;
              }
            }
          }

          const isStone = (darkCount / totalCount) * 100 > fillThreshold;
          newGrid[r][c] = isStone;

          if (isStone) {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(239, 68, 68, 0.9)'; // Red dot
            ctx.fill();
          }
        }
      }

      // Draw draggable corners
      currentCorners.forEach((c) => {
        ctx.beginPath();
        ctx.arc(c.x, c.y, 12, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(16, 185, 129, 0.5)';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#10b981';
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(c.x, c.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
      });

      // Only update state if grid changed
      const gridStr = JSON.stringify(newGrid);
      if (gridStr !== lastGridRef.current) {
        lastGridRef.current = gridStr;
        onGridUpdate(newGrid);
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationFrameId);
  }, [onGridUpdate]);

  const handleMouseEvent = (e: React.MouseEvent | React.TouchEvent, type: 'down' | 'move' | 'up') => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    
    if ('touches' in e) {
      if (e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        return; // Touch end
      }
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    if (type === 'down') {
      const cornerIdx = corners.findIndex(c => Math.hypot(c.x - x, c.y - y) < 40);
      if (cornerIdx !== -1) {
        draggingCornerRef.current = cornerIdx;
      }
    } else if (type === 'move') {
      if (draggingCornerRef.current !== null) {
        const newCorners = [...corners];
        newCorners[draggingCornerRef.current] = { x, y };
        setCorners(newCorners);
      }
    } else if (type === 'up') {
      draggingCornerRef.current = null;
    }
  };

  return (
    <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 flex flex-col gap-4">
      <div className="flex items-center gap-2 text-zinc-400">
        <Camera size={18} />
        <h2 className="text-sm font-semibold uppercase tracking-wider">Scanner</h2>
      </div>

      <div className="text-sm text-zinc-300 bg-zinc-800/50 p-3 rounded-lg border border-zinc-700/50">
        <p className="font-medium text-emerald-400 mb-1">Instructions:</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Hold the printed grid up to the camera.</li>
          <li>Drag the 4 green markers to align with the corners of the 16x8 grid.</li>
          <li>Red dots will appear on recognized black stones.</li>
        </ol>
      </div>

      <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3] flex items-center justify-center border border-zinc-700 touch-none">
        {hasPermission === false && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 text-zinc-400 p-4 text-center text-sm">
            Camera permission denied. Please allow camera access.
          </div>
        )}
        {hasPermission === null && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 text-zinc-400 p-4 text-center text-sm gap-3">
            <Loader2 className="animate-spin text-emerald-500" size={24} />
            Requesting camera permission...
          </div>
        )}
        {hasPermission === true && !isVideoReady && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 text-zinc-400 p-4 text-center text-sm gap-3">
            <Loader2 className="animate-spin text-emerald-500" size={24} />
            Starting video feed...
          </div>
        )}
        
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          onCanPlay={() => setIsVideoReady(true)}
          className="absolute opacity-0 pointer-events-none w-1 h-1" 
        />
        <canvas 
          ref={canvasRef} 
          width={800} 
          height={600}
          className={`w-full h-full object-contain cursor-crosshair transition-opacity duration-300 ${isVideoReady ? 'opacity-100' : 'opacity-0'}`}
          onMouseDown={(e) => handleMouseEvent(e, 'down')}
          onMouseMove={(e) => handleMouseEvent(e, 'move')}
          onMouseUp={(e) => handleMouseEvent(e, 'up')}
          onMouseLeave={(e) => handleMouseEvent(e, 'up')}
          onTouchStart={(e) => handleMouseEvent(e, 'down')}
          onTouchMove={(e) => handleMouseEvent(e, 'move')}
          onTouchEnd={(e) => handleMouseEvent(e, 'up')}
        />
      </div>

      <div className="space-y-4 bg-zinc-950/50 p-4 rounded-xl border border-zinc-800">
        <div className="flex items-center gap-2 text-zinc-400 mb-2">
          <SlidersHorizontal size={16} />
          <h3 className="text-xs font-bold uppercase tracking-wider">Sensitivity</h3>
        </div>
        
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-zinc-400">
            <span>Darkness Threshold</span>
            <span>{darknessThreshold}</span>
          </div>
          <input
            type="range"
            min="0"
            max="255"
            value={darknessThreshold}
            onChange={(e) => setDarknessThreshold(parseInt(e.target.value))}
            className="w-full accent-emerald-500"
          />
          <p className="text-[10px] text-zinc-500">Lower = must be darker to trigger</p>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs text-zinc-400">
            <span>Stone Size/Fill</span>
            <span>{fillThreshold}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={fillThreshold}
            onChange={(e) => setFillThreshold(parseInt(e.target.value))}
            className="w-full accent-emerald-500"
          />
          <p className="text-[10px] text-zinc-500">Lower = triggers on smaller specks</p>
        </div>
      </div>
    </div>
  );
}
