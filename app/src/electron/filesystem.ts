import { BrowserWindow, dialog } from "electron";
import { GrabFullFrameCommand } from "../MicroscopeBridge/types";
import { temporaryFile } from "tempy";

const NUM_TEMP_FILES = 5;
const tempFileNames = Array.from({ length: NUM_TEMP_FILES }, () =>
  temporaryFile()
);
let tempFileIndex = 0;
const filePaths = new Map<number, string>();

export const getFilename = async (
  grabCommand: GrabFullFrameCommand,
  browserWindow: BrowserWindow
) => {
  const ribbonId = grabCommand.ribbonId;
  const ribbonName = grabCommand.ribbonName;
  if (grabCommand.temporary || !ribbonId || !ribbonName) {
    tempFileIndex = (tempFileIndex + 1) % tempFileNames.length;
    return Promise.resolve(tempFileNames[tempFileIndex]);
  }
  if (filePaths.has(ribbonId))
    return Promise.resolve(
      `${filePaths.get(ribbonId)}-${grabCommand.name}.tiff`
    );
  const result = await dialog.showOpenDialog(browserWindow, {
    properties: ["createDirectory", "openDirectory"],
  });
  if (result.canceled) return Promise.resolve(null);
  const [folderPath] = result.filePaths;
  const filePath = `${folderPath}/${grabCommand.ribbonName}`;
  filePaths.set(ribbonId, filePath);
  return Promise.resolve(`${filePath}-${grabCommand.name}.tiff`);
};
