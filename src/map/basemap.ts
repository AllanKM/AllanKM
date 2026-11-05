import { BOUNDS, pointAlong, toCanvas, WORLD_DEPTH, WORLD_WIDTH, type LngLat } from "../data/geo.ts";
import { allStreets, avenueLine, lagoonShape, shoreLine } from "../data/streets.ts";

function trace(ctx: CanvasRenderingContext2D, points: LngLat[], width: number, height: number) {
  points.forEach((point, index) => {
    const projected = toCanvas(point.lng, point.lat, width, height);
    if (index === 0) ctx.moveTo(projected.x, projected.y);
    else ctx.lineTo(projected.x, projected.y);
  });
}

function fillShape(
  ctx: CanvasRenderingContext2D,
  points: LngLat[],
  width: number,
  height: number,
  color: string,
) {
  ctx.beginPath();
  trace(ctx, points, width, height);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function strokeStreet(
  ctx: CanvasRenderingContext2D,
  points: LngLat[],
  width: number,
  height: number,
  color: string,
  lineWidth: number,
) {
  ctx.beginPath();
  trace(ctx, points, width, height);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();
}

function parkShape(): LngLat[] {
  const shore = shoreLine();
  const avenue = avenueLine();
  const south = Array.from({ length: 8 }, (_, index) => pointAlong(shore, 0.02 + (0.28 * index) / 7, 0));
  const north = Array.from({ length: 8 }, (_, index) => pointAlong(avenue, 0.3 - (0.28 * index) / 7, 0));
  return [...south, ...north];
}

function drawLabel(
  ctx: CanvasRenderingContext2D,
  name: string,
  points: LngLat[],
  width: number,
  height: number,
) {
  const start = pointAlong(points, 0.4, 0);
  const end = pointAlong(points, 0.56, 0);
  const middle = pointAlong(points, 0.48, 0);
  const from = toCanvas(start.lng, start.lat, width, height);
  const to = toCanvas(end.lng, end.lat, width, height);
  const at = toCanvas(middle.lng, middle.lat, width, height);
  let angle = Math.atan2(to.y - from.y, to.x - from.x);
  if (angle > Math.PI / 2 || angle < -Math.PI / 2) angle += Math.PI;
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(angle);
  ctx.font = "600 36px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.lineWidth = 8;
  ctx.strokeStyle = "rgba(8, 10, 14, 0.9)";
  ctx.strokeText(name, 0, -12);
  ctx.fillStyle = "rgba(232, 238, 246, 0.95)";
  ctx.fillText(name, 0, -12);
  ctx.restore();
}

export function drawBasemap(): HTMLCanvasElement {
  const width = 2048;
  const height = Math.round(width * (WORLD_DEPTH / WORLD_WIDTH));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.fillStyle = "#09111a";
  ctx.fillRect(0, 0, width, height);

  const shore = shoreLine();
  const land = [
    { lng: BOUNDS.west, lat: BOUNDS.north },
    { lng: BOUNDS.east, lat: BOUNDS.north },
    { lng: BOUNDS.east, lat: shore[shore.length - 1].lat },
    ...shore.slice().reverse(),
    { lng: BOUNDS.west, lat: shore[0].lat },
  ];
  fillShape(ctx, land, width, height, "#141922");
  fillShape(ctx, lagoonShape(), width, height, "#0d1824");
  fillShape(ctx, parkShape(), width, height, "#15201c");

  for (const street of allStreets()) {
    if (street.major) continue;
    strokeStreet(ctx, street.points, width, height, "rgba(132, 150, 170, 0.38)", 3);
  }
  for (const street of allStreets()) {
    if (!street.major) continue;
    strokeStreet(ctx, street.points, width, height, "rgba(226, 234, 244, 0.88)", street.weight >= 16 ? 8 : 5.5);
  }
  strokeStreet(ctx, shore, width, height, "rgba(92, 84, 70, 0.85)", 4);

  for (const street of allStreets()) {
    if (street.weight < 10) continue;
    drawLabel(ctx, street.name, street.points, width, height);
  }

  return canvas;
}
