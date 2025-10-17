import React from "react";
import { DivideIcon as LucideIcon } from "lucide-react";

export default function Button({
  children,
  onClick,
  variant = "primary",
  size = "md",
  icon: Icon,
  disabled = false,
  className = "",
  type = "button",
}) {
  const baseClasses =
    "inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black";

  const variantsClasses = {
    primary:
      "bg-gradient-to-r from-red-500 to-blue-600 hover:from-red-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl focus:ring-red-500",
    secondary:
      "bg-gray-800 hover:bg-gray-700 text-white border border-gray-600 hover:border-gray-500 focus:ring-gray-500",
    danger:
      "bg-red-500 hover:bg-red-600 text-white shadow-lg hover:shadow-xl focus:ring-red-500",
  };

  const sizesClasses = {
    sm: "px-4 py-2 text-sm space-x-2",
    md: "px-6 py-3 text-base space-x-3",
    lg: "px-8 py-4 text-lg space-x-3",
  };

  const disabledClasses =
    "opacity-50 cursor-not-allowed transform-none hover:scale-100 active:scale-100";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantsClasses[variant]} ${sizesClasses[size]} ${
        disabled ? disabledClasses : ""
      } ${className}`}
    >
      {Icon && <Icon size={size === "sm" ? 16 : size === "lg" ? 24 : 20} />}
      <span>{children}</span>
    </button>
  );
}
