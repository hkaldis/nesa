/* Photos. Camera or file input, downscaled on the way in (a modern phone photo
   is ~4 MB; stored at 1280 px it is ~200 KB), kept as blobs in IndexedDB and
   handed to the UI as cached object URLs. */
(function (App) {
  'use strict';

  const util = App.util;
  const store = App.store;

  const MAX_EDGE = 1280;
  const THUMB_EDGE = 320;
  const QUALITY = 0.82;

  const urlCache = Object.create(null);

  const photos = {};

  function loadImage(file) {
    return new Promise(function (resolve, reject) {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = function () { URL.revokeObjectURL(url); resolve(image); };
      image.onerror = function () { URL.revokeObjectURL(url); reject(new Error('Could not read that image')); };
      image.src = url;
    });
  }

  function resize(image, maxEdge) {
    const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    return new Promise(function (resolve) {
      if (canvas.toBlob) canvas.toBlob(function (blob) { resolve(blob); }, 'image/jpeg', QUALITY);
      else resolve(dataUrlToBlob(canvas.toDataURL('image/jpeg', QUALITY)));
    });
  }

  function dataUrlToBlob(dataUrl) {
    const parts = dataUrl.split(',');
    const mime = (parts[0].match(/:(.*?);/) || [])[1] || 'image/jpeg';
    const binary = atob(parts[1]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  photos.dataUrlToBlob = dataUrlToBlob;

  photos.blobToDataUrl = function (blob) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(reader.error); };
      reader.readAsDataURL(blob);
    });
  };

  /* Store one file, returning the photo id to attach to a tool. */
  photos.add = function (file) {
    if (!file || !/^image\//.test(file.type)) return Promise.reject(new Error('Not an image file'));
    return loadImage(file).then(function (image) {
      return Promise.all([resize(image, MAX_EDGE), resize(image, THUMB_EDGE)]).then(function (blobs) {
        const record = {
          id: util.uid(),
          full: blobs[0],
          thumb: blobs[1],
          width: image.width,
          height: image.height,
          type: 'image/jpeg',
          addedAt: new Date().toISOString()
        };
        return store.savePhoto(record).then(function () { return record.id; });
      });
    });
  };

  /* Fetch an image that ships with the app and run it through the same resize
     and storage path as a camera photo. */
  photos.addFromUrl = function (url) {
    return fetch(url).then(function (response) {
      if (!response.ok) throw new Error('Could not load ' + url);
      return response.blob();
    }).then(function (blob) {
      if (!/^image\//.test(blob.type)) throw new Error('Not an image: ' + url);
      return photos.add(blob);
    });
  };

  photos.addMany = function (fileList) {
    const files = Array.prototype.slice.call(fileList || []);
    return files.reduce(function (chain, file) {
      return chain.then(function (ids) {
        return photos.add(file).then(function (id) { return ids.concat([id]); })
          .catch(function (err) { console.warn('Skipped a photo:', err.message); return ids; });
      });
    }, Promise.resolve([]));
  };

  /* Object URLs are cached per photo id + variant so scrolling the grid does
     not leak a new URL on every render. */
  photos.url = function (id, variant) {
    const key = id + ':' + (variant || 'thumb');
    if (urlCache[key]) return Promise.resolve(urlCache[key]);
    return store.getPhoto(id).then(function (record) {
      if (!record) return null;
      const blob = record[variant === 'full' ? 'full' : 'thumb'] || record.full || record.thumb;
      if (!blob) return null;
      const url = typeof blob === 'string' ? blob : URL.createObjectURL(blob);
      urlCache[key] = url;
      return url;
    });
  };

  /* Set an <img> src once its blob resolves; safe to call during render. */
  photos.bind = function (imgEl, id, variant) {
    photos.url(id, variant).then(function (url) {
      if (url) imgEl.src = url;
      else imgEl.classList.add('is-missing');
    }).catch(function () { imgEl.classList.add('is-missing'); });
    return imgEl;
  };

  photos.remove = function (id) {
    ['thumb', 'full'].forEach(function (variant) {
      const key = id + ':' + variant;
      if (urlCache[key]) { URL.revokeObjectURL(urlCache[key]); delete urlCache[key]; }
    });
    return store.deletePhoto(id);
  };

  /* Export/import: photos travel as data URLs inside the JSON backup. */
  photos.exportAll = function () {
    return store.allPhotos().then(function (records) {
      return records.reduce(function (chain, record) {
        return chain.then(function (out) {
          const encode = function (blob) {
            return typeof blob === 'string' ? Promise.resolve(blob) : photos.blobToDataUrl(blob);
          };
          return Promise.all([encode(record.full), encode(record.thumb)]).then(function (urls) {
            out.push({ id: record.id, full: urls[0], thumb: urls[1], addedAt: record.addedAt });
            return out;
          });
        });
      }, Promise.resolve([]));
    });
  };

  photos.importAll = function (records) {
    return (records || []).reduce(function (chain, record) {
      return chain.then(function () {
        return store.savePhoto({
          id: record.id,
          full: typeof record.full === 'string' ? dataUrlToBlob(record.full) : record.full,
          thumb: typeof record.thumb === 'string' ? dataUrlToBlob(record.thumb) : record.thumb,
          type: 'image/jpeg',
          addedAt: record.addedAt || new Date().toISOString()
        });
      });
    }, Promise.resolve());
  };

  App.photos = photos;
})(window.App = window.App || {});
