'use client';
import clsx from "classnames";
import React from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" };

export default function Button({ className, variant = "primary", ...props }: Props) {
  return (
    <button
      className={clsx(
        "px-4 py-2 rounded-2xl text-sm font-medium shadow-sm transition active:scale-[0.98]",
        variant === "primary" && "bg-black text-white hover:opacity-90",
        variant === "ghost" && "bg-gray-100 hover:bg-gray-200",
        variant === "danger" && "bg-red-600 text-white hover:bg-red-700",
        className
      )}
      {...props}
    />
  );
}
