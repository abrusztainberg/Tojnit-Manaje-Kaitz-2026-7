/* Muestra las imágenes del ZIP agregado al repositorio sin necesidad de extraerlo. */
(async function () {
  const images = Array.from(document.querySelectorAll("img[data-zip-path]"));
  if (!images.length) return;
  try {
    if (!window.JSZip) throw new Error("JSZip no se cargó");
    const response = await fetch("imagenes-or-jadash.zip");
    if (!response.ok) throw new Error("No se encontró el ZIP de imágenes");
    const zip = await window.JSZip.loadAsync(await response.arrayBuffer());
    const urls = new Map();
    await Promise.all(images.map(async img => {
      const path = img.dataset.zipPath;
      if (!urls.has(path)) {
        const entry = zip.file(path);
        if (!entry) throw new Error("No se encontró " + path + " dentro del ZIP");
        const bytes = await entry.async("blob");
        const type = path.endsWith(".png") ? "image/png" : "image/jpeg";
        urls.set(path, URL.createObjectURL(new Blob([bytes], {type})));
      }
      img.src = urls.get(path);
    }));
  } catch (error) {
    console.error("No se pudieron cargar las imágenes del majané:", error);
    images.forEach(img => { img.hidden = true; });
  }
})();