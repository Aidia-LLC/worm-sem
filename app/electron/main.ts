import { ChildProcess } from "child_process";
import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import {
  Command,
  GrabFullFrameCommand,
  Message,
} from "../src/microscopeApi/types";
import { getFilename } from "./filesystem";
import { initializeMaskApi } from "./maskApi";
import { MicroscopeCallingInterface } from "./microscope";
import { ZeissInterface } from "./microscope/zeiss";
import { createWindow } from "./window";

const isProduction = app.isPackaged;

process.env.DIST = path.join(__dirname, "../dist");
process.env.PUBLIC = isProduction
  ? process.env.DIST
  : path.join(process.env.DIST, "../public");

let browserWindow: BrowserWindow | null;
let maskApi: ChildProcess | null = null;
const microscopeApi: MicroscopeCallingInterface = new ZeissInterface();

app.on("window-all-closed", () => {
  app.quit();
});

app.whenReady().then(async () => {
  maskApi = await initializeMaskApi();
  await microscopeApi.initialize();

  ipcMain.handle("SEMClient:Send", async (_, command: Command) => {
    switch (command.type) {
      case "GRAB_FULL_FRAME": {
        const grabCommand = command as GrabFullFrameCommand;
        const filename = await getFilename(grabCommand, browserWindow!);
        if (!filename) {
          browserWindow?.webContents.send("SEMClient:Received", {
            id: grabCommand.id,
            code: 400,
            type: "error",
            message: "File selector aborted",
          } satisfies Message);
          return;
        }
        grabCommand.filename = filename;
        console.log("Sending message to microscope api:", grabCommand);
        const response = await microscopeApi.grabFullFrame(
          grabCommand.name,
          grabCommand.filename
        );
        browserWindow?.webContents.send("SEMClient:Received", response);
        break;
      }
      case "GET_PARAM": {
        const response = await microscopeApi.getParam(command.param);
        browserWindow?.webContents.send("SEMClient:Received", {
          id: command.id,
          code: 200,
          type: "success",
          payload: response,
        } satisfies Message);
        break;
      }
      case "SET_PARAM": {
        const response = await microscopeApi.setParam(
          command.param,
          command.value
        );
        browserWindow?.webContents.send("SEMClient:Received", {
          id: command.id,
          code: 200,
          type: "success",
          payload: response,
        } satisfies Message);
        break;
      }
    }
  });

  browserWindow = createWindow();

  app.on("before-quit", () => {
    microscopeApi.shutdown();
    maskApi?.kill();
  });

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0)
      browserWindow = createWindow();
  });
});
