import { createEffect } from "solid-js";

export const App = () => {

  createEffect(() => {
    console.log((window as any).semClient);
  })

  return (
    <div class='bg-blue-300'>
      I'm text
    </div>
  );
};
