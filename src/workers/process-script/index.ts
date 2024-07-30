import {
  ProcessScriptData,
  PostMessageError,
  LinearData,
  ProcessSVGData,
  ProcessResult,
} from 'shared-types/index';
import parseStack from './error-stack-parser';
import { svgPathProperties as SVGPathProperties } from 'svg-path-properties';

function isProcessScriptData(data: any): data is ProcessScriptData {
  return data.action === 'process-script';
}

function isProcessSVGData(data: any): data is ProcessSVGData {
  return data.action === 'process-svg';
}

type EasingFunc = (value: number) => unknown;

const pointsLength = 10_000;

function processScriptData(script: string): ProcessResult {
  const oldGlobals = Object.keys(self);

  // Using importScripts rather than eval, as it gives better stack traces.
  // But also wrapping in a function, so things aren't global by default.
  importScripts(
    `data:text/javascript,${encodeURIComponent(`(() => {${script};})()`)}`,
  );

  let easingFunc: EasingFunc | undefined;

  // Look for a new global
  const newGlobals = new Set(Object.keys(self));
  for (const key of oldGlobals) newGlobals.delete(key);

  // Remove any non-functions
  for (const key of newGlobals) {
    // @ts-ignore
    if (typeof self[key] !== 'function') newGlobals.delete(key);
  }

  if (newGlobals.size > 1) {
    throw Error(
      'Too many global functions. Found: ' + [...newGlobals].join(', '),
    );
  }

  if (newGlobals.size === 0) {
    throw Error('No global function found.');
  }

  const [key] = newGlobals;
  // @ts-ignore
  easingFunc = self[key] as EasingFunc;

  return {
    name: key.replace(/[A-Z]/g, (match) => '-' + match.toLowerCase()),
    points: Array.from({ length: pointsLength }, (_, i) => {
      const pos = i / (pointsLength - 1);
      return [pos, Number(easingFunc!(pos))];
    }),
    duration:
      'duration' in self && typeof self.duration === 'number'
        ? self.duration || 0
        : 0,
  };
}

function processSVGData(pathData: string): ProcessResult {
  const parsedPath = new SVGPathProperties(pathData);
  const totalLength = parsedPath.getTotalLength();

  if (totalLength === 0) throw new TypeError('Path is zero length');

  let lastX = -Infinity;

  const points: LinearData = Array.from({ length: pointsLength }, (_, i) => {
    const pos = (i / (pointsLength - 1)) * totalLength;
    const point = parsedPath.getPointAtLength(pos);

    // Prevent paths going back on themselves
    lastX = Math.max(lastX, point.x);
    return [lastX, point.y];
  });

  return {
    name: 'custom',
    points,
    duration: 0,
  };
}

let used = false;

onmessage = ({ data }) => {
  // The scripts we're receiving are not trusted.
  // Ensure we're running them on a null origin.
  if (origin !== 'null') return;
  if (typeof data !== 'object' || data === null) return;

  if (isProcessScriptData(data) || isProcessSVGData(data)) {
    const { port, script } = data;

    if (used) {
      const error: PostMessageError = { message: 'Worker already used' };
      port.postMessage({ error });
      return;
    }

    used = true;

    try {
      const result =
        data.action === 'process-svg'
          ? processSVGData(script)
          : processScriptData(script);

      port.postMessage({ result });
    } catch (error) {
      const errorDetails: PostMessageError = {
        ...parseStack(error as Error),
        message: (error as Error).message,
      };
      port.postMessage({ error: errorDetails });
      throw error;
    }
  }
};
