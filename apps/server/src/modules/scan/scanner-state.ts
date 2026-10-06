let up = true;

/** Whether the last attempt to reach the scanner worked. Starts true: nothing has failed yet. */
export const isScannerUp = () => up;
export const setScannerUp = (value: boolean) => {
  up = value;
};
