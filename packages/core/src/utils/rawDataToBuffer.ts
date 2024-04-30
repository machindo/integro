export const rawDataToBuffer = (data: ArrayBuffer | Buffer | Buffer[]) =>
  data instanceof Buffer
    ? data
    : Array.isArray(data)
      ? Buffer.concat(data)
      : Buffer.from(data);
