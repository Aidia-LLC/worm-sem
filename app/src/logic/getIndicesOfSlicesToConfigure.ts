const MAX_SLICES_PER_CHUNK = 5;

function chunkArray<T>(arr: T[]): T[][] {
  const chunks = Math.ceil(arr.length / MAX_SLICES_PER_CHUNK);
  const result: T[][] = new Array(chunks);
  let remainder = arr.length % chunks;
  let startIndex = 0;

  for (let i = 0; i < chunks; i++) {
    let chunkSize = Math.floor(arr.length / chunks);
    if (remainder > 0) {
      chunkSize += 1;
      remainder--;
    }
    result[i] = arr.slice(startIndex, startIndex + chunkSize);
    startIndex += chunkSize;
  }

  return result;
}

function getMedian(arr: number[]) {
  return arr[Math.floor(arr.length / 2)];
}

export function getIndicesOfSlicesToConfigure(length: number) {
  if (length === 0) return [];
  if (length === 1) return [0];
  if (length === 2) return [0, 1];
  if (length < MAX_SLICES_PER_CHUNK)
    return [0, Math.floor(length / 2), length - 1];
  const arr = Array.from({ length: length - 2 }, (_, i) => i + 1);
  const chunks = chunkArray(arr);
  const medians = chunks.map(getMedian);
  return [0, ...medians, length - 1];
}
