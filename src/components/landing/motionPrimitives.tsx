import React, { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { cn } from "../../lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

export function Reveal({
  children,
  className,
  delay = 0,
  y = 28,
  once = true,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  once?: boolean;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: reduce ? 0 : y, filter: reduce ? "none" : "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once, margin: "-80px" }}
      transition={{ duration: reduce ? 0.01 : 0.85, delay: reduce ? 0 : delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

export function WordReveal({ text, className }: { text: string; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <span className={cn("inline-flex flex-wrap gap-x-[0.28em]", className)} aria-label={text}>
      {text.split(" ").map((word, index) => (
        <motion.span
          key={`${word}-${index}`}
          aria-hidden="true"
          initial={{ opacity: 0, y: reduce ? 0 : 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: reduce ? 0.01 : 0.7, delay: reduce ? 0 : index * 0.045, ease: EASE }}
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
}

export function AmbientParticles({ count = 18 }: { count?: number }) {
  const reduce = useReducedMotion();
  const particles = Array.from({ length: count }, (_, index) => ({
    left: `${(index * 47) % 100}%`,
    top: `${(index * 67) % 100}%`,
    size: 2 + (index % 3),
    delay: (index % 8) * 0.75,
    duration: 8 + (index % 5) * 1.2,
  }));
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {particles.map((particle, index) => (
        <motion.span
          key={index}
          className="absolute rounded-full bg-[#20CBE5]/60 shadow-[0_0_16px_rgba(32,203,229,0.55)]"
          style={{ left: particle.left, top: particle.top, width: particle.size, height: particle.size }}
          animate={reduce ? undefined : { y: [0, -18, 0], opacity: [0.15, 0.7, 0.15], scale: [0.8, 1.2, 0.8] }}
          transition={reduce ? undefined : { duration: particle.duration, delay: particle.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

export function PointerTilt({ children, className }: { children: React.ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [4, -4]), { stiffness: 180, damping: 24 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-5, 5]), { stiffness: 180, damping: 24 });

  useEffect(() => {
    if (reduce || typeof window === "undefined") return;
    const query = window.matchMedia("(pointer: fine)");
    const sync = () => setEnabled(query.matches);
    sync();
    query.addEventListener?.("change", sync);
    return () => query.removeEventListener?.("change", sync);
  }, [reduce]);

  const onMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!enabled || !ref.current) return;
    const bounds = ref.current.getBoundingClientRect();
    x.set((event.clientX - bounds.left) / bounds.width - 0.5);
    y.set((event.clientY - bounds.top) / bounds.height - 0.5);
  };

  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      className={cn("[transform-style:preserve-3d]", className)}
      style={enabled ? { rotateX, rotateY } : undefined}
      onMouseMove={onMove}
      onMouseLeave={reset}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const reduce = useReducedMotion();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (reduce) {
      setDisplay(value);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / 1300, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reduce, value]);

  return <>{display.toLocaleString()}{suffix}</>;
}
