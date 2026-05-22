import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import './ScreenshotCarousel.css';

/** Circular offset: -1 = previous (left), 0 = active, 1 = next (right). */
function offsetFromActive(index, active, length) {
  let d = index - active;
  if (d > length / 2) d -= length;
  if (d < -length / 2) d += length;
  return d;
}

export default function ScreenshotCarousel({
  images = [],
  intervalMs = 4000,
  slideWidth = 118,
  slideHeight = 242,
  gap = 18,
}) {
  const [active, setActive] = useState(0);
  const containerRef = useRef(null);
  const trackRef = useRef(null);
  const slideRefs = useRef([]);
  const tweenRef = useRef(null);
  const len = images.length;
  const step = slideWidth + gap;

  const applySlideStates = useCallback(
    (index, animate) => {
      slideRefs.current.forEach((el, i) => {
        if (!el) return;
        const d = offsetFromActive(i, index, len);
        const isActive = d === 0;
        const isNeighbor = Math.abs(d) === 1;

        el.classList.toggle('screenshot-carousel__slide--active', isActive);

        const vars = {
          scale: isActive ? 1 : 0.82,
          x: d * 10,
          y: isActive ? 0 : 6,
          rotateZ: d * -4,
          filter: isActive ? 'blur(0px) brightness(1)' : 'blur(3px) brightness(0.52)',
          opacity: isNeighbor || isActive ? 1 : 0,
          zIndex: isActive ? 3 : isNeighbor ? 2 : 0,
          duration: animate ? 0.85 : 0,
          ease: 'power3.inOut',
          overwrite: 'auto',
        };

        if (animate) gsap.to(el, vars);
        else gsap.set(el, vars);
      });
    },
    [len],
  );

  const moveTo = useCallback(
    (index, animate = true) => {
      const container = containerRef.current;
      const track = trackRef.current;
      if (!container || !track || len === 0) return;

      const centerX = container.clientWidth / 2 - slideWidth / 2 - index * step;

      if (tweenRef.current) tweenRef.current.kill();
      if (animate) {
        tweenRef.current = gsap.to(track, {
          x: centerX,
          duration: 0.85,
          ease: 'power3.inOut',
        });
      } else {
        gsap.set(track, { x: centerX });
      }

      applySlideStates(index, animate);
    },
    [applySlideStates, len, slideWidth, step],
  );

  const didMount = useRef(false);

  useEffect(() => {
    moveTo(active, didMount.current);
    didMount.current = true;
  }, [active, moveTo]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => moveTo(active, false));
    ro.observe(container);
    return () => ro.disconnect();
  }, [active, moveTo]);

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
      <div className="screenshot-carousel__track" ref={trackRef}>
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
              marginRight: i < len - 1 ? gap : 0,
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
