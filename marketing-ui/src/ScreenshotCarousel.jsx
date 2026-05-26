import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import './ScreenshotCarousel.css';

function mod(n, len) {
  return ((n % len) + len) % len;
}

const REST = {
  left: { x: -175, scale: 0.84, opacity: 0.75, blur: 2, bright: 0.55, rotate: -4, z: 2 },
  center: { x: 0, scale: 1, opacity: 1, blur: 0, bright: 1, rotate: 0, z: 4 },
  right: { x: 175, scale: 0.84, opacity: 0.75, blur: 2, bright: 0.55, rotate: 4, z: 2 },
};

function applyRest(el, slot, active) {
  if (!el) return;
  const r = REST[slot];
  el.classList.toggle('screenshot-carousel__slide--active', active);
  gsap.set(el, {
    xPercent: -50,
    yPercent: -50,
    x: r.x,
    y: 0,
    scale: r.scale,
    rotateZ: r.rotate,
    opacity: r.opacity,
    zIndex: r.z,
    filter: `blur(${r.blur}px) brightness(${r.bright})`,
  });
}

export default function ScreenshotCarousel({
  images = [],
  intervalMs = 4500,
}) {
  const [centerIdx, setCenterIdx] = useState(0);
  const containerRef = useRef(null);
  const leftRef = useRef(null);
  const centerRef = useRef(null);
  const rightRef = useRef(null);
  const animatingRef = useRef(false);
  const len = images.length;

  const leftIdx = mod(centerIdx - 1, len);
  const rightIdx = mod(centerIdx + 1, len);

  const layoutRest = useCallback(() => {
    applyRest(leftRef.current, 'left', false);
    applyRest(centerRef.current, 'center', true);
    applyRest(rightRef.current, 'right', false);
  }, []);

  useLayoutEffect(() => {
    if (animatingRef.current) return;
    layoutRest();
  }, [centerIdx, layoutRest, len]);

  useEffect(() => {
    layoutRest();
  }, [layoutRest]);

  const advance = useCallback(() => {
    if (len < 2 || animatingRef.current) return;
    const left = leftRef.current;
    const center = centerRef.current;
    const right = rightRef.current;
    if (!left || !center || !right) return;

    animatingRef.current = true;
    const nextCenter = mod(centerIdx + 1, len);
    const nextRight = mod(nextCenter + 1, len);

    const tl = gsap.timeline({
      defaults: { ease: 'power2.inOut', duration: 0.95 },
      onComplete: () => {
        const setImg = (el, item) => {
          const img = el?.querySelector('img');
          if (img && item) {
            img.src = item.src;
            img.alt = item.alt;
          }
        };
        setImg(left, images[mod(nextCenter - 1, len)]);
        setImg(center, images[nextCenter]);
        setImg(right, images[nextRight]);
        applyRest(left, 'left', false);
        applyRest(center, 'center', true);
        applyRest(right, 'right', false);
        animatingRef.current = false;
        setCenterIdx(nextCenter);
      },
    });

    tl.to(
      left,
      {
        x: REST.left.x - 90,
        opacity: 0,
        scale: 0.76,
        filter: 'blur(5px) brightness(0.4)',
      },
      0,
    );

    tl.to(
      center,
      {
        x: REST.left.x,
        scale: REST.left.scale,
        rotateZ: REST.left.rotate,
        opacity: REST.left.opacity,
        filter: `blur(${REST.left.blur}px) brightness(${REST.left.bright})`,
        zIndex: REST.left.z,
      },
      0,
    );

    tl.to(
      right,
      {
        x: REST.center.x,
        scale: REST.center.scale,
        rotateZ: REST.center.rotate,
        opacity: 1,
        filter: 'blur(0px) brightness(1)',
        zIndex: REST.center.z,
      },
      0,
    );

    tl.add(() => {
      const incoming = images[nextRight];
      const img = right.querySelector('img');
      if (img && incoming) {
        img.src = incoming.src;
        img.alt = incoming.alt;
      }
      gsap.set(right, {
        xPercent: -50,
        yPercent: -50,
        x: REST.right.x + 72,
        scale: REST.right.scale * 0.96,
        rotateZ: REST.right.rotate,
        opacity: 0.35,
        filter: `blur(${REST.right.blur + 1}px) brightness(0.5)`,
        zIndex: REST.right.z,
      });
    });

    tl.to(
      right,
      {
        x: REST.right.x,
        scale: REST.right.scale,
        opacity: REST.right.opacity,
        filter: `blur(${REST.right.blur}px) brightness(${REST.right.bright})`,
      },
      '-=0.42',
    );
  }, [centerIdx, images, len]);

  useEffect(() => {
    if (len < 2) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const id = window.setInterval(advance, intervalMs);
    return () => window.clearInterval(id);
  }, [advance, intervalMs, len]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => {
      if (!animatingRef.current) layoutRest();
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [layoutRest]);

  if (len === 0) return null;

  return (
    <div
      className="screenshot-carousel"
      ref={containerRef}
      role="region"
      aria-roledescription="carousel"
      aria-label="App screenshots"
    >
      <div className="screenshot-carousel__stage">
        <div ref={leftRef} className="screenshot-carousel__slide" aria-hidden>
          <img src={images[leftIdx].src} alt={images[leftIdx].alt} loading="lazy" draggable={false} />
        </div>
        <div ref={centerRef} className="screenshot-carousel__slide screenshot-carousel__slide--active">
          <img src={images[centerIdx].src} alt={images[centerIdx].alt} loading="eager" draggable={false} />
        </div>
        <div ref={rightRef} className="screenshot-carousel__slide" aria-hidden>
          <img src={images[rightIdx].src} alt={images[rightIdx].alt} loading="lazy" draggable={false} />
        </div>
      </div>
    </div>
  );
}
