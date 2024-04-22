import { createApiClient } from '@integro/demo-server';

export const api = createApiClient('http://localhost:8000', {
  middleware: [req => {
    req.headers.set('Authorization', 'admin')

    return req;
  }]
});

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

const deletion = await api.artists.delete('ted');
console.log('deletion:', deletion)

const deletion2 = await api.artists.admin.deleteAll();
console.log('deletion2:', deletion2)
