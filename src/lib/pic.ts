// Archive photographs have WebP copies at two sizes (scripts/make-webp.mjs).
// pic() turns "/instagram/CODE.jpg" into the attributes that let the browser
// pick the small copy for a small frame. Any other picture is left as it is.
//
//   <img {...pic(src, "(min-width: 768px) 19vw, 52vw")} alt="" />
export function pic(src: string, sizes: string): { src: string; srcSet?: string; sizes?: string } {
  const code = src.match(/^\/instagram\/([\w-]+)\.jpg$/)?.[1];
  if (!code) return { src };
  return {
    src: `/instagram/w/${code}.webp`,
    srcSet: `/instagram/w/${code}-320.webp 320w, /instagram/w/${code}.webp 600w`,
    sizes,
  };
}
