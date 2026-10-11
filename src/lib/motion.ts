// Whether animation should run. Motion is always on for every visitor (the
// site deliberately does not follow the device's "reduce motion" setting), so
// this is only false while rendering on the server.
export function motionOK(): boolean {
  return typeof window !== "undefined";
}
