import React from 'react';
import { cn } from "@/lib/utils";

// Floating Label Input Component - Material Design Style
// Hiệu ứng: Label nằm trong input, khi focus hoặc có giá trị thì label bay lên trên

export function FloatingInput({ 
  id, 
  label, 
  type = "text", 
  value, 
  onChange, 
  className,
  disabled,
  error,
  ...props 
}) {
  return (
    <div className="relative h-11 w-full">
      <input
        id={id}
        type={type}
        placeholder=" "
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={cn(
          "peer h-full w-full rounded-lg border border-gray-300 dark:border-slate-700 border-t-transparent dark:border-t-transparent bg-transparent px-3 py-2.5 font-sans text-sm font-normal text-[#313131] dark:text-white outline-none ring-0 transition-all",
          "placeholder-shown:border placeholder-shown:border-gray-300 placeholder-shown:border-t-gray-300 dark:placeholder-shown:border-slate-700 dark:placeholder-shown:border-t-slate-700",
          "focus:border-2 focus:border-[#0455BF] focus:border-t-transparent dark:focus:border-blue-500 dark:focus:border-t-transparent focus:outline-none focus:ring-0 focus:ring-offset-0",
          "disabled:border-0 disabled:bg-gray-50",
          error && "border-red-500 border-t-transparent focus:border-red-500 focus:border-t-transparent dark:border-red-500 dark:border-t-transparent dark:focus:border-red-500 dark:focus:border-t-transparent",
          className
        )}
        {...props}
      />
      <label
        htmlFor={id}
        className={cn(
          "before:content[' '] after:content[' '] pointer-events-none absolute left-0 -top-1.5 flex h-full w-full select-none text-[11px] font-normal leading-tight transition-all",
          "before:pointer-events-none before:mt-[6.5px] before:mr-1 before:box-border before:block before:h-1.5 before:w-2.5 before:rounded-tl-md before:border-t before:border-l before:border-gray-300 dark:before:border-slate-700 before:transition-all",
          "after:pointer-events-none after:mt-[6.5px] after:ml-1 after:box-border after:block after:h-1.5 after:w-2.5 after:flex-grow after:rounded-tr-md after:border-t after:border-r after:border-gray-300 dark:after:border-slate-700 after:transition-all",
          "peer-placeholder-shown:text-sm peer-placeholder-shown:leading-[3.5] peer-placeholder-shown:text-gray-500 dark:peer-placeholder-shown:text-slate-400 peer-placeholder-shown:before:border-transparent peer-placeholder-shown:after:border-transparent",
          "peer-focus:text-[11px] peer-focus:leading-tight peer-focus:text-[#0455BF] dark:peer-focus:text-blue-500 peer-focus:before:border-t-2 peer-focus:before:border-l-2 peer-focus:before:!border-[#0455BF] dark:peer-focus:before:!border-blue-500 peer-focus:after:border-t-2 peer-focus:after:border-r-2 peer-focus:after:!border-[#0455BF] dark:peer-focus:after:!border-blue-500",
          "peer-disabled:text-transparent peer-disabled:before:border-transparent peer-disabled:after:border-transparent peer-disabled:peer-placeholder-shown:text-gray-500",
          error && "text-red-500 peer-focus:text-red-500 peer-focus:before:!border-red-500 peer-focus:after:!border-red-500"
        )}
      >
        {label}
      </label>
    </div>
  );
}

// Floating Password Input - Có nút show/hide password
export function FloatingPasswordInput({ 
  id, 
  label, 
  value, 
  onChange, 
  showPassword,
  onTogglePassword,
  className,
  disabled,
  error,
  ...props 
}) {
  return (
    <div className="relative h-11 w-full">
      <input
        id={id}
        type={showPassword ? "text" : "password"}
        placeholder=" "
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={cn(
          "peer h-full w-full rounded-lg border border-gray-300 dark:border-slate-700 border-t-transparent dark:border-t-transparent bg-transparent px-3 py-2.5 pr-10 font-sans text-sm font-normal text-[#313131] dark:text-white outline-none ring-0 transition-all",
          "placeholder-shown:border placeholder-shown:border-gray-300 placeholder-shown:border-t-gray-300 dark:placeholder-shown:border-slate-700 dark:placeholder-shown:border-t-slate-700",
          "focus:border-2 focus:border-[#0455BF] focus:border-t-transparent dark:focus:border-blue-500 dark:focus:border-t-transparent focus:outline-none focus:ring-0 focus:ring-offset-0",
          "disabled:border-0 disabled:bg-gray-50",
          error && "border-red-500 border-t-transparent focus:border-red-500 focus:border-t-transparent dark:border-red-500 dark:border-t-transparent dark:focus:border-red-500 dark:focus:border-t-transparent",
          className
        )}
        {...props}
      />
      <label
        htmlFor={id}
        className={cn(
          "before:content[' '] after:content[' '] pointer-events-none absolute left-0 -top-1.5 flex h-full w-full select-none text-[11px] font-normal leading-tight transition-all",
          "before:pointer-events-none before:mt-[6.5px] before:mr-1 before:box-border before:block before:h-1.5 before:w-2.5 before:rounded-tl-md before:border-t before:border-l before:border-gray-300 dark:before:border-slate-700 before:transition-all",
          "after:pointer-events-none after:mt-[6.5px] after:ml-1 after:box-border after:block after:h-1.5 after:w-2.5 after:flex-grow after:rounded-tr-md after:border-t after:border-r after:border-gray-300 dark:after:border-slate-700 after:transition-all",
          "peer-placeholder-shown:text-sm peer-placeholder-shown:leading-[3.5] peer-placeholder-shown:text-gray-500 dark:peer-placeholder-shown:text-slate-400 peer-placeholder-shown:before:border-transparent peer-placeholder-shown:after:border-transparent",
          "peer-focus:text-[11px] peer-focus:leading-tight peer-focus:text-[#0455BF] dark:peer-focus:text-blue-500 peer-focus:before:border-t-2 peer-focus:before:border-l-2 peer-focus:before:!border-[#0455BF] dark:peer-focus:before:!border-blue-500 peer-focus:after:border-t-2 peer-focus:after:border-r-2 peer-focus:after:!border-[#0455BF] dark:peer-focus:after:!border-blue-500",
          "peer-disabled:text-transparent peer-disabled:before:border-transparent peer-disabled:after:border-transparent peer-disabled:peer-placeholder-shown:text-gray-500",
          error && "text-red-500 peer-focus:text-red-500 peer-focus:before:!border-red-500 peer-focus:after:!border-red-500"
        )}
      >
        {label}
      </label>
      
      {/* Toggle password visibility button */}
      <button
        type="button"
        onClick={onTogglePassword}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
      >
        {showPassword ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        )}
      </button>
    </div>
  );
}
