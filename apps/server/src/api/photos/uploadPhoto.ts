export const uploadPhoto = async (params: {
  name: string;
  data: Uint8Array;
}) => {
  await Bun.write(`./photos/${params.name}`, params.data);

  return { status: 204 };
};
