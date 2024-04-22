export const uploadPhoto = async ({
  name,
  data,
}: {
  name: string;
  data: Uint8Array;
}) => {
  await Bun.write(`./photos/${name}`, data);

  return { status: 204 };
};
