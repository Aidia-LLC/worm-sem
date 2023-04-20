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
        <div class="bg-gray-200 py-2 px-3 rounded translate-y-3 text-md leading-relaxed">
          <h2 class="font-bold">Grabbing an image</h2>
          <ol class="list-decimal list-inside">
            <li>Disable the data zone from SmartSEM.</li>
            <li>Click the "Connect" button to connect to the server.</li>
            <li>
              Click the "Grab Initial Image" button to grab an initial frame
              from the microscope.
            </li>
          </ol>
          <h2 class="font-bold mt-2">Finding Ribbons</h2>
          <ol class="list-decimal list-inside">
            <li>
              Click "Show Edge Data" to display the edge data of the image. It's
              easier to find the best edges this way.
            </li>
            <li>
              Click the center of the slice with the best-defined edge. This can
              be finicky, and may take a few attempts to learn how the algorithm
              performs best. You can click the "Remove" button to remove a bad
              set of detected trapezoids. There are parameters that can be
              changed below the image if the algorithm is not working well on
              this image.
            </li>
            <li>
              The program will look for a trapezoid centered on the clicked
              point using the Hough Transform. If this fails, it will generate
              thousands of random trapezoids and keep the best one. It then
              shifts these trapezoids up and down to find connected trapezoids.
            </li>
            <li>
              A trapezoid can be edited by clicking and dragging a vertex, or
              clicking the middle of the trapezoid to move the whole trapezoid.
            </li>
            <li>
              A trapezoid will be deleted if dragged to any edge of the image.
            </li>
            <li>
              The slice that is currently designated at the first slice will
              have a bolded line. You can swap the direction by clicking the
              "Reverse Direction" button while the ribbon's status is "Editing".
            </li>
            <li>
              You can edit the color and status of the ribbon, or remove it
              entirely. You can also change the name of the ribbon. The name
              will be included in the filename of the saved images.
            </li>
            <li>
              You can toggle between the original image and the edge data as
              needed.
            </li>
            <li>
              To prevent any further changes to the ribbon, change the status to
              "Locked".
            </li>
            <li>Repeat for any other ribbons.</li>
          </ol>
          <h2 class="font-bold mt-2">
            Getting Points and Sending to Miscroscope
          </h2>
          <ol class="list-decimal list-inside">
            <li>Change the ribbon's status to "Matching".</li>
            <li>
              Click a point in any slice of a ribbon with a status of
              "Matching". The same point in every other slice will be
              highlighted.
            </li>
            <li>
              Click and drag any point to adjust it within only that slice.
              Single click in a trapezoid to reset the point in every slice. If
              you need to make a slight adjustment, you may need to click far
              away in the slice to get it out of the way so it doesn't think
              you're trying to drag a single point.
            </li>
            <li>
              Change the status to "Locked" to prevent any further changes.
            </li>
            <li>
              Click the "Configure Slices" button to configure parameters
              (brightness, contrast, and focus) for each slice. Magnification
              will be applied across all slices.
            </li>
            <li>
              A few slices will be selected automatically to configure manually
              such that there will not be more than 5 slices between each
              configured slice.
            </li>
            <li>
              Make any adjustments as needed, and then click "Next Slice" to
              continue.
            </li>
            <li>
              After all slices have been configured, click "Finish" to start
              imaging.
            </li>
            <li>
              A dialog will pop up to choose the folder to save the images to.
            </li>
            <li>
              The program will begin configuring the microscope and imaging in
              the background. A percent complete will be displayed at the top of
              the screen while the operation is in progress.
            </li>
            <li>When the program is done, it will display a message.</li>
          </ol>
        </div>
      </Show>
    </div>
  );
};
