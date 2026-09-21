"use client";

import { useEffect, useMemo, useRef } from "react";
import { MeshPhongMaterial } from "three";
import Globe, { type GlobeMethods } from "react-globe.gl";
import { feature } from "topojson-client";
import type { FeatureCollection, GeometryObject } from "geojson";
import type { GeometryCollection, Topology } from "topojson-specification";
import { chapters } from "@/data/chapters";
// Bundled locally (Natural Earth 110m, via world-atlas) so the landmass
// outlines never depend on a runtime fetch to a CDN. See src/data/world-110m.json.
import worldTopoJson from "@/data/world-110m.json";

// This module is only ever loaded client-side (dynamic-imported with
// ssr: false from ChapterMap.tsx), so touching `Globe`/`three` here at import
// time never runs during SSR.

// Each chapter renders as two stacked points at the same coordinate: a wider
// navy "ring" underneath and a smaller ivory "disc" on top, at a hair more
// altitude. three-globe's points layer has no native stroke/outline, so this
// is what gives the flat dot marker its outlined look.
type ChapterDot = { lat: number; lng: number; name: string; role: "ring" | "disc" };

// Land is the site's actual deep-maroon token (matches the maroon boxes/cards
// elsewhere), with a darker maroon for country outlines so borders stay
// legible against the solid fill.
const LAND_FILL = "#71293c"; // maroon token
const LAND_STROKE = "#5a1f2f"; // darker maroon, for definition
const LAND_SIDE = "rgba(90, 31, 47, 0.35)"; // darker maroon, low alpha
// Ivory-fill, navy-stroke dot markers so they read clearly against both the
// deep-maroon land and the white ocean.
const DOT_FILL = "#f7f3ec"; // ivory
const DOT_STROKE = "#2f2544"; // navy (oxblood/ink family)
const DOT_RADIUS = 0.9; // ~2x the original 0.45
const RING_RADIUS = 1.15;

// Ocean/base sphere: a plain light ivory fill.
function createOceanMaterial() {
  return new MeshPhongMaterial({ color: "#f8f9fb", shininess: 4 });
}

const worldTopology = worldTopoJson as unknown as Topology;
const worldObjectName = Object.keys(worldTopology.objects)[0];
const worldFeatures = (
  feature(
    worldTopology,
    worldTopology.objects[worldObjectName] as GeometryCollection
  ) as FeatureCollection<GeometryObject>
).features;

export default function ChapterGlobeInner({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);

  const oceanMaterial = useMemo(() => createOceanMaterial(), []);

  const dots = useMemo<ChapterDot[]>(
    () =>
      chapters.flatMap((c) => [
        { lat: c.coordinates[1], lng: c.coordinates[0], name: c.name, role: "ring" as const },
        { lat: c.coordinates[1], lng: c.coordinates[0], name: c.name, role: "disc" as const },
      ]),
    []
  );

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;

    // Gentle autoRotate, paused while the user is dragging and resumed a
    // moment after they let go.
    const controls = globe.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.4;

    let resumeTimer: ReturnType<typeof setTimeout> | undefined;
    const handleStart = () => {
      controls.autoRotate = false;
      clearTimeout(resumeTimer);
    };
    const handleEnd = () => {
      clearTimeout(resumeTimer);
      resumeTimer = setTimeout(() => {
        controls.autoRotate = true;
      }, 2500);
    };
    controls.addEventListener("start", handleStart);
    controls.addEventListener("end", handleEnd);

    // Wheel over the globe must scroll the PAGE, not zoom the globe — same
    // convention as embedded Google Maps: hold Ctrl/Cmd (or pinch on a
    // trackpad, which browsers report as a ctrl-modified wheel event) to
    // zoom. Attached with capture:true on the same canvas OrbitControls
    // listens on, so an unmodified wheel event never reaches its handler and
    // is never preventDefault-ed — the browser's native scroll proceeds.
    // Touch (drag-rotate, two-finger pinch-zoom) is untouched by this; it
    // goes through OrbitControls' separate touch handlers, not wheel.
    const canvas = globe.renderer().domElement;
    const guardWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) e.stopPropagation();
    };
    canvas.addEventListener("wheel", guardWheel, { capture: true });

    return () => {
      controls.removeEventListener("start", handleStart);
      controls.removeEventListener("end", handleEnd);
      canvas.removeEventListener("wheel", guardWheel, {
        capture: true,
      } as EventListenerOptions);
      clearTimeout(resumeTimer);
    };
  }, []);

  return (
    <Globe
      ref={globeRef}
      width={width}
      height={height}
      backgroundColor="rgba(0,0,0,0)"
      showAtmosphere
      atmosphereColor="#d5d7e1"
      atmosphereAltitude={0.18}
      globeMaterial={oceanMaterial}
      polygonsData={worldFeatures}
      polygonCapColor={() => LAND_FILL}
      polygonSideColor={() => LAND_SIDE}
      polygonStrokeColor={() => LAND_STROKE}
      polygonAltitude={0.006}
      pointsData={dots}
      pointLat="lat"
      pointLng="lng"
      pointColor={(d) => ((d as ChapterDot).role === "ring" ? DOT_STROKE : DOT_FILL)}
      pointRadius={(d) => ((d as ChapterDot).role === "ring" ? RING_RADIUS : DOT_RADIUS)}
      pointAltitude={(d) => ((d as ChapterDot).role === "ring" ? 0.008 : 0.009)}
      pointResolution={24}
      pointsMerge={false}
      pointLabel={(d) =>
        `<div style="background:${DOT_FILL};color:${DOT_STROKE};border:1px solid ${DOT_STROKE};padding:3px 8px;border-radius:3px;font:600 11px/1.2 var(--font-sans, ui-sans-serif, system-ui, sans-serif);white-space:nowrap;">${
          (d as ChapterDot).name
        }</div>`
      }
    />
  );
}
