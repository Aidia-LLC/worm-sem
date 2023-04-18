/**
 * The preload script runs before. It has access to web APIs
 * as well as Electron's renderer process modules and some
 * polyfilled Node.js functions.
 *
 * https://www.electronjs.org/docs/latest/tutorial/tutorial-preload
 */

import { contextBridge, ipcRenderer } from "electron";
import { Message, SEMClient } from "../src/dto/semClient";

const subscribers: ((message: Message) => void)[] = [];

const client: SEMClient = {
  send: (command) => {
    ipcRenderer.invoke("SEMClient:Send", command);
  },
  subscribe: (callback) => {
    subscribers.push(callback);
    return () => {
      const index = subscribers.indexOf(callback);
      if (index !== -1) subscribers.splice(index, 1);
    };
  },
};

ipcRenderer.on("SEMClient:Received", (_, data) => {
  const message = data as Message;
  subscribers.forEach((callback) => callback(message));
});

contextBridge.exposeInMainWorld("semClient", client);

contextBridge.exposeInMainWorld("getInitialPath", () => {
  return ipcRenderer.invoke("GetInitialPath");
});
