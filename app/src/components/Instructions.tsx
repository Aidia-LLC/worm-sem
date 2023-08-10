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
            fallback={
              <svg
                width="36px"
                height="36px"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                  stroke="#323232"
                  stroke-width="2"
                />
                <path
                  d="M10.5 8.67709C10.8665 8.26188 11.4027 8 12 8C13.1046 8 14 8.89543 14 10C14 10.9337 13.3601 11.718 12.4949 11.9383C12.2273 12.0064 12 12.2239 12 12.5V12.5V13"
                  stroke="#323232"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M12 16H12.01"
                  stroke="#323232"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            }
          >
            <span class="font-bold border-2 border-black rounded-lg p-1">
              Hide Instructions
            </span>
          </Show>
        </div>
      </div>
      <Show when={showInstructions()}>
        <div class="bg-gray-200 py-2 px-3 rounded translate-y-3 text-md leading-relaxed">
          <h2 class="font-bold">Grabbing an Image</h2>
          <ol class="list-decimal list-inside">
            <li>Disable the data zone in SmartSEM.</li>
            <li>Click the "Connect" button to connect to the server.</li>
            <li>
              Move the stage to the desired position and set a magnification to
              see the entire sample.
            </li>
            <li>
              Click the "Grab Image" button to grab an initial frame from the
              microscope.
            </li>
          </ol>
          <h2 class="font-bold mt-2">Detecting Ribbons</h2>
          <ol class="list-decimal list-inside">
            <li>
              Follow the instructions to click a slice at the end, start, and
              several slices in the middle of a ribbon. Make sure to include all
              corners of the slice in the bounding box, but it should be a tight
              fit. If any of the slices don't fit in the bounding box, you can
              adjust the size of the box in the options panel at the bottom of
              the screen.
            </li>
            <li>
              The program will use the Segemnt Anything Model to mask out the
              noise of the image. There are three masks to choose from. You can
              cycle through them and pick the one that fits the ribbon the best.
              Click "Accept Mask" to continue to the next step.
            </li>
            <li>
              The program will look for a slice centered on the first clicked
              point using the Hough Transform. If it fails to find one, it will
              generate thousands of random shapes and keep the one that fits
              best. It then shifts these shapes up and down to find connected
              slices.
            </li>
            <li>
              If the ribbon is not detected correctly, you can click the "Detect
              Again" button to try again. This will use the next point you
              clicked as a reference point for finding slices. If, after cycling
              through all of the points, it doesn't detect the slice, you can
              remove the ribbon and try again.
            </li>
            <li>
              If the program still cannot detect a ribbon properly, you can try
              changing the Hough Vote Threshold in the options. If the mask fits
              the ribbon well, you can try changing it to a value of 0.4. If the
              mask doesn't fit the ribbon well, you can try changing it to a
              value of 0.6. As a last resort, you can try changing the Max Lines
              option to a value of 3 or 4.
            </li>
          </ol>
          <h2 class="font-bold mt-2">Editing Ribbons</h2>
          <ol class="list-decimal list-inside">
            <li>
              There are 3 different statuses for a ribbon: "Editing",
              "Matching", and "Locked". After creating a ribbon, it will be in
              "Editing" status. In this status, you can move a slice or a vertex
              by clicking and dragging it. You can also delete a slice by
              dragging it to the edge of the image. You can add a slice to the
              top or the bottom of the slice using the corresponding buttons.
              You can then fine tune the position of the slice by dragging it.
              The number order of the slices is automatically detected, but if
              it is wrong, you can click the "Reverse Direction" button.
            </li>
            <li>
              While in the "Matching" status, you can click and drag anywhere
              inside a slice to highlight the corresponding point on all other
              slices in the ribbon. This is the point that will be imaged. You
              can adjust all points on the ribbon by choosing the "Match Across
              All Slices" option. After initially matching the points, you can
              choose "Adjust Single Slice" to move a single point.
            </li>
            <li>
              To prevent any further changes to the ribbon, change the status to
              "Locked".
            </li>
            <li>Repeat for any other ribbons in the image.</li>
          </ol>
          <h2 class="font-bold mt-2">Configuring Slices for Imaging</h2>
          <ol class="list-decimal list-inside">
            <li>
              Click "Configure Slices" on the ribbon you want to configure.
            </li>
            <li>
              There will be a table with 4 columns. The first is the number of
              the slice. The second column has a checkbox to enable tweaking the
              position of the point to image on the slice. Enabling this will
              turn the point to a black color in the preview. The third column
              has a checkbox to enable configuring the brightness, contrast, and
              working distance for that slice. You must configure these values
              for the first and last slices. Values for any unselected slices
              will be interpolated between the nearest configured slices. The
              groups to be interpolated are represented visually in the fourth
              column. The slices are outlined in the corresponding color in the
              preview.
            </li>
            <li>
              If a slice is much darker or brighter than the others, you may
              need to select that slice and each of its neighbors in the third
              column so that those values don't get interpolated to the other
              slices.
            </li>
            <li>
              Below the table, there are two configuration panes. The top pane
              is for the brightness, contrast, working distance, and position of
              the slice. If the corresponding checkbox in the table above isn't
              selected, some of these fields may not be visible for that slice.
            </li>
            <li>
              When editing these values, use the live preview in the SmartSEM
              program to see the changes to the parameters. You can use the
              Previous and Next Slice buttons to cycle through the slices.
            </li>
            <li>
              The bottom configuration pane has the scan speed and
              magnification. The value for magnification will be used across all
              slices in this ribbon. The scan speed will only be used for the
              preview. To set the scan speed for final imaging, set the "Final
              Scan Speed" option in the main screen.
            </li>
            <li>
              After all slices have been configured, click "Queue Ribbon" to
              save the configuration to the queue. Only do this once you are
              certain that the configuration is correct. You will not be able to
              edit it later.
            </li>
            <li>Repeat for any other ribbons in the image.</li>
            <li>
              Click "Clear Image" and repeat for any other grids you want to
              image.
            </li>
            <li>
              When you are completely done setting up the ribbons, click "Begin
              Imaging" in the banner at the top of the screen. This will open a
              dialog to choose the folder to save the images to.
            </li>
            <li>
              The program will begin configuring the microscope and imaging in
              the background. The current progress will be displayed while the
              operation is in progress. When it is complete, there will be a
              message displayed.
            </li>
            <li>
              Treat yourself to some ice cream while you wait for the imaging to
              finish! It may take a long, long while.
            </li>
          </ol>
        </div>
      </Show>
    </div>
  );
};
