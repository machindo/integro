import { createClient } from "@integro/demo-server/dist/client";

const authToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

const client = createClient({
  host: "http://localhost:8000",
  middlewares: [
    (req) => {
      const newReq = req.clone();

      newReq.headers.append("Authentication", `Bearer ${authToken}`);

      return newReq;
    },
  ],
});

const version = await client.getVersion();
console.log("version:", version);

const miles = await client.artists.getArtist({ params: { name: "miles" } });
console.log("miles:", miles);

const monk = await client.artists.createArtist({
  json: { name: "monk", dob: new Date("1917-10-10") },
});
console.log("monk:", monk);

const res = await client.artists.getArtists({});
console.log("res:", res);

const uploadRes = await client.photos.uploadPhoto({
  name: "Thelonious-Monk.webp",
  data: new Uint8Array(
    await Bun.file("./tmp/Thelonious-Monk.webp").arrayBuffer()
  ),
});
console.log("uploadRes:", uploadRes);

const photoRes = await client.photos.getPhoto({
  name: "Thelonious-Monk.webp",
});
Bun.write("./tmp/output.webp", photoRes);
