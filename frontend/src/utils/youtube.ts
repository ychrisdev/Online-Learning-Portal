// utils/youtube.ts

export type VideoType = 'youtube' | 'vimeo' | 'direct' | 'none';

export interface VideoEmbed {
  type: VideoType;
  embedUrl: string;
  videoId?: string;
}

export const getVideoEmbed = (url: string): VideoEmbed => {
  if (!url?.trim()) return { type: 'none', embedUrl: '' };

  // ── YouTube ──────────────────────────────────────────────────────
  // Hỗ trợ:
  //   https://www.youtube.com/watch?v=VIDEO_ID
  //   https://www.youtube.com/watch?v=VIDEO_ID&list=...&index=...
  //   https://youtu.be/VIDEO_ID
  //   https://youtu.be/VIDEO_ID?si=...
  //   https://www.youtube.com/embed/VIDEO_ID
  //   https://www.youtube.com/shorts/VIDEO_ID
  const youtubeRegex =
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const ytMatch = url.match(youtubeRegex);
  if (ytMatch) {
    const videoId = ytMatch[1];
    return {
      type: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`,
      videoId,
    };
  }

  // ── Vimeo ────────────────────────────────────────────────────────
  // https://vimeo.com/123456789
  // https://player.vimeo.com/video/123456789
  const vimeoRegex = /vimeo\.com\/(?:video\/)?(\d+)/;
  const vimeoMatch = url.match(vimeoRegex);
  if (vimeoMatch) {
    return {
      type: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
      videoId: vimeoMatch[1],
    };
  }

  // ── Direct URL (mp4, webm, ogg...) ──────────────────────────────
  return { type: 'direct', embedUrl: url };
};