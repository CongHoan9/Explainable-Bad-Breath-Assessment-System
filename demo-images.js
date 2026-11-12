/* Exact-byte matching to the paired demo files supplied with this project. */
const DemoImageCatalog = (() => {
  const entries = [
  {
    "id": "demo-01",
    "original": "Ảnh demo/Chưa phân tích/IMG-60DFC4630FAB.jpg",
    "reference": "Ảnh demo/Đã phân tích/IMG-60DFC4630FAB.jpg",
    "originalHash": "84bc5b5d84877c1a70a1a6ccf2c857772ca51f9de681052da086d52fe6b54e09",
    "referenceHash": "0e84e920d7f56fa0d9ef27ba3eaf558b22adefa9a8beb6ea2c7da07e279c30d8"
  },
  {
    "id": "demo-02",
    "original": "Ảnh demo/Chưa phân tích/IMG-1F5AD0CABE4B.jpg",
    "reference": "Ảnh demo/Đã phân tích/IMG-1F5AD0CABE4B.jpg",
    "originalHash": "d6f91da27eaa845f068385ef5bbff9d7cb9868da4d4b06ed416820424ab77bb9",
    "referenceHash": "d9f57d13d78a399d2d1a26d916e913f14a66b848b347b699294e41d5780beceb"
  },
  {
    "id": "demo-03",
    "original": "Ảnh demo/Chưa phân tích/IMG-8EF2BB6CB958.jpg",
    "reference": "Ảnh demo/Đã phân tích/IMG-8EF2BB6CB958.jpg",
    "originalHash": "f29482261b41123d9eeda91f85acaa4ad8770636aa0efe1169f9521b977987fa",
    "referenceHash": "bc07e2b58f4cb9ebfe7e2fc55679442868d4f673707a37d53b75eb5efb9b398e"
  },
  {
    "id": "demo-04",
    "original": "Ảnh demo/Chưa phân tích/IMG-19DF54C4534C.jpg",
    "reference": "Ảnh demo/Đã phân tích/IMG-19DF54C4534C.jpg",
    "originalHash": "6bb66f5528342b8faa54796e93fc4670b32a8b9db779daf5de7c9bb4e810f527",
    "referenceHash": "66afd79988acfcbb6ad95efe2334a13c87fb4a2cb94e74e6545a4c3cd44fd042"
  },
  {
    "id": "demo-05",
    "original": "Ảnh demo/Chưa phân tích/IMG-9103F0114E67.jpg",
    "reference": "Ảnh demo/Đã phân tích/IMG-9103F0114E67.jpg",
    "originalHash": "ec1b0160fa88a87981a7f0d1f89bfeb5b6653a642ae35d8332cad76f8bf8acc1",
    "referenceHash": "f59993ce166defad4db53d809303b0e3d82eaaee0c6a0e034125881cccf151ea"
  },
  {
    "id": "demo-06",
    "original": "Ảnh demo/Chưa phân tích/IMG-15E0752078A3.jpg",
    "reference": "Ảnh demo/Đã phân tích/IMG-15E0752078A3.jpg",
    "originalHash": "01865bf3ccf02a014a12a9352bcba3d8ef988f8dc9069538b02f7ba35b8fa8db",
    "referenceHash": "a71a540048264b9c8fc891df6d4d003ad626f77a98cf7d9202a1f82b8a1349eb"
  },
  {
    "id": "demo-07",
    "original": "Ảnh demo/Chưa phân tích/IMG-8953FA43A2B3.jpg",
    "reference": "Ảnh demo/Đã phân tích/IMG-8953FA43A2B3.jpg",
    "originalHash": "ff678371c7945f7a1c8211d0de135e3457dbb522716ef0daddc96f8f9a2378e8",
    "referenceHash": "4389385e24a61dc3b0b3487eb91c130731ec58b6eb3db04bd7ccff34e39f2a71"
  },
  {
    "id": "demo-08",
    "original": "Ảnh demo/Chưa phân tích/IMG-9A12FA5F159C.jpg",
    "reference": "Ảnh demo/Đã phân tích/IMG-9A12FA5F159C.jpg",
    "originalHash": "48cb20c66cda1b89bbf30ed6411ce7b64968e03b9ae2a0df80d000206bd9efe3",
    "referenceHash": "442e2258c07f5c09a22be478b2039ce5f465315f57b1fe5f9ad7ce03dc63ee29"
  }
];
  function byId(id) { return entries.find(entry => entry.id === id) || null; }
  function byHash(hash) {
    const entry = entries.find(item => item.originalHash === hash || item.referenceHash === hash);
    return entry ? { id: entry.id, role: entry.originalHash === hash ? 'original' : 'reference' } : null;
  }
  return { entries, byId, byHash };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = DemoImageCatalog;
