# Master Prompt & Architecture Specification: Dual YouTube Live Chat Hub

This document contains both the **Ready-to-Use Master AI Prompt** and a comprehensive **Technical Architecture & Mechanism Guide** explaining how simultaneous YouTube live chat embedding, mobile responsiveness, and URL parsing operate.

---

## Part 1: The Master Prompt

You can copy and paste the prompt below into any AI model, developer specification, or coding assistant to recreate or extend this system:

```markdown
You are a senior full-stack web engineer. Build a responsive, high-performance web application called "DualStream" that allows content creators who multi-stream to two YouTube channels simultaneously to monitor both live chats in real-time side-by-side on desktop, or via intuitive tabs on mobile devices.

### Functional Requirements:
1. **URL Input & Extraction**:
   - Provide two distinct input fields for Stream 1 and Stream 2 with editable channel labels.
   - Accept any valid YouTube URL format (e.g., `youtube.com/watch?v=ID`, `youtu.be/ID`, `youtube.com/live/ID`, `youtube.com/live_chat?v=ID`) or a raw 11-character video ID.
   - Include a "Swap Channels" button, a "Load Demo" button, and an auto-save mechanism that persists entered URLs to `localStorage`.

2. **YouTube Live Chat Embedding**:
   - Render YouTube's official live chat iframe for each stream using the endpoint:
     `https://www.youtube.com/live_chat?v={VIDEO_ID}&embed_domain={CURRENT_HOSTNAME}&dark_theme=1`
   - Dynamically compute `{CURRENT_HOSTNAME}` using `window.location.hostname` (fallback to `localhost`) to satisfy YouTube's strict embed security check.
   - Add a "Pop-out" button on each chat pane to launch YouTube's native popup window (`https://www.youtube.com/live_chat?v={VIDEO_ID}&is_popout=1`) for direct interaction or moderator tools.
   - Add a reload button to easily refresh individual chat connections if a stream disconnects.
   - Include an optional collapsible 16:9 video preview player for each stream.

3. **Responsive Mobile & Desktop Layouts**:
   - **Desktop**: Side-by-side split view with layout presets: 50/50 split, 65/35 focus view, and vertical stacked view.
   - **Mobile (≤768px)**: Render a clean segmented tab navigation (`[ Channel 1 ] [ Channel 2 ] [ Split Stack ]`) so mobile users can effortlessly switch between chats or view both stacked vertically without clutter.
   - Use dynamic viewport heights (`100dvh`) to prevent address bar jitter on iOS Safari and Android Chrome.

4. **OBS Studio & Clean Overlay Mode**:
   - Provide a 1-click "OBS Mode" that strips headers, navigation bars, and settings drawers, displaying only the borderless chats.
   - Support keyboard escape (`Esc`) and floating exit banner to return to normal mode.

5. **Aesthetics & Technology**:
   - Use clean, modern semantic HTML5, Vanilla CSS, and Vanilla JavaScript with Vite for instant dev server execution and `--host` LAN support.
   - Dark gaming/streamer aesthetic with glassmorphic top navigation, glowing channel badges (e.g. Neon Red for Stream 1, Electric Violet for Stream 2), and clean empty states.
```

---

## Part 2: How These Things Work (Deep Dive)

### 1. How YouTube Live Chat Embedding Works

YouTube does not allow embedding standard YouTube video player chats unless you target their dedicated `live_chat` endpoint:

```
https://www.youtube.com/live_chat?v={VIDEO_ID}&embed_domain={HOSTNAME}&dark_theme=1
```

#### The `embed_domain` Requirement
- **Why it is required:** YouTube uses HTTP referer and origin verification to prevent unauthorized framing (clickjacking and cross-site framing). If the `embed_domain` parameter does not match the actual domain in the browser's address bar, YouTube will block the iframe or show a connection error.
- **Why `file:///` fails:** If you double-click an `index.html` file locally, the protocol is `file:///` and `window.location.hostname` is an empty string (`""`). YouTube rejects this.
- **The Solution:** The app must be served via HTTP(S) (e.g., `http://localhost:5173` or your local Wi-Fi IP `http://192.168.x.x:5173`). Our script automatically inspects `window.location.hostname` and injects it into the iframe URL.

