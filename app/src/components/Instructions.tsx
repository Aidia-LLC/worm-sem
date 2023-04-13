import { createSignal, Show } from "solid-js";

export const Instructions = () => {
  const [showInstructions, setShowInstructions] = createSignal(false);
  return (
    <div class="flex flex-col gap-3 m-4 text-xs">
      <div class="absolute top-2 right-2">
        <div
          onClick={() => setShowInstructions(!showInstructions())}
          class="cursor-pointer"
          classList={{
            "translate-y-2": showInstructions(),
          }}
        >
          <Show
            when={showInstructions()}
            fallback={<img src="/help.svg" width={36} />}
          >
            <span class="font-bold border-2 border-black rounded-lg p-1">
              Hide Instructions
            </span>
          </Show>
        </div>
      </div>
      <Show when={showInstructions()}>
        <div class="bg-gray-200 p-2 rounded translate-y-3 text-md leading-relaxed">
          <h2 class="font-bold">Grabbing an image</h2>
          <ol class="list-decimal list-inside">
            <li>Click the "Connect" button to connect to the server.</li>
            <li>
              Click the "Grab Image" button to grab an initial frame from the
              microscope.
            </li>
          </ol>
          <h2 class="font-bold mt-2">Steps To Find Trapezoid</h2>
          <ol class="list-decimal list-inside">
            <li>
              Click the center of the trapezoid with the best defined edge. This
              can be finicky, and may take a few attempts to learn what the
              algorithm likes.
            </li>
            <li>
              The program will try to find a trapezoid using the Hough
              Transform; if this fails, it will generate thousands of random
              trapezoids and keep the best one. It then shifts these trapezoids
              up and down to find connected trapezoids.
            </li>
            <li>
              A trapezoid can be edited by clicking and dragging a vertex, or
              clicking the middle of the trapezoid to move the whole trapezoid.
            </li>
            <li>
              A trapezoid will be deleted if dragged to any edge of the image.
            </li>
            <li>
              You can edit the color, thickness, and status of the trapezoid
              set, or delete the whole set.
            </li>
            <li>
              You can toggle between the original image and the edge data.
            </li>
            <li>
              Change the status to 'matching' when you are done editing the set.
            </li>
            <li>Repeat for any other set of trapezoids.</li>
          </ol>
          <h2 class="font-bold mt-2">
            Getting Points and Sending to Miscroscope
          </h2>
          <ol class="list-decimal list-inside">
            <li>
              Click a point in any trapezoid of a trapezoid set with a status of
              'matching'. The same point in every other trapezoid in the set
              will be highlighted.
            </li>
            <li>
              Click and drag any individual point to adjust only that point.
              Single click in a trapezoid to reset the point in every trapezoid.
            </li>
            <li>
              Change the status to 'saved' to prevent any further changes.
            </li>
          </ol>
        </div>
      </Show>
    </div>
  );
};
