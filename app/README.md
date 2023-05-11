# Electron Client

## Basic Architecture

The Electron client is a Solid app. The `electron/main.ts` script runs in a NodeJS environment and is responsible for creating the Electron window. The `electron/preload.ts` script runs in the browser prior to the Solid app being loaded. It acts as a bridge between the NodeJS environment and the frontend.

## Inter-Process Communication

IPC is handled using Electron's `ipcMain`. The preload script has access to invoke methods on the `ipcRenderer` object, which calls handlers associated with `ipcMain` in main. The `ipcRenderer` can also subscribe to events emitted by `ipcMain`.

Any information passed through IPC must be JSON-serializable. This means that any objects passed through IPC must be plain objects, not instances of classes or functions. Any callback functions must be handled using the API exposed on the `window` object explained below in the Bridge section.

- preload -> main
  - `SEMClient:Send` - send a JSON mesage to the C# API
  - `GetInitialPath` - gets a relative path where the grabbed image could be saved
- main -> preload
  - `SEMClient:Received` - notifies of a JSON message received from the C# API

## Bridge

The API that the Electron frontend can use to communicate with the Electron backend is exposed on the `window` object. The types for this API are in `src/types/semClient.d.ts`.

Because this runs in the browser, the data sent need not be JSON-serializable. This allows us to set up callback functions.

- `window.semClient.send(command: Command)` - send a JSON message to the C# API
- `window.semClient.subscribe(callback: (message: Message) => void)` - pass a callback function to be called when any JSON message is received from the C# API. All filtering of messages should be done in the callback function.
- `window.getInitialPath(): Promise<string>` - gets a relative path where the grabbed image could be saved
