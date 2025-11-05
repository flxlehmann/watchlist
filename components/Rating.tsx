'use client';
import React from "react";
import clsx from "classnames";

type Props = {
  value?: number;
  onChange?: (v: number) => void;
};

export default function Rating({ value = 0, onChange }: Props) {
  return (
    <div className="flex gap-1">
      {[0,1,2,3,4].map((i) => (
        <button
          key={i}
          type="button"
          aria-label={`Rate ${i+1}`}
          onClick={() => onChange?.(i + 1)}
          className={clsx("text-lg leading-none", (i+1) <= (value || 0) ? "opacity-100" : "opacity-30")}
        >★</button>
      ))}
      {value ? (
        <button type="button" className="text-xs ml-2 underline" onClick={() => onChange?.(0)}>clear</button>
      ) : null}
    </div>
  );
}
