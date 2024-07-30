import { Signal, useComputed } from '@preact/signals';

const lineLength = 80;

const durationFormat = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 3,
});

export default function useFriendlyLinearCode(
  parts: Signal<string[]>,
  name: Signal<string>,
  idealDuration: Signal<number>,
): Signal<string> {
  return useComputed(() => {
    if (parts.value.length === 0) return '';

    let outputStart = ':root {\n';
    let linearStart = `  --${name}-easing: linear(`;
    let linearEnd = ');';
    let outputEnd = '\n}';
    let lines = [];
    let line = '';

    const lineIndentSize = 4;

    for (const part of parts.value) {
      // 1 for comma
      if (line.length + part.length + lineIndentSize + 1 > lineLength) {
        lines.push(line + ',');
        line = '';
      }
      if (line) line += ', ';
      line += part;
    }

    if (line) lines.push(line);

    if (
      lines.length === 1 &&
      linearStart.length + lines[0].length + linearEnd.length < lineLength
    ) {
      return outputStart + linearStart + lines[0] + linearEnd + outputEnd;
    }

    let idealDurationLine = '';

    if (idealDuration.value !== 0) {
      idealDurationLine = `\n  --${name}-duration: ${durationFormat.format(
        idealDuration.value / 1000,
      )}s;`;
    }

    return (
      outputStart +
      linearStart +
      '\n    ' +
      lines.join('\n    ') +
      '\n  ' +
      linearEnd +
      idealDurationLine +
      outputEnd
    );
  });
}
