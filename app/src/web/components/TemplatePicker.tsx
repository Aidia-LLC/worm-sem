import { Template } from "@data/templates";
import { For } from "solid-js";

export const TemplatePicker = (props: {
  onPick: (template: Template) => void;
  templates: Template[];
}) => {
  return (
    <div class="flex flex-col gap-4 p-2 justify-center items-center text-center">
      <h1 class="text-2xl font-bold">Choose a template</h1>
      <div class="flex flex-row flex-wrap gap-4">
        <For each={props.templates}>
          {(template) => (
            <div
              class="p-2 cursor-pointer m-2 flex flex-col gap-2"
              onClick={() => props.onPick(template)}
            >
              <h2 class="font-thin text-sm italic">
                Template {template.id + 1}
              </h2>
              <img src={template.dataUrl} />
            </div>
          )}
        </For>
      </div>
    </div>
  );
};
