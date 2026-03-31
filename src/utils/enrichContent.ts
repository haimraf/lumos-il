/**
 * enrichContent — מעשיר תוכן HTML של פוסטים בפורום:
 * 1. YouTube URLs → iframes מוטמעים
 * 2. URLs גולמיים (שאינם בתוך תגית <a>) → לינקים לחיצים
 */

const YT_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[^\s"<]*)?/g;

const URL_REGEX = /(?<![="'>])\b(https?:\/\/[^\s<>"']+)/g;

function escapeAttr(value: string): string {
    return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function extractYouTubeId(url: string): string | null {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
}

export function enrichContent(html: string): string {
    if (!html) return html;

    // שלב 1: החלף YouTube URLs (שאינם בתוך href) ב-iframe
    let result = html.replace(YT_REGEX, (match) => {
        const videoId = extractYouTubeId(match);
        if (!videoId) return match;
        return `
<div class="yt-embed-wrapper">
  <iframe
    src="https://www.youtube-nocookie.com/embed/${videoId}"
    title="סרטון YouTube"
    frameborder="0"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    allowfullscreen
    loading="lazy"
  ></iframe>
</div>`;
    });

    // שלב 2: URLs גולמיים שנשארו (לא בתוך href ולא YouTube) → <a>
    // מסמן תגיות HTML כדי לא לגעת בהן
    result = result.replace(/>([^<]+)</g, (fullMatch, textNode) => {
        const linked = textNode.replace(URL_REGEX, (url: string) => {
            const display = url.length > 55 ? url.slice(0, 52) + "…" : url;
            const isYouTube = /(?:youtube\.com|youtu\.be)/.test(url);
            if (isYouTube) return url; // כבר טופל
            return `<a href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer" class="post-link">${display}</a>`;
        });
        return `>${linked}<`;
    });

    return result;
}
