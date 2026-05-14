"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type AutoScaleOptions = {
  /** scale min/max pour éviter un zoom absurde */
  minScale?: number;
  maxScale?: number;
  /** padding interne du conteneur (px) */
  padding?: number;
};

/**
 * Auto-scale robuste (hooks toujours appelés dans le même ordre).
 * - Fit largeur (priorité) pour éviter scroll horizontal quand possible.
 * - Ne force pas le fit hauteur (sinon ça rend illisible quand beaucoup de lignes).
 */
export function useAutoScale(
  containerRef: React.RefObject<HTMLElement | null>,
  contentRef: React.RefObject<HTMLElement | null>,
  opts?: AutoScaleOptions,
) {
  const options = useMemo(
    () => ({
      minScale: opts?.minScale ?? 0.6,
      maxScale: opts?.maxScale ?? 1,
      padding: opts?.padding ?? 16,
    }),
    [opts?.minScale, opts?.maxScale, opts?.padding],
  );

  const rafRef = useRef<number | null>(null);
  const [scale, setScale] = useState<number>(1);

  useEffect(() => {
    const elC = containerRef.current;
    const elX = contentRef.current;
    if (!elC || !elX) return;

    const compute = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      rafRef.current = requestAnimationFrame(() => {
        const cw = elC.clientWidth - options.padding * 2;
        const declaredWidth = Number(elX.dataset.fitWidth || 0);
        const contentW = declaredWidth > 0 ? declaredWidth : elX.scrollWidth || elX.clientWidth;

        if (cw <= 0 || contentW <= 0) return;

        const next = cw / contentW;
        const clamped = Math.max(options.minScale, Math.min(options.maxScale, next));

        setScale((prev) => {
          // évite le bruit à 0.001 près
          return Math.abs(prev - clamped) > 0.002 ? clamped : prev;
        });
      });
    };

    compute();

    const ro = new ResizeObserver(() => compute());
    ro.observe(elC);
    ro.observe(elX);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [containerRef, contentRef, options]);

  return scale;
}