```javascript
const host = window.location.hostname || 'localhost';
const chatUrl = `https://www.youtube.com/live_chat?v=${videoId}&embed_domain=${encodeURIComponent(host)}&dark_theme=1`;
```

---

### 2. URL Parsing and Video ID Extraction

YouTube URLs come in multiple formats depending on how the user copies them:

| Format Type | Example URL |
| :--- | :--- |
| **Standard Watch** | `https://www.youtube.com/watch?v=jfKfPfyJRdk` |
| **Short Link** | `https://youtu.be/jfKfPfyJRdk` |
| **Live Stream Link** | `https://www.youtube.com/live/jfKfPfyJRdk` |
| **Embed Link** | `https://www.youtube.com/embed/jfKfPfyJRdk` |
| **Live Chat Link** | `https://www.youtube.com/live_chat?v=jfKfPfyJRdk` |
| **Raw ID** | `jfKfPfyJRdk` |

#### Regular Expression Strategy:
All standard YouTube video IDs consist of exactly **11 characters** chosen from `[a-zA-Z0-9_-]`. The parser performs the following checks:

```javascript
export function extractYouTubeVideoId(input) {
  if (!input) return null;
  const clean = input.trim();

  // 1. Check if raw 11-char ID was entered directly
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) {
    return clean;
  }

  // 2. Extract from standard URL paths and query parameters
  const patterns = [
    /(?:youtube\.com\/(?:watch\?.*v=|embed\/|live\/|live_chat\?.*v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i,
    /[?&]v=([a-zA-Z0-9_-]{11})/i,
    /\/live\/([a-zA-Z0-9_-]{11})/i
  ];

  for (const regex of patterns) {
    const match = clean.match(regex);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}
```

---

### 3. Responsive Mobile Architecture

Smartphones have narrow screens (360px - 430px wide). Displaying two YouTube chats side-by-side on a 390px mobile screen makes each chat under 190px wide, which squishes chat text and renders message buttons unreadable.

#### The Mobile Solution:
1. **Segmented Switcher Tabs (`tab1`, `tab2`, `tabBoth`)**:
   - On screens `<= 768px`, the horizontal split switches to tab mode.
   - The user can tap `Channel 1` to view Stream 1's chat full-width.
   - The user can tap `Channel 2` to view Stream 2's chat full-width.
   - The user can tap `Both (Split)` to view both stacked vertically (top & bottom 50/50).
2. **Dynamic Viewport Units (`100dvh`)**:
   - Mobile browsers (Safari on iOS, Chrome on Android) expand and retract their address and navigation bars as you scroll.
   - Using `height: 100dvh` (Dynamic Viewport Height) prevents chat cut-off and unwanted rubber-banding.
3. **Touch Targets**:
   - All buttons have minimum dimensions of 40px × 40px to ensure effortless tapping during fast-paced live streaming.

---

### 4. OBS Studio Browser Source Integration

Streamers often want their live chats visible inside OBS Studio:

1. **Clean / OBS Mode**:
   - Triggered by clicking **OBS Mode** or visiting the page with `?obs=1`.
   - The navigation bar, configuration drawers, and padding are hidden via `.obs-mode`.
   - The two chat panes fill 100% of the browser source window.
2. **OBS Browser Source Settings**:
   - **URL**: `http://localhost:5173`
   - **Width**: `800` (for dual column) or `400` (for single column)
   - **Height**: `1080` (or `720`)
   - **Custom CSS**: Can optionally set `body { background-color: transparent !important; }`.

---

### 5. Authentication & Third-Party Cookies Note

- In modern browsers, YouTube live chat iframes may require third-party cookies enabled to send chat messages while signed into Google.
- If third-party cookies are blocked, users can still **view** the chats in real-time.
- For full moderation actions (banning trolls, pinning messages) or chatting while signed in, click the **Pop-out Chat** icon (<svg style="width:12px;height:12px;display:inline-block;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>) in either chat header to launch the native YouTube chat popout window.
