import React, { useEffect, useMemo, useRef, useState } from "react";

function HoverMarqueeText({
  text = "",
  className = "",
  containerClassName = "",
  speedPxPerSecond = 40,
  alwaysRun = false,
  pauseAtStartMs = 1000,
}) {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const frameRef = useRef(null);
  const lastTimeRef = useRef(0);
  const cycleWidthRef = useRef(0);
  const offsetXRef = useRef(0);
  const pauseUntilRef = useRef(0);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [offsetX, setOffsetX] = useState(0);

  const normalizedText = useMemo(() => String(text ?? ""), [text]);
  const shouldAnimate = isOverflowing && (alwaysRun || isHovering);

  useEffect(() => {
    const measureOverflow = () => {
      const container = containerRef.current;
      const textEl = textRef.current;
      if (!container || !textEl) {
        setIsOverflowing(false);
        cycleWidthRef.current = 0;
        offsetXRef.current = 0;
        setOffsetX(0);
        return;
      }

      const textWidth = textEl.scrollWidth;
      const overflowWidth = Math.max(0, textWidth - container.clientWidth);
      cycleWidthRef.current = textWidth + 28;
      offsetXRef.current = 0;
      setIsOverflowing(overflowWidth > 4);
      setOffsetX(0);
    };

    measureOverflow();

    const resizeObserver = new ResizeObserver(() => {
      measureOverflow();
    });

    if (containerRef.current) resizeObserver.observe(containerRef.current);
    if (textRef.current) resizeObserver.observe(textRef.current);
    window.addEventListener("resize", measureOverflow);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", measureOverflow);
    };
  }, [normalizedText]);

  useEffect(() => {
    let resetFrameRef = null;

    if (!shouldAnimate) {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      const hadOffset = offsetXRef.current !== 0;
      offsetXRef.current = 0;
      pauseUntilRef.current = 0;
      lastTimeRef.current = 0;

      if (hadOffset) {
        resetFrameRef = requestAnimationFrame(() => {
          setOffsetX(0);
        });
      }

      return () => {
        if (resetFrameRef) {
          cancelAnimationFrame(resetFrameRef);
        }
      };
    }

    const run = (now) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = now;
      }

      if (pauseUntilRef.current > now) {
        lastTimeRef.current = now;
        frameRef.current = requestAnimationFrame(run);
        return;
      }

      const dt = now - lastTimeRef.current;
      lastTimeRef.current = now;

      const distance = (Number(speedPxPerSecond) || 40) * (dt / 1000);
      let next = offsetXRef.current - distance;
      const cycleWidth = cycleWidthRef.current;

      if (cycleWidth > 0 && next <= -cycleWidth) {
        next = 0;
        pauseUntilRef.current = now + (Number(pauseAtStartMs) || 1000);
      }

      offsetXRef.current = next;
      setOffsetX(next);

      frameRef.current = requestAnimationFrame(run);
    };

    const hadOffset = offsetXRef.current !== 0;
    offsetXRef.current = 0;
    pauseUntilRef.current = performance.now() + (Number(pauseAtStartMs) || 1000);
    lastTimeRef.current = 0;

    if (hadOffset) {
      resetFrameRef = requestAnimationFrame(() => {
        setOffsetX(0);
        frameRef.current = requestAnimationFrame(run);
      });
    } else {
      frameRef.current = requestAnimationFrame(run);
    }

    return () => {
      if (resetFrameRef) {
        cancelAnimationFrame(resetFrameRef);
      }
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [pauseAtStartMs, shouldAnimate, speedPxPerSecond]);

  return (
    <div
      ref={containerRef}
      className={`min-w-0 overflow-hidden whitespace-nowrap ${containerClassName}`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      title={normalizedText}
    >
      <span
        className="inline-flex items-center whitespace-nowrap will-change-transform"
        style={{ transform: `translateX(${offsetX}px)` }}
      >
        <span
          ref={textRef}
          className={`inline-block shrink-0 ${className}`}
        >
          {normalizedText}
        </span>
        {isOverflowing ? (
          <>
            <span className="inline-block w-7 shrink-0" aria-hidden="true" />
            <span className={`inline-block shrink-0 ${className}`} aria-hidden="true">
              {normalizedText}
            </span>
          </>
        ) : null}
      </span>
    </div>
  );
}

export default HoverMarqueeText;
