import { createClient } from '@integro/demo-server';

export const api = createClient('http://localhost:8000');

const mingus = await api.artists.get({ name: 'mingus' });
console.log('mingus:', mingus)

const newArtist1 = await api.artists.create({ name: 'john' })
console.log('newArtist1:', newArtist1)

// @ts-ignore
const newArtist2 = await api.artists.creater({ name: '' })
console.log('newArtist2:', newArtist2)
