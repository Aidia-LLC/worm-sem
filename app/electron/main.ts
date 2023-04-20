import appRootDir from "app-root-dir";
import { ChildProcessWithoutNullStreams, exec, spawn } from "child_process";
import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import fs from "fs";
import path from "path";
import { temporaryFile } from "tempy";
import { Command, GrabFullFrameCommand, Message } from "../src/dto/semClient";
import { getPlatform } from "./platform";

const isProduction = app.isPackaged;

process.env.DIST = path.join(__dirname, "../dist");
process.env.PUBLIC = isProduction
  ? process.env.DIST
  : path.join(process.env.DIST, "../public");

const resourcePath = isProduction
  ? path.join(path.dirname(appRootDir.get()), "bin")
  : path.join(appRootDir.get(), "resources", getPlatform());

let browserWindow: BrowserWindow | null;
const devServerUrl = process.env.VITE_DEV_SERVER_URL;

const filePaths = new Map<number, string>();

const createWindow = () => {
  browserWindow = new BrowserWindow({
    icon: path.join(process.env.PUBLIC, "logo.svg"),
    title: "SEM Client",
    webPreferences: {
      preload: path.join(__dirname, "./preload.js"),
    },
  });

  // Open links in the browser, not inside the application
  browserWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https:")) shell.openExternal(url);
    return { action: "deny" };
  });

  if (devServerUrl) {
    browserWindow.loadURL(devServerUrl);
    browserWindow.webContents.openDevTools();
  } else {
    browserWindow.loadFile(path.join(process.env.DIST, "index.html"));
  }
  return browserWindow;
};

app.on("window-all-closed", () => {
  // if (process.platform !== "darwin")
  app.quit();
});

const NUM_TEMP_FILES = 5;
const tempFileNames = Array.from({ length: NUM_TEMP_FILES }, () =>
  temporaryFile()
);
let tempFileIndex = 0;

const getFilename = async (grabCommand: GrabFullFrameCommand) => {
  const ribbonId = grabCommand.ribbonId;
  const ribbonName = grabCommand.ribbonName;
  if (grabCommand.temporary || !ribbonId || !ribbonName) {
    tempFileIndex = (tempFileIndex + 1) % tempFileNames.length;
    return Promise.resolve(tempFileNames[tempFileIndex]);
  }
  if (filePaths.has(ribbonId))
    return Promise.resolve(
      `${filePaths.get(ribbonId)}-${grabCommand.name}.png`
    );
  const result = await dialog.showOpenDialog(browserWindow!, {
    properties: ["createDirectory", "openDirectory"],
  });
  if (result.canceled) return Promise.resolve(null);
  const [folderPath] = result.filePaths;
  const filePath = `${folderPath}/${grabCommand.ribbonName}`;
  filePaths.set(ribbonId, filePath);
  return Promise.resolve(`${filePath}-${grabCommand.name}.png`);
};

const init = (childProcess: ChildProcessWithoutNullStreams) => {
  childProcess.on("spawn", () => {
    childProcess.stdout.on("data", (data: Buffer) => {
      const messages: Message[] = data
        .toString("utf8")
        .trim()
        .split("\n")
        .map((message) => {
          const trimmed = message.trim();
          if (trimmed.length > 0) return JSON.parse(trimmed);
          return undefined;
        })
        .filter(Boolean);
      messages.forEach((message) => {
        console.log("Received message from C#:", message);
        if (message.code === 200) {
          // grab success
          (async () => {
            const payload = message.payload;
            if (!payload) return;
            if (payload.endsWith("setup.png")) {
              // this is a temporary file just used to make the user choose a folder before waiting for the first image to be taken
              await fs.promises.rm(payload);
              browserWindow?.webContents.send("SEMClient:Received", {
                ...message,
                payload: "",
              } as Message);
              return;
            }
            const data = await fs.promises.readFile(payload);
            browserWindow?.webContents.send("SEMClient:Received", {
              ...message,
              payload: Buffer.from(data).toString("base64"),
            } as Message);
          })();
        } else {
          browserWindow?.webContents.send("SEMClient:Received", message);
        }
      });
    });

    childProcess.stderr.on("data", (data: Buffer) => {
      console.error(data.toString("utf8"));
    });

    ipcMain.handle("SEMClient:Send", (_, command: Command) => {
      if (command.type === "grabFullFrame") {
        const grabCommand = command as GrabFullFrameCommand;
        getFilename(grabCommand).then((filename) => {
          if (!filename) return;
          grabCommand.filename = filename;
          console.log("Sending message to C#:", grabCommand);
          childProcess.stdin.write(JSON.stringify(grabCommand) + "\n");
        });
      } else if (command.type === "grab") {
        throw new Error("Received 'grab' command");
      } else {
        console.log("Sending message to C#:", command);
        childProcess.stdin.write(JSON.stringify(command) + "\n");
      }
    });

    ipcMain.handle("GetInitialPath", () => __dirname);

    createWindow();
  });

  app.on("before-quit", () => {
    childProcess.kill();
  });

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
};

app.whenReady().then(() => {
  if (isProduction) {
    const childProcess = spawn(path.join(resourcePath, "csharp"));
    init(childProcess);
  } else {
    console.log("Building C# program...");
    const cwd = path.join(__dirname, "..", "..", "csharp");
    exec("dotnet publish worm-sem.csproj --configuration Release", { cwd }).on(
      "exit",
      () => {
        console.log("Done building C# program.");
        const childProcess = spawn(
          "./bin/Release/net7.0/wormsem",
          ["--dry-run"], // TODO remove dry run flag when ready to connect to SEM
          { cwd }
        );
        init(childProcess);
      }
    );
  }
});
