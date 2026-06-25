export type ButtonVariant = "primary" | "secondary" | "darkPrimary" | "darkSecondary" | "outline" | "danger" | "warning";
export type ButtonSize = "sm" | "md" | "lg";

export const buttonBase =
  "inline-flex cursor-pointer items-center justify-center font-semibold shadow-sm transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-300 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:shadow-none";

export const buttonVariants: Record<ButtonVariant, string> = {
  primary: "border-2 border-[#173968] bg-[#173968] text-white shadow-[0_14px_28px_rgba(23,57,104,0.24)] hover:border-[#10213f] hover:bg-[#10213f] hover:text-white hover:shadow-[0_18px_36px_rgba(23,57,104,0.30)] disabled:border-gray-400 disabled:bg-gray-300 disabled:text-gray-800",
  secondary: "border-2 border-slate-400 bg-white text-slate-950 shadow-[0_10px_22px_rgba(15,23,42,0.12)] hover:border-slate-600 hover:bg-slate-100 hover:text-slate-950 disabled:border-gray-300 disabled:bg-gray-200 disabled:text-gray-700",
  darkPrimary: "border-2 border-[#173968] bg-[#173968] text-white shadow-[0_14px_28px_rgba(23,57,104,0.24)] hover:border-[#10213f] hover:bg-[#10213f] hover:text-white hover:shadow-[0_18px_36px_rgba(23,57,104,0.30)] disabled:border-gray-400 disabled:bg-gray-300 disabled:text-gray-800",
  darkSecondary: "border-2 border-slate-400 bg-white text-slate-950 shadow-[0_10px_22px_rgba(15,23,42,0.12)] hover:border-slate-600 hover:bg-slate-100 hover:text-slate-950 disabled:border-gray-300 disabled:bg-gray-200 disabled:text-gray-700",
  outline: "border-2 border-slate-400 bg-white text-slate-950 shadow-[0_10px_22px_rgba(15,23,42,0.12)] hover:border-slate-600 hover:bg-slate-100 hover:text-slate-950 disabled:border-gray-300 disabled:bg-gray-200 disabled:text-gray-700",
  danger: "border-2 border-red-800 bg-red-700 text-white shadow-[0_10px_22px_rgba(185,28,28,0.18)] hover:border-red-900 hover:bg-red-800 hover:text-white disabled:border-gray-400 disabled:bg-gray-300 disabled:text-gray-800",
  warning: "border-2 border-slate-950 bg-[#facc15] text-slate-950 shadow-[0_18px_36px_rgba(250,204,21,0.38)] ring-2 ring-amber-100 hover:-translate-y-0.5 hover:bg-[#fde047] hover:text-slate-950 hover:shadow-[0_22px_44px_rgba(250,204,21,0.46)] disabled:border-gray-200 disabled:bg-gray-300 disabled:text-gray-800 disabled:shadow-none disabled:ring-0",
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
  "cursor-pointer rounded-[1.25rem] border-2 border-[#173968] bg-[#173968] text-left text-white shadow-[0_18px_42px_rgba(23,57,104,0.26)] transition-all hover:-translate-y-0.5 hover:border-[#10213f] hover:bg-[#10213f] hover:text-white hover:shadow-[0_20px_46px_rgba(23,57,104,0.30)] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#173968] focus:ring-offset-2";
