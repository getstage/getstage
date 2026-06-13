export function buildStitchProjectUrl(projectId: string) {
  return `https://stitch.withgoogle.com/projects/${projectId}`;
}

export function extractStitchProjectIdFromUrl(url: string) {
  const match = url.match(/\/projects\/([^/?#]+)/i);
  return match?.[1];
}
