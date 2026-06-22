export type ButtonVariant = "primary" | "secondary" | "darkPrimary" | "darkSecondary" | "outline" | "danger" | "warning";
export type ButtonSize = "sm" | "md" | "lg";

export const buttonBase =
  "inline-flex cursor-pointer items-center justify-center font-semibold shadow-sm transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-300 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:shadow-none";

export const buttonVariants: Record<ButtonVariant, string> = {
  primary: "border-2 border-indigo-800 bg-indigo-700 text-white hover:border-indigo-900 hover:bg-indigo-800 hover:text-white hover:shadow-md disabled:border-gray-400 disabled:bg-gray-300 disabled:text-gray-800",
  secondary: "border-2 border-slate-400 bg-white text-slate-950 hover:border-slate-600 hover:bg-slate-100 hover:text-slate-950 disabled:border-gray-300 disabled:bg-gray-200 disabled:text-gray-700",
  darkPrimary: "border-2 border-white bg-white text-slate-950 hover:border-slate-200 hover:bg-slate-100 hover:text-slate-950 disabled:border-gray-400 disabled:bg-gray-300 disabled:text-gray-800",
  darkSecondary: "border-2 border-white bg-transparent text-white hover:bg-white hover:text-slate-950 disabled:border-white/50 disabled:text-white/70",
  outline: "border-2 border-slate-500 bg-white text-slate-950 hover:border-slate-700 hover:bg-slate-100 hover:text-slate-950 disabled:border-gray-300 disabled:bg-gray-200 disabled:text-gray-700",
  danger: "border-2 border-red-800 bg-red-700 text-white hover:border-red-900 hover:bg-red-800 hover:text-white disabled:border-gray-400 disabled:bg-gray-300 disabled:text-gray-800",
  warning: "border-2 border-amber-200 bg-amber-400 text-slate-950 shadow-[0_14px_28px_rgba(250,204,21,0.24)] ring-2 ring-amber-100/70 hover:bg-amber-300 hover:text-slate-950 hover:shadow-[0_18px_36px_rgba(250,204,21,0.32)] disabled:border-gray-200 disabled:bg-gray-300 disabled:text-gray-800 disabled:shadow-none disabled:ring-0",
};

export const buttonSizes: Record<ButtonSize, string> = {
  sm: "min-h-11 rounded-xl px-4 py-2 text-sm",
  md: "min-h-12 rounded-xl px-5 py-3 text-sm",
  lg: "min-h-14 rounded-xl px-6 py-4 text-base",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", className = "") {
  return [buttonBase, buttonVariants[variant], buttonSizes[size], className].filter(Boolean).join(" ");
}

export const selectableCardClass =
  "cursor-pointer rounded-[1.25rem] border border-slate-200 bg-white text-left text-slate-900 transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-slate-50 hover:text-slate-950 hover:shadow-[0_14px_28px_rgba(15,23,42,0.08)] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2";

export const selectedCardClass =
  "cursor-pointer rounded-[1.25rem] border-2 border-indigo-600 bg-indigo-50 text-left text-slate-950 shadow-[0_16px_34px_rgba(79,70,229,0.14)] transition-all hover:-translate-y-0.5 hover:border-indigo-700 hover:bg-indigo-50 hover:text-slate-950 hover:shadow-[0_18px_36px_rgba(79,70,229,0.16)] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2";
