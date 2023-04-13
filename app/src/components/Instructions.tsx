import { createSignal, Show } from "solid-js";
import { Button } from "./Button";

export const Instructions = () => {
  const [showInstructions, setShowInstructions] = createSignal(false);
  return (
    <div class="flex flex-col gap-3 m-4 text-xs">
      <Button onClick={() => setShowInstructions(!showInstructions())}>
        {showInstructions() ? "Hide" : "Show"} Instructions
      </Button>
      <Show when={showInstructions()}>
        <div class="bg-gray-200 p-2 rounded">
          {/* steps */}
          <h2 class="font-bold">Steps To Grab the image</h2>
          <ol class="list-decimal list-inside">
            <li>Click the "Connect" button to connect to the server.</li>
            <li>Click the "Grab" button to grab the worm.</li>
            <li>Click the "Release" button to release the worm.</li>
            <li>
              Click the "Disconnect" button to disconnect from the server.
            </li>
          </ol>
          <h2 class="font-bold">Steps To Find Trapezoid</h2>
          <ol class="list-decimal list-inside">
            <li>
              Click the center of the best-looking trapezoid. This can be
              finicky, and may take a few attempts to learn what the algorithm
              likes.
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
              A trapezoid will be deleted if dragged to any edge of the screen.
            </li>
            <li>
              You can edit the color, thickness, and status of the trapezoid
              set, or delete the whole set.
            </li>
            <li>
              You can toggle the image to be the original image to help editing
              trapezoids.
            </li>
            <li>
              Change the status to 'matching' when you are done editing the set.
            </li>
            <li>Repeat for any other set of trapezoids.</li>
          </ol>
          <h2 class="font-bold">Steps To Get Points and Send to Miscroscope</h2>
          <ol class="list-decimal list-inside">
            <li>
              Click a point in any trapezoid of a trapezoid set with a status of
              'matching'. The same point in every other trapezoid in the set
              will be highlighted.
            </li>
            <li>
              Click and hold any individual point and drag to adjust. Single
              click in a trapezoid to reset the point in every trapezoid.
            </li>
            <li>
              Change the status to 'saved' when ready to send points to the
              microscope.
            </li>
          </ol>
        </div>
      </Show>
    </div>
  );
};
