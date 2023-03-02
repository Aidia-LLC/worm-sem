/**
 * The preload script runs before. It has access to web APIs
 * as well as Electron's renderer process modules and some
 * polyfilled Node.js functions.
 *
 * https://www.electronjs.org/docs/latest/tutorial/tutorial-preload
 */

import { contextBridge, ipcRenderer } from "electron";
import { Command, Message, SEMClient } from "../src/types/semClient";

const subscribers: ((message: Message) => void)[] = [];

const client: SEMClient = {
  send: (command: Command) => {
    ipcRenderer.invoke("SEMClient:Send", command);
  },
  subscribe: (callback) => {
    subscribers.push(callback);
  },
};

ipcRenderer.on("SEMClient:Received", (_, data) => {
  const message = data as Message;
  subscribers.forEach((callback) => callback(message));
});

contextBridge.exposeInMainWorld("semClient", client);
