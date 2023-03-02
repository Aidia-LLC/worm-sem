// // run ./csharp program as child process

// // Path: worms/app/electron/preload.js

// // import { contextBridge, ipcRenderer } from 'electron'
// //

// import { spawn, Serializable } from "child_process";

// export const createClient = () => {
//   const process = spawn("./csharp");
//   process.on("message", (message) => {
//     console.log(`message from child: ${message}`);
//   });

//   return {
//     send: (message: string) => {
//       process.send(message);
//     },
//     subscribe: (callback: (message: Serializable) => void) => {
//       process.on("message", (message) => {
//         callback(message);
//       });
//     }
//   }
// };
