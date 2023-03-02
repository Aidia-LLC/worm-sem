import { MessageLog } from "@components/MessageLog";

export const App = () => {
  return (
    <div class="">
      <MessageLog />
      <button
        class='m-4 bg-blue-500 hover:bg-blue-700 active:bg-blue-800 text-white font-bold py-2 px-4 rounded'
        onClick={() => {
          window.semClient.send({
            id: Math.floor(Math.random() * 1000),
            type: "print",
            message: "Hello from Solid",
          });
        }}
      >
        Send Message
      </button>
    </div>
  );
};
