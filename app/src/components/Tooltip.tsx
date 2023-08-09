import { JSXElement, Match, Show, Switch } from "solid-js";

export const Tooltip = (props: {
  message: string;
  children: JSXElement;
  position: "right" | "bottom" | "left";
}) => {
  return (
    <div class="relative flex flex-col items-center group w-full">
      {props.children}
      <Show when={props.message}>
        <Switch>
          <Match when={props.position === "right"}>
            <div class="absolute flex-row items-center hidden group-hover:flex z-[100] w-[256px] right-0 translate-x-[100%]">
              <span class="relative z-10 p-2 text-xs text-white whitespace-no-wrap bg-gray-600 shadow-lg rounded-md">
                {props.message}
              </span>
            </div>
          </Match>
          <Match when={props.position === "bottom"}>
            <div class="absolute flex-col items-center hidden group-hover:flex z-[100] w-[256px] bottom-0 translate-y-[100%]">
              <div class="w-3 h-3 -mb-2 rotate-45 bg-gray-600 z-0"></div>
              <span class="relative z-10 p-2 text-xs text-white whitespace-no-wrap bg-gray-600 shadow-lg rounded-md">
                {props.message}
              </span>
            </div>
          </Match>
          <Match when={props.position === "left"}>
            <div class="absolute flex-row items-center hidden group-hover:flex z-[100] w-[256px] bottom-0 translate-y-[20%] translate-x-[-100%] left-0">
              <span class="relative z-10 p-2 text-xs text-white whitespace-no-wrap bg-gray-600 shadow-lg rounded-md">
                {props.message}
              </span>
            </div>
          </Match>
        </Switch>
      </Show>
    </div>
  );
};
