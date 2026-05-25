import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import './ScreenshotCarousel.css';

/** Shortest circular distance: -2 exit left, -1 left, 0 active, 1 right, 2 enter right. */
function offsetFromActive(index, active, length) {
  let d = index - active;
  const half = length / 2;
  if (d >= half) d -= length;
  if (d < -half) d += length;
  return d;
}

const SLOT_X = {
  '-2': -168,
  '-1': -82,
  0: 0,
  1: 82,
  2: 168,
};

function stateForOffset(d) {
  if (d === 0) {
    return {
      x: SLOT_X[0],
      y: 0,
      scale: 1,
      rotateZ: 0,
      filter: 'blur(0px) brightness(1)',
      opacity: 1,
      zIndex: 4,
      active: true,
    };
  }
  if (d === -1 || d === 1) {
    return {
      x: SLOT_X[d],
      y: 8,
      scale: 0.86,
      rotateZ: d * -5,
      filter: 'blur(2px) brightness(0.58)',
      opacity: 0.9,
      zIndex: d === -1 ? 2 : 3,
      active: false,
    };
  }
  if (d === -2) {
    return {
      x: SLOT_X[-2],
      y: 10,
      scale: 0.74,
      rotateZ: 6,
      filter: 'blur(4px) brightness(0.4)',
      opacity: 0,
      zIndex: 1,
      active: false,
    };
  }
  if (d === 2) {
    return {
      x: SLOT_X[1] + 36,
      y: 8,
      scale: 0.84,
      rotateZ: -5,
      filter: 'blur(2px) brightness(0.58)',
      opacity: 0.88,
      zIndex: 3,
      active: false,
    };
  }
  return {
    x: SLOT_X[d] ?? 0,
    y: 12,
    scale: 0.7,
    rotateZ: 0,
    filter: 'blur(4px) brightness(0.35)',
    opacity: 0,
    zIndex: 0,
    active: false,
  };
}

export default function ScreenshotCarousel({
  images = [],
  intervalMs = 4000,
  slideWidth = 124,
  slideHeight = 252,
}) {
  const [active, setActive] = useState(0);
  const containerRef = useRef(null);
  const slideRefs = useRef([]);
  const len = images.length;

  const applySlideStates = useCallback(
    (activeIndex, animate) => {
      const duration = animate ? 0.9 : 0;
      const ease = 'power3.inOut';

      slideRefs.current.forEach((el, i) => {
        if (!el) return;
        const d = offsetFromActive(i, activeIndex, len);
        const target = stateForOffset(d);
        const visible = Math.abs(d) <= 2;

        el.classList.toggle('screenshot-carousel__slide--active', target.active);
        el.style.visibility = visible ? 'visible' : 'hidden';
        el.style.pointerEvents = visible ? 'auto' : 'none';

        const vars = {
          xPercent: -50,
          yPercent: -50,
          x: target.x,
          y: target.y,
          scale: target.scale,
          rotateZ: target.rotateZ,
          filter: target.filter,
          opacity: target.opacity,
          zIndex: target.zIndex,
          duration,
          ease,
          overwrite: 'auto',
        };

        if (!animate) {
          gsap.set(el, vars);
          return;
        }

        if (d === 2) {
          gsap.fromTo(
            el,
            {
              xPercent: -50,
              yPercent: -50,
              x: SLOT_X[1] + 72,
              y: target.y,
              scale: 0.72,
              rotateZ: -8,
              filter: 'blur(5px) brightness(0.42)',
              opacity: 0,
              zIndex: target.zIndex,
            },
            vars,
          );
          return;
        }

        if (d === -2) {
          gsap.to(el, {
            ...vars,
            opacity: 0,
            x: SLOT_X[-2] - 24,
            scale: 0.68,
            filter: 'blur(5px) brightness(0.35)',
          });
          return;
        }

        gsap.to(el, vars);
      });
    },
    [len],
  );

  const didMount = useRef(false);

  useEffect(() => {
    applySlideStates(active, didMount.current);
    didMount.current = true;
  }, [active, applySlideStates]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => applySlideStates(active, false));
    ro.observe(container);
    return () => ro.disconnect();
  }, [active, applySlideStates]);

  useEffect(() => {
    if (len < 2) return undefined;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return undefined;

    const id = window.setInterval(() => {
      setActive((prev) => (prev + 1) % len);
    }, intervalMs);

    return () => window.clearInterval(id);
  }, [intervalMs, len]);

  if (len === 0) return null;

  return (
    <div
      className="screenshot-carousel"
      ref={containerRef}
      role="region"
      aria-roledescription="carousel"
      aria-label="App screenshots"
    >
      <div
        className="screenshot-carousel__stage"
        style={{ width: slideWidth, height: slideHeight }}
      >
        {images.map((img, i) => (
          <div
            key={img.src}
            ref={(el) => {
              slideRefs.current[i] = el;
            }}
            className="screenshot-carousel__slide"
            style={{
              width: slideWidth,
              height: slideHeight,
            }}
            aria-hidden={offsetFromActive(i, active, len) !== 0}
          >
            <img src={img.src} alt={img.alt} loading="lazy" draggable={false} />
          </div>
        ))}
      </div>
    </div>
  );
}
