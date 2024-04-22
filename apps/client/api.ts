import { createClient } from '@integro/demo-server';

export const api = createClient('http://localhost:8000');

const mingus = await api.artists.get({ name: 'mingus' });
console.log('mingus:', mingus)

const newArtist1 = await api.artists.create({ name: 'john' })
console.log('newArtist1:', newArtist1)

const newArtist1Again = await api.artists.upsert({ json: { name: 'joe' }, params: { name: 'john' } })
console.log('newArtist1Again:', newArtist1Again)

// @ts-ignore
// const newArtist2 = await api.artists.creater({ name: '' })
// console.log('newArtist2:', newArtist2)

const uploadRes = await api.photos.upload({
  name: "Thelonious-Monk.webp",
  data: new Uint8Array(
    await Bun.file("./tmp/Thelonious-Monk.webp").arrayBuffer()
  ),
});
console.log("uploadRes:", uploadRes);
