import { Tooltip } from "@components/Tooltip";

export const UpArrow = () => {
  return (
    <Tooltip
      message="Values for this slice will be interpolated from the previous slice."
      position="right"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="#000000"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M5 15l7-7 7 7"
        />
      </svg>
    </Tooltip>
  );
};

export const DownArrow = () => {
  return (
    <Tooltip
      message="Values for this slice will be interpolated from the next slice."
      position="right"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="#000000"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </Tooltip>
  );
};

export const TwoHeadedVerticalArrow = () => {
  return (
    <Tooltip
      message="Values for this slice will be interpolated from the previous and next slices."
      position="right"
    >
      <svg
        fill="#000000"
        class="h-6 w-6"
        version="1.1"
        id="Layer_1"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 492.426 492.426"
      >
        <polygon
          points="261.232,434.981 261.232,57.445 305.607,101.82 326.82,80.606 246.213,0 165.607,80.606 186.82,101.82 
	231.232,57.408 231.232,435.019 186.82,390.606 165.607,411.82 246.213,492.426 326.82,411.82 305.607,390.606 "
        />
      </svg>
    </Tooltip>
  );
};

export const ManuallyConfigured = () => {
  return (
    <Tooltip
      message="Values for this slice will be manually configured."
      position="right"
    >
      ---
    </Tooltip>
  );
};

export const InterpolatedSymbol = () => {
  return (
    <Tooltip
      message="Values for this slice will be interpolated between the previous and next slices."
      position="right"
    >
      |
    </Tooltip>
  );
};
