import { JSXElement } from "solid-js";
import { Tooltip } from "./Tooltip";

export const Button = (props: {
  onClick: () => void;
  children: JSXElement;
  variant?:
    | "primary"
    | "secondary"
    | "ghost"
    | "primary-outline"
    | "danger"
    | "danger-outline";
  class?: string;
  disabled?: boolean;
  tooltip?: string;
  tooltipPosition?: "right" | "bottom";
}) => {
  return (
    <Tooltip
      message={props.tooltip ?? ""}
      position={props.tooltipPosition || "right"}
    >
      <button
        class={`text-white w-full h-full font-bold py-2 px-4 rounded transition-colors ${props.class} uppercase text-sm leading-tight`}
        classList={{
          "bg-blue-500 hover:bg-blue-700 active:bg-blue-800":
            !props.variant || props.variant === "primary",
          "bg-gray-500 hover:bg-gray-700 active:bg-gray-800":
            props.variant === "secondary",
          "bg-transparent hover:bg-gray-100 active:bg-gray-200 !text-black":
            props.variant === "ghost",
          "bg-transparent hover:bg-blue-100 active:bg-blue-200 !text-blue-500 border border-blue-500":
            props.variant === "primary-outline",
          "bg-red-500 hover:bg-red-700 active:bg-red-800":
            props.variant === "danger",
          "bg-transparent hover:bg-red-100 active:bg-red-200 !text-red-500 border border-red-500":
            props.variant === "danger-outline",
          "cursor-not-allowed opacity-50": props.disabled,
        }}
        disabled={props.disabled}
        onClick={props.onClick}
      >
        {props.children}
      </button>
    </Tooltip>
  );
};
