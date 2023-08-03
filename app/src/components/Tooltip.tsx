import { JSXElement, Show } from "solid-js";

export const Tooltip = (props: { message: string; children: JSXElement }) => {
  return (
    <div class="relative flex flex-col items-center group">
      {props.children}
      <Show when={props.message}>
        <div class="absolute bottom-0 flex-col items-center hidden group-hover:flex translate-y-[100%] z-[100]">
          <div class="w-3 h-3 -mb-2 rotate-45 bg-gray-600"></div>
          <span class="relative z-10 p-2 text-xs text-white whitespace-no-wrap bg-gray-600 shadow-lg rounded-md">
            {props.message}
          </span>
        </div>
      </Show>
    </div>
  );
};
