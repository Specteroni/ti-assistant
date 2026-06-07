export async function getShareOrigin() {
  const origin = window.location.origin;
  const hostname = window.location.hostname;

  if (hostname !== "localhost" && hostname !== "127.0.0.1") {
    return origin;
  }

  try {
    const response = await fetch("/api/local-network");
    if (!response.ok) {
      return origin;
    }
    const { lanIp } = (await response.json()) as { lanIp?: string };
    if (!lanIp) {
      return origin;
    }
    return `${window.location.protocol}//${lanIp}:${window.location.port}`;
  } catch {
    return origin;
  }
}

export async function getShareGameUrl(gameId: string, locale: string) {
  const origin = await getShareOrigin();
  return `${origin}/${locale}/game/${gameId}`;
}
