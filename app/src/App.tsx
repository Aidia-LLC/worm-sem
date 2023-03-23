import { Canvas } from "@components/Canvas";
import { GrabTester } from "@components/GrabTester";
import { MessageLog } from "@components/MessageLog";

export const App = () => {
  return (
    <div class="flex flex-col gap-3 m-4">
      <MessageLog />
      <Canvas />
      <GrabTester />
    </div>
  );
};
