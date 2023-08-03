import { platform } from "os";

export const getPlatform = () => {
  switch (platform()) {
    case "darwin":
    case "sunos":
      return "mac";
    case "win32":
      return "win";
    case "aix":
    case "freebsd":
    case "linux":
    case "openbsd":
    case "android":
    default:
      return "linux";
  }
};
