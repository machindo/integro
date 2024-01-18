export const getPhoto = async ({ name }: { name: string }) => {
  const file = Bun.file(`./photos/${name}`);
  const arrayBuffer = await file.arrayBuffer();

  return new Uint8Array(arrayBuffer);
};
