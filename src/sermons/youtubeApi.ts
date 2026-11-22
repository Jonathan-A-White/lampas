// src/sermons/youtubeApi.ts — the YouTube IFrame Player API (https://developers.google.com/youtube/iframe_api_reference), loaded once, from youtube.com, the first time a YouTube sermon is played (mw-qtu3zvz.83).
// The player it makes is drawn from youtube-nocookie.com (the `host` option). Nothing is loaded until then.
export interface YouTubePlayer {
  playVideo(): void;
  pauseVideo(): void;
  stopVideo(): void;
  seekTo(seconds: number, allowSeekAhead?: boolean): void;
  getCurrentTime(): number;
  destroy(): void;
}
export interface YouTubeEvents {
  onReady?: (event: { target: YouTubePlayer }) => void;
  onStateChange?: (event: { data: number }) => void;
  onAutoplayBlocked?: (event: object) => void;
  onError?: (event: { data: number }) => void;
}
export interface YouTubeApi {
  Player: new (target: HTMLElement, options: { host?: string; videoId: string; width?: string; height?: string; playerVars?: Record<string, number | string>; events?: YouTubeEvents }) => YouTubePlayer;
}

const SCRIPT = 'https://www.youtube.com/iframe_api';
let loading: Promise<YouTubeApi> | undefined;

const ready = (): YouTubeApi | undefined => (window as unknown as { YT?: YouTubeApi }).YT?.Player ? (window as unknown as { YT: YouTubeApi }).YT : undefined;

/** The API, loading its script on the first call; it fails (and tries again next time) where the script cannot be reached. */
export function loadYouTube(): Promise<YouTubeApi> {
  const now = ready();
  if (now) return Promise.resolve(now);
  loading ??= new Promise<YouTubeApi>((resolve, reject) => {
    const w = window as unknown as { onYouTubeIframeAPIReady?: () => void };
    const before = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      before?.();
      const api = ready();
      if (api) resolve(api);
      else reject(new Error('The YouTube player did not load'));
    };
    const script = document.createElement('script');
    script.src = SCRIPT;
    script.async = true;
    script.onerror = () => reject(new Error('The YouTube player could not be reached'));
    document.head.appendChild(script);
  }).catch((error: unknown) => {
    loading = undefined;
    throw error;
  });
  return loading;
}
