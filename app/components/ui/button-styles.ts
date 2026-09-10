export type ButtonVariant = "primary" | "secondary" | "darkPrimary" | "darkSecondary" | "outline" | "danger" | "warning";
export type ButtonSize = "sm" | "md" | "lg";

export const buttonBase =
  "inline-flex cursor-pointer items-center justify-center font-semibold shadow-sm transition-all duration-200 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#3B82F6]/20 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:shadow-none";

export const buttonVariants: Record<ButtonVariant, string> = {
  primary: "border border-[#2457C5] bg-[#2457C5] !text-white shadow-[0_6px_18px_rgba(31,74,168,0.18)] hover:border-[#1E46A0] hover:bg-[#1E46A0] hover:!text-white hover:shadow-[0_10px_26px_rgba(15,23,42,0.12)] disabled:border-gray-300 disabled:bg-gray-300 disabled:!text-gray-700",
  secondary: "border border-[#D8E0E8] bg-white !text-[#1F2937] shadow-none hover:border-[#B9C7D8] hover:bg-[#F7F9FC] hover:!text-[#111827] disabled:border-gray-300 disabled:bg-gray-100 disabled:!text-gray-500",
  darkPrimary: "border border-[#2457C5] bg-[#2457C5] !text-white shadow-[0_6px_18px_rgba(31,74,168,0.18)] hover:border-[#1E46A0] hover:bg-[#1E46A0] hover:!text-white hover:shadow-[0_10px_26px_rgba(15,23,42,0.12)] disabled:border-gray-300 disabled:bg-gray-300 disabled:!text-gray-700",
  darkSecondary: "border border-[#D8E0E8] bg-white !text-[#1F2937] shadow-none hover:border-[#B9C7D8] hover:bg-[#F7F9FC] hover:!text-[#111827] disabled:border-gray-300 disabled:bg-gray-100 disabled:!text-gray-500",
  outline: "border border-[#CBD5E1] bg-white !text-[#1F2937] shadow-none hover:border-[#94A3B8] hover:bg-[#F7F9FC] hover:!text-[#111827] disabled:border-gray-300 disabled:bg-gray-100 disabled:!text-gray-500",
  danger: "border border-red-700 bg-red-600 !text-white shadow-[0_6px_18px_rgba(185,28,28,0.14)] hover:border-red-800 hover:bg-red-700 hover:!text-white disabled:border-gray-300 disabled:bg-gray-300 disabled:!text-gray-700",
  warning: "border border-[#2457C5] bg-[#2457C5] !text-white shadow-[0_6px_18px_rgba(31,74,168,0.18)] hover:border-[#1E46A0] hover:bg-[#1E46A0] hover:!text-white hover:shadow-[0_10px_26px_rgba(15,23,42,0.12)] disabled:border-gray-300 disabled:bg-gray-300 disabled:!text-gray-700",
};

export const buttonSizes: Record<ButtonSize, string> = {
  sm: "min-h-10 rounded-[10px] px-4 py-2 text-sm",
  md: "min-h-12 rounded-[10px] px-5 py-3 text-sm",
  lg: "min-h-[52px] rounded-[10px] px-6 py-4 text-base",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", className = "") {
  return [buttonBase, buttonVariants[variant], buttonSizes[size], className].filter(Boolean).join(" ");
}

export const selectableCardClass =
  "cursor-pointer rounded-[14px] border border-[#E5EAF0] bg-white text-left text-slate-900 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-[#BFD0EA] hover:bg-[#F7F9FC] hover:!text-slate-950 hover:shadow-[0_10px_30px_rgba(15,23,42,0.08)] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-2";

export const selectedCardClass =
  "cursor-pointer rounded-[14px] border border-[#2457C5] bg-[#2457C5] text-left !text-white shadow-[0_10px_30px_rgba(31,74,168,0.18)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-[#1E46A0] hover:bg-[#1E46A0] hover:!text-white hover:shadow-[0_12px_34px_rgba(31,74,168,0.22)] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#2457C5] focus:ring-offset-2";
