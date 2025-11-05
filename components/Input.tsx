'use client';
import React from "react";
import clsx from "classnames";

type Props = React.InputHTMLAttributes<HTMLInputElement>;

export default function Input({ className, ...props }: Props) {
  return (
    <input
      className={clsx(
        "w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black",
        className
      )}
      {...props}
    />
  );
}
