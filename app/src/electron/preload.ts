/**
 * The preload script runs before. It has access to web APIs
 * as well as Electron's renderer process modules and some
 * polyfilled Node.js functions.
 *
 * https://www.electronjs.org/docs/latest/tutorial/tutorial-preload
 */

import { contextBridge, ipcRenderer } from "electron";
import { SEMClient } from "../microscopeBridge/types";
import { ElectronMessage } from "./types";

const subscribers: ((message: ElectronMessage) => void)[] = [];

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
  subscribers.forEach((callback) => callback(data));
});

contextBridge.exposeInMainWorld("semClient", client);
