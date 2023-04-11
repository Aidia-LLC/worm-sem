import { JSXElement } from "solid-js";

export const Button = (props: {
  onClick: () => void;
  children: JSXElement;
  variant?: "primary" | "secondary";
  class?: string;
  disabled?: boolean;
}) => {
  return (
    <button
      class={`text-white font-bold py-2 px-4 rounded transition-colors ${props.class}`}
      classList={{
        "bg-blue-500 hover:bg-blue-700 active:bg-blue-800":
          !props.variant || props.variant === "primary",
        "bg-gray-500 hover:bg-gray-700 active:bg-gray-800":
          props.variant === "secondary",
        "cursor-not-allowed opacity-50": props.disabled,
      }}
      disabled={props.disabled}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
};
