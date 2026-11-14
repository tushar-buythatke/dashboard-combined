import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { dotBitmap } from './dot-font';

interface DotMatrixProps {
  text?: string;
  className?: string;
  gap?: number;
  // 'mark' = compact ink wordmark: no background grid, solid legible dots.
  variant?: 'hero' | 'mark';
}

// Canvas dot field that spells `text`; dots ripple and swell toward the cursor.
export function DotMatrix({ text = 'hatke', className, gap = 11, variant = 'hero' }: DotMatrixProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let w = 0, h = 0, dpr = 1;
    let mask: Uint8Array = new Uint8Array(0);
    let cols = 0, rows = 0;
    let markGap = gap;
    let hovering = false;
    const mouse = { x: -9999, y: -9999 };

    const css = () => {
      const cs = getComputedStyle(document.documentElement);
      return {
        on: (cs.getPropertyValue('--e-coral').trim() || '#e5603f'),
        off: (cs.getPropertyValue('--e-line-2').trim() || 'rgba(0,0,0,.12)'),
        accent: (cs.getPropertyValue('--e-coral').trim() || '#e5603f'),
      };
    };
    let colors = css();

    const build = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width; h = rect.height;
      canvas.width = w * dpr; canvas.height = h * dpr;
      if (variant === 'mark') {
        const bm = dotBitmap(text);
        cols = bm.cols; rows = bm.rows;
        markGap = Math.min(h / rows, w / cols);
        mask = new Uint8Array(cols * rows);
        for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) mask[y * cols + x] = bm.on(x, y) ? 1 : 0;
        return;
      }
      cols = Math.floor(w / gap); rows = Math.floor(h / gap);

      const off = document.createElement('canvas');
      off.width = cols; off.height = rows;
      const o = off.getContext('2d')!;
      let size = rows * 0.95;
      o.font = `700 ${size}px 'Clash Display', 'Satoshi', sans-serif`;
      const tw = o.measureText(text).width;
      if (tw > cols * 0.9) size *= (cols * 0.9) / tw;
      o.font = `700 ${size}px 'Clash Display', 'Satoshi', sans-serif`;
      o.textAlign = 'center';
      o.textBaseline = 'middle';
      o.fillStyle = '#000';
      o.fillText(text, cols / 2, rows / 2 + size * 0.04);
      const data = o.getImageData(0, 0, cols, rows).data;
      mask = new Uint8Array(cols * rows);
      for (let i = 0; i < cols * rows; i++) mask[i] = data[i * 4 + 3] > 110 ? 1 : 0;
    };

    const draw = (t: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const g = variant === 'mark' ? markGap : gap;
      const ox = variant === 'mark' ? g / 2 : (w - cols * g) / 2 + g / 2;
      const oy = (h - rows * g) / 2 + g / 2;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const px = ox + x * g, py = oy + y * g;
          const on = mask[y * cols + x] === 1;
          if (variant === 'mark') {
            if (!on) continue;
            // A light band sweeps across the word on a loop; hover lights it all up.
            const band = reduce ? 0 : Math.max(0, 1 - Math.abs(x - (((t * 0.014) % (cols + 16)) - 8)) / 5);
            const lit = hovering ? 1 : band;
            ctx.globalAlpha = hovering ? 1 : 0.72 + 0.28 * band;
            ctx.shadowBlur = lit * g * 1.6;
            ctx.shadowColor = colors.on;
            ctx.fillStyle = colors.on;
            ctx.beginPath();
            ctx.arc(px, py, g * (0.42 + 0.06 * lit), 0, Math.PI * 2);
            ctx.fill();
            continue;
          }
          const wave = reduce ? 0.5 : (Math.sin(x * 0.22 - t * 0.0022 + y * 0.08) + 1) / 2;
          const d = Math.hypot(px - mouse.x, py - mouse.y);
          const near = Math.max(0, 1 - d / 120);
          let r = on ? gap * (0.2 + wave * 0.16) : gap * 0.09;
          r += near * gap * (on ? 0.14 : 0.18);
          ctx.globalAlpha = on ? 0.55 + wave * 0.45 : 0.55 + near * 0.45;
          ctx.fillStyle = on || near > 0.35 ? colors.on : colors.off;
          ctx.beginPath();
          ctx.arc(px, py, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      if (!reduce) raf = requestAnimationFrame(draw);
    };

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
      if (reduce) draw(0);
    };
    const onLeave = () => { mouse.x = mouse.y = -9999; hovering = false; if (reduce) draw(0); };
    const onEnter = () => { hovering = true; if (reduce) draw(0); };
    const ro = new ResizeObserver(() => { build(); if (reduce) draw(0); });
    const mo = new MutationObserver(() => { colors = css(); });

    ro.observe(canvas);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-accent-theme', 'style'] });
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerleave', onLeave);
    canvas.addEventListener('pointerenter', onEnter);
    // Rebuild once webfonts land so the glyph uses Clash Display.
    document.fonts?.ready.then(() => { build(); if (reduce) draw(0); });
    build();
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('pointerenter', onEnter);
    };
  }, [text, gap, variant]);

  return <canvas ref={ref} aria-hidden="true" className={cn('block h-full w-full', className)} />;
}
