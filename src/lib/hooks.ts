import { useEffect, useRef, useState } from "react";

export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function useInterval(cb: () => void, delay: number | null): void {
  const ref = useRef(cb);
  useEffect(() => {
    ref.current = cb;
  }, [cb]);
  useEffect(() => {
    if (delay === null) return;
    const t = window.setInterval(() => ref.current(), delay);
    return () => window.clearInterval(t);
  }, [delay]);
}

const p2 = (n: number) => String(n).padStart(2, "0");

export const fmtClock = (d: Date) =>
  `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;

export const fmtDate = (d: Date) =>
  `${p2(d.getDate())}.${p2(d.getMonth() + 1)}.${d.getFullYear()}`;

export function fmtDur(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${p2(Math.floor(s / 3600))}:${p2(Math.floor((s % 3600) / 60))}:${p2(s % 60)}`;
}

export const rand = (a: number, b: number) => a + Math.random() * (b - a);
export const randInt = (a: number, b: number) => Math.floor(rand(a, b + 1));
