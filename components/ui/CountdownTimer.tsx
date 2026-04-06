"use client";

import {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";

interface CountdownTimerProps {
  minutes: number;
  onExpire?: () => void;
  onTick?: (secondsLeft: number) => void;
}

export interface CountdownTimerHandle {
  reset: (minutes?: number) => void;
}

function fmt(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

const CountdownTimer = forwardRef<CountdownTimerHandle, CountdownTimerProps>(
  ({ minutes, onExpire, onTick }, ref) => {
    const [timeLeft, setTimeLeft] = useState(minutes * 60);
    const timeLeftRef = useRef(minutes * 60);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const onExpireRef = useRef(onExpire);
    const onTickRef = useRef(onTick);
    onExpireRef.current = onExpire;
    onTickRef.current = onTick;

    const start = (secs: number) => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      timeLeftRef.current = secs;
      setTimeLeft(secs);
      intervalRef.current = setInterval(() => {
        timeLeftRef.current -= 1;
        const next = timeLeftRef.current;
        setTimeLeft(next);
        onTickRef.current?.(next);
        if (next <= 0) {
          clearInterval(intervalRef.current!);
          onExpireRef.current?.();
        }
      }, 1000);
    };

    useImperativeHandle(ref, () => ({
      reset: (m = minutes) => start(m * 60),
    }));

    useEffect(() => {
      start(minutes * 60);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <span
        className={`text-2xl font-bold tabular-nums ${
          timeLeft <= 10 ? "text-red-500" : "text-blue-500"
        }`}
      >
        {fmt(timeLeft)}
      </span>
    );
  },
);

CountdownTimer.displayName = "CountdownTimer";
export default CountdownTimer;
