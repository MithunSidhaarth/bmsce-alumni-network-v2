// Batch size for both the initial server-rendered gallery page and every
// subsequent infinite-scroll fetch. Lives outside GalleryGrid.tsx (a "use
// client" file) on purpose: a server component importing a plain constant
// from a client module can get the client reference proxy instead of the
// real value (it evaluated to `undefined` here, turning `.range(0,
// GALLERY_PAGE_SIZE - 1)` into `.range(0, NaN)` and silently returning zero
// rows) — keeping shared constants in a plain module sidesteps that.
export const GALLERY_PAGE_SIZE = 40;
