import * as fsSync from "fs";

/**
 * Determines if the application is running inside a container environment.
 * Checks common container indicators like /.dockerenv and cgroup file patterns.
 *
 * This function caches its result after the first call for performance.
 *
 * @returns {boolean} True if running in a container, false otherwise.
 */
function isRunningInContainer(): boolean {
  try {
    if (fsSync.existsSync("/.dockerenv")) {
      return true;
    }

    const cgroupContent = fsSync.readFileSync("/proc/self/cgroup", "utf8");
    const containerPatterns = [
      "docker",
      "containerd",
      "lxc",
      "kubepods",
      "pod",
      "/containers/",
      "system.slice/container-",
    ];

    for (const pattern of containerPatterns) {
      if (cgroupContent.includes(pattern)) {
        return true;
      }
    }

    if (fsSync.existsSync("/.well-known/container")) {
      return true;
    }
  } catch (e: unknown) {
    if (e instanceof Error) {
      console.warn("Could not perform full container detection:", e.message);
    }
  }
  return false;
}

export const IS_RUNNING_IN_CONTAINER = isRunningInContainer();
