
const { addonBuilder } = require("stremio-addon-sdk");
const axios = require("axios");
const parser = require("m3u8-parser");

const M3U_URL = "https://raw.githubusercontent.com/c105/iptvrepo/refs/heads/main/tv.m3u"; // replace with your .m3u/.m3u8

const manifest = {
  id: "community.m3u.addon",
  version: "1.0.0",
  name: "My M3U Playlist Addon",
  description: "Streams from my custom M3U playlist",
  resources: ["catalog", "stream"],
  types: ["tv"], // can be "movie", "series", etc.
  idPrefixes: ["m3u_"],
  catalogs: [
    {
      type: "tv",
      id: "m3u_tv_catalog",
      name: "My Live TV"
    }
  ]
};

const builder = new addonBuilder(manifest);

// Cache playlist
let playlist = [];

async function loadPlaylist() {
  try {
    const res = await axios.get(M3U_URL);
    const lines = res.data.split("\n");
    let current = {};
    lines.forEach(line => {
      if (line.startsWith("#EXTINF")) {
        const nameMatch = line.match(/,(.*)/);
        current = { name: nameMatch ? nameMatch[1] : "Unknown", url: "" };
      } else if (line.startsWith("http")) {
        current.url = line.trim();
        if (current.name && current.url) {
          playlist.push({ ...current });
        }
      }
    });
  } catch (err) {
    console.error("Failed to load M3U:", err.message);
  }
}

builder.defineCatalogHandler(async () => {
  if (playlist.length === 0) await loadPlaylist();
  const metas = playlist.map((item, i) => ({
    id: "m3u_" + i,
    type: "tv",
    name: item.name,
    poster: "https://img.icons8.com/color/480/antenna.png",
    background: "",
    description: item.url
  }));
  return { metas };
});

builder.defineStreamHandler(({ id }) => {
  const index = parseInt(id.split("_")[1]);
  const item = playlist[index];
  if (!item) return { streams: [] };

  return {
    streams: [
      {
        title: item.name,
        url: item.url
      }
    ]
  };
});

module.exports = builder.getInterface();
