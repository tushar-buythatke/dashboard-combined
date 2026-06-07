import { useEffect, useState } from 'react';
import SolarFlare from './SolarFlare';
import VortexTwist from './VortexTwist';
import DottedSurface from './DottedSurface';
import HorizonGlow from './HorizonGlow';
import FlowField from './FlowField';
import NeonHighway from './NeonHighway';
import WaveColumns from './WaveColumns';
import DitherStudio from './DitherStudio';

export { SolarFlare, VortexTwist, DottedSurface, HorizonGlow, FlowField, NeonHighway, WaveColumns, DitherStudio };
export { default as Particles } from './FlowField';
export type { SolarFlareProps } from './SolarFlare';
export type { VortexTwistProps } from './VortexTwist';
export type { DottedSurfaceProps, DottedShape } from './DottedSurface';
export type { HorizonGlowProps } from './HorizonGlow';
export type { FlowFieldProps } from './FlowField';
export type { NeonHighwayProps } from './NeonHighway';
export type { WaveColumnsProps, WaveColumnsTheme } from './WaveColumns';
export type { DitherStudioProps, DitherMode, BayerLevel, MediaType, ObjectFit, ColorTheme } from './DitherStudio';

export type BackgroundEffect =
  | 'solar'
  | 'vortex'
  | 'dotted'
  | 'horizon-light'
  | 'horizon-pink'
  | 'horizon-dark'
  | 'particles'
  | 'neon'
  | 'wave-columns'
  | 'dither-studio';

const LIGHT_POOL: BackgroundEffect[] = ['dotted', 'horizon-light', 'horizon-pink', 'particles', 'dither-studio'];
const DARK_POOL: BackgroundEffect[] = ['solar', 'vortex', 'horizon-dark', 'neon', 'wave-columns'];

const STORAGE_KEY_PREFIX = 'bg-effect-queue';

let cachedPick: { ts: number; key: string; effect: BackgroundEffect } | null = null;

function pickFromPool(pool: BackgroundEffect[], storageKey: string): BackgroundEffect {
  if (typeof window === 'undefined' || pool.length === 0) return pool[0] ?? 'dotted';
  const now = Date.now();
  if (cachedPick && cachedPick.key === storageKey && now - cachedPick.ts < 1500) {
    return cachedPick.effect;
  }
  let queue: BackgroundEffect[] = [];
  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed.every((e) => pool.includes(e))) {
        queue = parsed;
      }
    }
  } catch {
    /* ignore */
  }
  if (queue.length === 0) {
    queue = [...pool];
    for (let i = queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [queue[i], queue[j]] = [queue[j], queue[i]];
    }
  }
  const pick = queue.shift() ?? pool[0];
  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(queue));
  } catch {
    /* ignore */
  }
  cachedPick = { ts: now, key: storageKey, effect: pick };
  return pick;
}

function useTheme(): 'light' | 'dark' {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof document === 'undefined') return 'light';
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  });
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const update = () => setTheme(root.classList.contains('dark') ? 'dark' : 'light');
    update();
    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  return theme;
}

function renderEffect(effect: BackgroundEffect, className?: string) {
  switch (effect) {
    case 'solar':
      return (
        <SolarFlare
          className={className}
          speed={1}
          translateX={1}
          translateY={1}
          intensity={2}
          spread={10}
          pulseRate={0.6}
          colorR={1}
          colorG={0.4}
          colorB={0.2}
        />
      );
    case 'vortex':
      return (
        <VortexTwist
          className={className}
          speed={1}
          backgroundColor="#000000"
          direction="clockwise"
          rotation={0}
          translateX={0}
          translateY={0}
          twist={9}
          zoom={5}
          intensity={0.1}
          colorR={0}
          colorG={0.1}
          colorB={0.2}
          frequency={0.61}
        />
      );
    case 'dotted':
      return (
        <DottedSurface
          className={className}
          dotColor="#475569"
          shape="circle"
          speed={0.1}
          waveAmplitude={50}
          waveFreqX={0.3}
          waveFreqY={0.5}
          pointSize={5}
          separation={90}
          gridX={50}
          gridY={220}
          opacity={0.32}
          cameraHeight={-555}
          cameraDistance={-1220}
          fov={60}
        />
      );
    case 'horizon-light':
      return (
        <HorizonGlow
          className={className}
          speed={0.4}
          backgroundColor="#D88BB0"
          frequency={1.3}
          amplitude={0.5}
          intensity={0.18}
          rotation={0}
          translateX={-0.35}
          translateY={-0.05}
        />
      );
    case 'horizon-dark':
      return (
        <HorizonGlow
          className={className}
          speed={0.5}
          backgroundColor="#000000"
          frequency={1}
          amplitude={0.2}
          intensity={0.13}
          rotation={0}
          translateX={0}
          translateY={0}
        />
      );
    case 'horizon-pink':
      return (
        <HorizonGlow
          className={className}
          speed={2.5}
          backgroundColor="#EC4899"
          frequency={2}
          amplitude={0.16}
          intensity={0.13}
          rotation={0}
          translateX={0}
          translateY={0}
        />
      );
    case 'particles':
      return (
        <FlowField
          className={className}
          scale={0.001}
          cellSize={20}
          radius={3}
          fieldSpeed={0.0005}
          particleSpeed={2}
          particleCount={600}
          backgroundColor="#6366F1"
          particleColor="#FEF08A"
        />
      );
    case 'neon':
      return (
        <NeonHighway
          className={className}
          speed={1.7}
          backgroundColor="#000000"
          translateX={3.4}
          translateY={1}
          zoom={0.41}
          intensity={0.9}
          roadWidth={0.45}
          waveFrequency={1.4}
          colorR={0.27}
          colorG={0.3}
          colorB={0.6}
          rotation={0}
        />
      );
    case 'wave-columns':
      return (
        <WaveColumns
          className={className}
          speed={2.2}
          theme="fire"
          rotation={0}
          translateX={1.2}
          translateY={0.2}
          scale={0.25}
          amplitude={1}
          waveCount={1}
        />
      );
    case 'dither-studio':
      return (
        <DitherStudio
          className={className}
          mediaType="image"
          ditherMode="bayer"
          colorTheme="colorful"
          bayerLevel={8}
          source="/data/vegeta.png"
          brightness={0}
          contrast={0}
          highlights={0}
          midtones={0}
          blur={0}
          objectFit="contain"
          pixelSize={1}
          mouseInteraction={false}
          mouseRadius={120}
        />
      );
  }
}

export interface RandomBackgroundProps {
  effect?: BackgroundEffect;
  className?: string;
}

export function RandomBackground({ effect, className }: RandomBackgroundProps) {
  const theme = useTheme();
  const pool = theme === 'light' ? LIGHT_POOL : DARK_POOL;
  const storageKey = `${STORAGE_KEY_PREFIX}-${theme}`;
  const [chosen, setChosen] = useState<BackgroundEffect>(() => {
    if (effect) return effect;
    return pickFromPool(pool, storageKey);
  });

  useEffect(() => {
    if (effect) {
      setChosen(effect);
      return;
    }
    setChosen((prev) => {
      if (prev && pool.includes(prev)) return prev;
      return pickFromPool(pool, storageKey);
    });
  }, [theme, effect, pool, storageKey]);

  return (
    <div
      aria-hidden="true"
      data-bg-theme={theme}
      data-bg-effect={chosen}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        background: theme === 'dark' ? '#020617' : '#fafafa',
      }}
    >
      {renderEffect(chosen, className)}
    </div>
  );
}

export default RandomBackground;
