import { createApiClient } from '@integro/demo-server';
import { all } from '../../packages/core/dist/client';

export const api = createApiClient('http://localhost:8000/api', {
  requestInit: {
    headers: { 'Authorization': 'admin' }
  }
});

console.log('all', await all([
  api.artists.get('mingus'),
  api.artists.create({ name: 'john' }),
  api.artists.upsert({ json: { name: 'joe' }, params: { name: 'john' } }),
]));

// const loginRes = await api.auth.login('1', '2');
// console.log('loginRes:', loginRes)

// const mingus = await api.artists.get('mingus');
// console.log('mingus:', mingus)

// const newArtist1 = await api.artists.create({ name: 'john' })
// console.log('newArtist1:', newArtist1)

// const newArtist1Again = await api.artists.upsert({ json: { name: 'joe' }, params: { name: 'john' } })
// console.log('newArtist1Again:', newArtist1Again)

// const res = await api.repeatString(5, 'echo');
// console.log('res:', res)

// const newArtist2 = await api.artists.creater({ name: '' })
// console.log('newArtist2:', newArtist2)

// const uploadRes = await api.photos.upload({
//   name: "Thelonious-Monk.webp",
//   data: new Uint8Array(
//     await Bun.file("./tmp/Thelonious-Monk.webp").arrayBuffer()
//   ),
// });
// console.log("uploadRes:", uploadRes);

// const deletion = await api.artists.delete('ted');
// console.log('deletion:', deletion)

// const deletion2 = await api.artists.admin.deleteAll();
// console.log('deletion2:', deletion2)

// const found = await api.artists.findFirst({ where: { id: '' }, include: { instruments: true } });
// console.log('found:', found)
