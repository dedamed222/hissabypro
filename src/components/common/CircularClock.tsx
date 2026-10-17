import React, { useState, useEffect } from "react";
import { useLocale } from "@/hooks/useLocale";

interface CircularClockProps {
  size?: number; // diameter in pixels (default: 34)
  showDigital?: boolean;
  showDate?: boolean;
  className?: string;
  variant?: "header" | "card" | "compact";
}

export const CircularClock: React.FC<CircularClockProps> = ({
  size = 34,
  showDigital = true,
  showDate = false,
  className = "",
  variant = "header",
}) => {
  const { locale } = useLocale();
  const isAr = locale === "ar";
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    // Update every second
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = time.getHours();
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();

  // Analog hands angles in degrees
  const hourAngle = ((hours % 12) + minutes / 60 + seconds / 3600) * 30; // 360 / 12
  const minuteAngle = (minutes + seconds / 60) * 6; // 360 / 60
  const secondAngle = seconds * 6; // 360 / 60

  // Formatted digital time
  const formattedHours = hours.toString().padStart(2, "0");
  const formattedMinutes = minutes.toString().padStart(2, "0");
  const formattedSeconds = seconds.toString().padStart(2, "0");

  // Formatted date string
  const formattedDate = time.toLocaleDateString(isAr ? "ar-MR" : "fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  const isHeader = variant === "header";

  return (
    <div
      className={`flex items-center gap-2 select-none ${
        isHeader
          ? "bg-white/10 hover:bg-white/15 backdrop-blur-md px-2.5 py-1 rounded-xl border border-white/15 transition-all text-white"
          : "bg-white px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-xs text-slate-800"
      } ${className}`}
      title={`${time.toLocaleTimeString()} - ${time.toLocaleDateString()}`}
    >
      {/* ── Circular Analog Clock Face ── */}
      <div
        className="relative flex items-center justify-center shrink-0 drop-shadow-xs"
        style={{ width: size, height: size }}
      >
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full transform -rotate-90 overflow-visible"
        >
          {/* Dial Face Background */}
          <circle
            cx="50"
            cy="50"
            r="47"
            className={
              isHeader
                ? "fill-white/90 stroke-blue-200"
                : "fill-slate-50 stroke-slate-200"
            }
            strokeWidth="3"
          />

          {/* 12 Hour Ticks */}
          {[...Array(12)].map((_, i) => {
            const angle = (i * 30 * Math.PI) / 180;
            const isMajor = i % 3 === 0;
            const r1 = 44;
            const r2 = isMajor ? 36 : 40;
            const x1 = 50 + r1 * Math.cos(angle);
            const y1 = 50 + r1 * Math.sin(angle);
            const x2 = 50 + r2 * Math.cos(angle);
            const y2 = 50 + r2 * Math.sin(angle);
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={isMajor ? "#0047cc" : "#94a3b8"}
                strokeWidth={isMajor ? "3" : "1.75"}
                strokeLinecap="round"
              />
            );
          })}

          {/* Hour Hand */}
          <line
            x1="50"
            y1="50"
            x2={50 + 26 * Math.cos((hourAngle * Math.PI) / 180)}
            y2={50 + 26 * Math.sin((hourAngle * Math.PI) / 180)}
            stroke="#1e293b"
            strokeWidth="4"
            strokeLinecap="round"
          />

          {/* Minute Hand */}
          <line
            x1="50"
            y1="50"
            x2={50 + 36 * Math.cos((minuteAngle * Math.PI) / 180)}
            y2={50 + 36 * Math.sin((minuteAngle * Math.PI) / 180)}
            stroke="#0284c7"
            strokeWidth="2.75"
            strokeLinecap="round"
          />

          {/* Second Hand (Vibrant Red with Counterweight) */}
          <line
            x1={50 - 9 * Math.cos((secondAngle * Math.PI) / 180)}
            y1={50 - 9 * Math.sin((secondAngle * Math.PI) / 180)}
            x2={50 + 41 * Math.cos((secondAngle * Math.PI) / 180)}
            y2={50 + 41 * Math.sin((secondAngle * Math.PI) / 180)}
            stroke="#ef4444"
            strokeWidth="1.5"
            strokeLinecap="round"
          />

          {/* Center Pivot Point */}
          <circle cx="50" cy="50" r="3.5" fill="#ef4444" />
          <circle cx="50" cy="50" r="1.5" fill="#ffffff" />
        </svg>
      </div>

      {/* ── Digital Time & Optional Date ── */}
      {showDigital && (
        <div className="flex flex-col justify-center leading-tight">
          <div className="flex items-center gap-0.5 font-mono font-bold tracking-tight text-xs">
            <span>{formattedHours}</span>
            <span className="animate-pulse text-amber-300 font-black">:</span>
            <span>{formattedMinutes}</span>
            <span className="animate-pulse text-amber-300 font-black">:</span>
            <span
              className={
                isHeader ? "text-cyan-300 text-[11px]" : "text-blue-600 text-[11px]"
              }
            >
              {formattedSeconds}
            </span>
          </div>

          {showDate && (
            <span
              className={`text-[9.5px] font-medium capitalize truncate ${
                isHeader ? "text-blue-100/80" : "text-slate-500"
              }`}
            >
              {formattedDate}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default CircularClock;
