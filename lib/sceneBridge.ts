type CaptureFn = (options?: { width?: number; height?: number }) => string | null;

let capture: CaptureFn | null = null;

export function registerSceneCapture(fn: CaptureFn): void {
  capture = fn;
}

export function clearSceneCapture(): void {
  capture = null;
}

export function captureScene(options?: { width?: number; height?: number }): string | null {
  if (!capture) return null;
  try {
    return capture(options);
  } catch {
    return null;
  }
}
