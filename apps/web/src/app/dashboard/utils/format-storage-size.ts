export const formatStorageSize = (sizeInGB: number) => {
  if (sizeInGB >= 1) {
    return `${sizeInGB.toFixed(2)} GB`;
  }

  const sizeInMB = sizeInGB * 1024;

  if (sizeInMB >= 1) {
    return `${sizeInMB.toFixed(2)} MB`;
  }

  const sizeInKB = sizeInMB * 1024;

  if (sizeInKB >= 1) {
    return `${sizeInKB.toFixed(2)} KB`;
  }

  const sizeInB = sizeInKB * 1024;

  return `${Math.round(sizeInB)} B`;
};
