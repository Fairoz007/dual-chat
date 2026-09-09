/**
 * DualStream - YouTube Dual Live Chat Controller
 * Manages URL parsing, iframe generation, responsive views, mobile tab navigation, and OBS mode.
 */

// Storage keys
const STORAGE_KEY = 'dualstream_settings_v1';

// App State
const state = {
  stream1: {
    url: '',
    id: '',
    label: 'Channel 1 (Main)',
    active: false,
    showVideo: false
  },
  stream2: {
    url: '',
    id: '',
    label: 'Channel 2 (Secondary)',
    active: false,
    showVideo: false
  },
  layout: '5050', // '5050' | '6040' | 'vertical'
  mobileTab: 'tab1', // 'tab1' | 'tab2' | 'tabBoth'
  darkChat: true,
  globalShowVideos: false,
  isObsMode: false,
  configCollapsed: false
};

// Known 24/7 YouTube live streams for instant testing
const DEMO_STREAMS = {
  stream1: {
    url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
    id: 'jfKfPfyJRdk',
    label: 'Lofi Girl Live'
  },
  stream2: {
    url: 'https://www.youtube.com/watch?v=4xDzrJKXOOY',
    id: '4xDzrJKXOOY',
    label: 'Synthwave Radio Live'
  }
};

/**
 * Extracts 11-character YouTube video ID from various URL formats or raw ID string.
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/live/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/live_chat?v=VIDEO_ID
 * - Raw 11-char ID
 *
 * @param {string} input - YouTube URL or ID
 * @returns {string|null} - 11 character video ID or null
 */
export function extractYouTubeVideoId(input) {
  if (!input) return null;
  const cleanInput = input.trim();

  // If user pasted a clean 11-char ID directly
  if (/^[a-zA-Z0-9_-]{11}$/.test(cleanInput)) {
    return cleanInput;
  }

  // Common YouTube URL regex patterns
  const patterns = [
    /(?:youtube\.com\/(?:watch\?.*v=|embed\/|live\/|live_chat\?.*v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i,
    /[?&]v=([a-zA-Z0-9_-]{11})/i,
    /\/live\/([a-zA-Z0-9_-]{11})/i
  ];

  for (const regex of patterns) {
    const match = cleanInput.match(regex);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Generates the YouTube Live Chat embed URL.
 * Strictly adheres to YouTube's embed_domain requirement.
 */
function buildChatEmbedUrl(videoId, darkTheme = true) {
  // Use current hostname, or fallback to localhost if empty (e.g. testing)
  const host = window.location.hostname || 'localhost';
  const themeParam = darkTheme ? '&dark_theme=1' : '&dark_theme=0';
  return `https://www.youtube.com/live_chat?v=${videoId}&embed_domain=${encodeURIComponent(host)}${themeParam}`;
}

/**
 * Generates the YouTube Video Player embed URL.
 */
function buildVideoEmbedUrl(videoId) {
  return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&playsinline=1`;
}

// DOM Elements Cache
let elements = {};

function initDOMElements() {
  elements = {
    app: document.getElementById('app'),
    topNav: document.getElementById('topNav'),
    configPanel: document.getElementById('configPanel'),
    btnToggleConfig: document.getElementById('btnToggleConfig'),
    chatViewport: document.getElementById('chatViewport'),
    
    // Inputs & Labels
    inputUrl1: document.getElementById('inputUrl1'),
    inputUrl2: document.getElementById('inputUrl2'),
    labelStream1: document.getElementById('labelStream1'),
    labelStream2: document.getElementById('labelStream2'),
    statusStream1: document.getElementById('statusStream1'),
    statusStream2: document.getElementById('statusStream2'),
    
    // Buttons
    btnLoadStream1: document.getElementById('btnLoadStream1'),
    btnLoadStream2: document.getElementById('btnLoadStream2'),
    btnSwapStreams: document.getElementById('btnSwapStreams'),
    btnLoadDemo: document.getElementById('btnLoadDemo'),
    btnClearAll: document.getElementById('btnClearAll'),
    
    // Toggles
    checkShowVideos: document.getElementById('checkShowVideos'),
    checkDarkChat: document.getElementById('checkDarkChat'),
    saveIndicator: document.getElementById('saveIndicator'),
    
    // Layout buttons
    btnLayout5050: document.getElementById('btnLayout5050'),
    btnLayout6040: document.getElementById('btnLayout6040'),
    btnLayoutVertical: document.getElementById('btnLayoutVertical'),
    
    // Mobile Tabs
    mobileTabs: document.getElementById('mobileTabs'),
    tabBtn1: document.getElementById('tabBtn1'),
    tabBtn2: document.getElementById('tabBtn2'),
    tabBtnBoth: document.getElementById('tabBtnBoth'),
    tabText1: document.getElementById('tabText1'),
    tabText2: document.getElementById('tabText2'),

    // Pane 1 elements
    pane1: document.getElementById('pane1'),
    paneTitle1: document.getElementById('paneTitle1'),
    paneId1: document.getElementById('paneId1'),
    emptyState1: document.getElementById('emptyState1'),
    chatIframe1: document.getElementById('chatIframe1'),
    videoPreview1: document.getElementById('videoPreview1'),
    videoIframe1: document.getElementById('videoIframe1'),
    btnToggleVideo1: document.getElementById('btnToggleVideo1'),
    btnPopout1: document.getElementById('btnPopout1'),
    btnReload1: document.getElementById('btnReload1'),

    // Pane 2 elements
    pane2: document.getElementById('pane2'),
    paneTitle2: document.getElementById('paneTitle2'),
    paneId2: document.getElementById('paneId2'),
    emptyState2: document.getElementById('emptyState2'),
    chatIframe2: document.getElementById('chatIframe2'),
    videoPreview2: document.getElementById('videoPreview2'),
    videoIframe2: document.getElementById('videoIframe2'),
    btnToggleVideo2: document.getElementById('btnToggleVideo2'),
    btnPopout2: document.getElementById('btnPopout2'),
    btnReload2: document.getElementById('btnReload2'),

    // OBS & Fullscreen
    btnObsMode: document.getElementById('btnObsMode'),
    btnExitObs: document.getElementById('btnExitObs'),

    // Help modal
    helpModal: document.getElementById('helpModal'),
    btnOpenHelp: document.getElementById('btnOpenHelp'),
    btnCloseHelp: document.getElementById('btnCloseHelp'),
    btnCloseHelpFooter: document.getElementById('btnCloseHelpFooter'),
    localNetworkAddress: document.getElementById('localNetworkAddress'),
    btnCopyNetAddr: document.getElementById('btnCopyNetAddr')
  };
}

/**
 * Loads and applies saved state from localStorage.
 */
function loadSavedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      if (saved.stream1) Object.assign(state.stream1, saved.stream1);
      if (saved.stream2) Object.assign(state.stream2, saved.stream2);
      if (saved.layout) state.layout = saved.layout;
      if (typeof saved.darkChat === 'boolean') state.darkChat = saved.darkChat;
      if (typeof saved.globalShowVideos === 'boolean') state.globalShowVideos = saved.globalShowVideos;
      if (typeof saved.configCollapsed === 'boolean') state.configCollapsed = saved.configCollapsed;
    }
  } catch (err) {
    console.warn('Could not read saved settings:', err);
  }
}

/**
 * Persists current state to localStorage.
 */
function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      stream1: state.stream1,
      stream2: state.stream2,
      layout: state.layout,
      darkChat: state.darkChat,
      globalShowVideos: state.globalShowVideos,
      configCollapsed: state.configCollapsed
    }));

    if (elements.saveIndicator) {
      elements.saveIndicator.textContent = 'Saved locally';
      elements.saveIndicator.style.color = '#10b981';
      setTimeout(() => {
        if (elements.saveIndicator) {
          elements.saveIndicator.style.color = '';
        }
      }, 1500);
    }
  } catch (err) {
    console.warn('Could not save settings:', err);
  }
}

/**
 * Renders Stream 1 into the UI
 */
function renderStream1() {
  const { url, id, label, showVideo } = state.stream1;
  elements.inputUrl1.value = url;
  elements.labelStream1.value = label;
  elements.paneTitle1.textContent = label;
  elements.tabText1.textContent = label;

  if (id) {
    elements.paneId1.textContent = id;
    elements.statusStream1.textContent = 'Active';
    elements.statusStream1.classList.add('active');
    elements.emptyState1.classList.add('hidden');
    elements.chatIframe1.classList.remove('hidden');

    const targetSrc = buildChatEmbedUrl(id, state.darkChat);
    if (elements.chatIframe1.src !== targetSrc) {
      elements.chatIframe1.src = targetSrc;
    }

    if (showVideo || state.globalShowVideos) {
      elements.videoPreview1.classList.remove('hidden');
      const videoSrc = buildVideoEmbedUrl(id);
      if (elements.videoIframe1.src !== videoSrc) {
        elements.videoIframe1.src = videoSrc;
      }
    } else {
      elements.videoPreview1.classList.add('hidden');
      elements.videoIframe1.src = '';
    }
  } else {
    elements.paneId1.textContent = 'No Stream';
    elements.statusStream1.textContent = 'Not Connected';
    elements.statusStream1.classList.remove('active');
    elements.emptyState1.classList.remove('hidden');
    elements.chatIframe1.classList.add('hidden');
    elements.chatIframe1.src = '';
    elements.videoPreview1.classList.add('hidden');
    elements.videoIframe1.src = '';
  }
}

/**
 * Renders Stream 2 into the UI
 */
function renderStream2() {
  const { url, id, label, showVideo } = state.stream2;
  elements.inputUrl2.value = url;
  elements.labelStream2.value = label;
  elements.paneTitle2.textContent = label;
  elements.tabText2.textContent = label;

  if (id) {
    elements.paneId2.textContent = id;
    elements.statusStream2.textContent = 'Active';
    elements.statusStream2.classList.add('active');
    elements.emptyState2.classList.add('hidden');
    elements.chatIframe2.classList.remove('hidden');

    const targetSrc = buildChatEmbedUrl(id, state.darkChat);
    if (elements.chatIframe2.src !== targetSrc) {
      elements.chatIframe2.src = targetSrc;
    }

    if (showVideo || state.globalShowVideos) {
      elements.videoPreview2.classList.remove('hidden');
      const videoSrc = buildVideoEmbedUrl(id);
      if (elements.videoIframe2.src !== videoSrc) {
        elements.videoIframe2.src = videoSrc;
      }
    } else {
      elements.videoPreview2.classList.add('hidden');
      elements.videoIframe2.src = '';
    }
  } else {
    elements.paneId2.textContent = 'No Stream';
    elements.statusStream2.textContent = 'Not Connected';
    elements.statusStream2.classList.remove('active');
    elements.emptyState2.classList.remove('hidden');
    elements.chatIframe2.classList.add('hidden');
    elements.chatIframe2.src = '';
    elements.videoPreview2.classList.add('hidden');
    elements.videoIframe2.src = '';
  }
}

/**
 * Applies layout mode (50/50, 60/40, vertical)
 */
function applyLayout(layoutName) {
  state.layout = layoutName;
  elements.chatViewport.classList.remove('layout-5050', 'layout-6040', 'layout-vertical');
  elements.chatViewport.classList.add(`layout-${layoutName}`);

  elements.btnLayout5050.classList.toggle('active', layoutName === '5050');
  elements.btnLayout6040.classList.toggle('active', layoutName === '6040');
  elements.btnLayoutVertical.classList.toggle('active', layoutName === 'vertical');

  saveState();
}

/**
 * Applies mobile tab mode ('tab1', 'tab2', 'tabBoth')
 */
function applyMobileTab(tabKey) {
  state.mobileTab = tabKey;
  elements.chatViewport.classList.remove('mobile-show-1', 'mobile-show-2', 'mobile-show-both');

  elements.tabBtn1.classList.toggle('active', tabKey === 'tab1');
  elements.tabBtn2.classList.toggle('active', tabKey === 'tab2');
  elements.tabBtnBoth.classList.toggle('active', tabKey === 'tabBoth');

  if (tabKey === 'tab1') {
    elements.chatViewport.classList.add('mobile-show-1');
  } else if (tabKey === 'tab2') {
    elements.chatViewport.classList.add('mobile-show-2');
  } else {
    elements.chatViewport.classList.add('mobile-show-both');
  }
}

/**
 * Connects Stream 1 from input value
 */
function connectStream1() {
  const raw = elements.inputUrl1.value;
  const id = extractYouTubeVideoId(raw);
  if (id) {
    state.stream1.url = raw;
    state.stream1.id = id;
    state.stream1.active = true;
  } else if (!raw.trim()) {
    state.stream1.url = '';
    state.stream1.id = '';
    state.stream1.active = false;
  } else {
    alert('Please enter a valid YouTube video URL or ID (e.g. youtube.com/watch?v=...)');
    return;
  }
  renderStream1();
  saveState();
}

/**
 * Connects Stream 2 from input value
 */
function connectStream2() {
  const raw = elements.inputUrl2.value;
  const id = extractYouTubeVideoId(raw);
  if (id) {
    state.stream2.url = raw;
    state.stream2.id = id;
    state.stream2.active = true;
  } else if (!raw.trim()) {
    state.stream2.url = '';
    state.stream2.id = '';
    state.stream2.active = false;
  } else {
    alert('Please enter a valid YouTube video URL or ID (e.g. youtube.com/watch?v=...)');
    return;
  }
  renderStream2();
  saveState();
}

/**
 * Swaps Stream 1 and Stream 2
 */
function swapStreams() {
  const temp = { ...state.stream1 };
  state.stream1 = { ...state.stream2 };
  state.stream2 = temp;

  renderStream1();
  renderStream2();
  saveState();
}

/**
 * Loads preset demo streams
 */
function loadDemoStreams() {
  state.stream1.url = DEMO_STREAMS.stream1.url;
  state.stream1.id = DEMO_STREAMS.stream1.id;
  state.stream1.label = DEMO_STREAMS.stream1.label;
  state.stream1.active = true;

  state.stream2.url = DEMO_STREAMS.stream2.url;
  state.stream2.id = DEMO_STREAMS.stream2.id;
  state.stream2.label = DEMO_STREAMS.stream2.label;
  state.stream2.active = true;

  renderStream1();
  renderStream2();
  saveState();
}

/**
 * Clears both streams
 */
function clearAll() {
  if (confirm('Are you sure you want to clear both stream URLs?')) {
    state.stream1.url = '';
    state.stream1.id = '';
    state.stream1.active = false;

    state.stream2.url = '';
    state.stream2.id = '';
    state.stream2.active = false;

    renderStream1();
    renderStream2();
    saveState();
  }
}

/**
 * Opens native YouTube live chat popout window
 */
function openPopoutChat(videoId, title) {
  if (!videoId) {
    alert('Please connect a live stream first.');
    return;
  }
  const popoutUrl = `https://www.youtube.com/live_chat?v=${videoId}&is_popout=1`;
  const width = 450;
  const height = 720;
  const left = (window.screen.width / 2) - (width / 2);
  const top = (window.screen.height / 2) - (height / 2);
  window.open(
    popoutUrl,
    `yt_chat_${videoId}`,
    `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,resizable=yes`
  );
}

/**
 * Toggles OBS Clean Overlay Mode
 */
function toggleObsMode(enable) {
  state.isObsMode = typeof enable === 'boolean' ? enable : !state.isObsMode;
  document.body.classList.toggle('obs-mode', state.isObsMode);
}

/**
 * Toggles Configuration Panel collapse
 */
function toggleConfigCollapse(force) {
  state.configCollapsed = typeof force === 'boolean' ? force : !state.configCollapsed;
  elements.configPanel.classList.toggle('collapsed', state.configCollapsed);
  saveState();
}

/**
 * Sets up all event listeners
 */
function setupEventListeners() {
  // Load buttons & Enter key
  elements.btnLoadStream1.addEventListener('click', connectStream1);
  elements.btnLoadStream2.addEventListener('click', connectStream2);

  elements.inputUrl1.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') connectStream1();
  });
  elements.inputUrl2.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') connectStream2();
  });

  // Label changes
  elements.labelStream1.addEventListener('input', (e) => {
    state.stream1.label = e.target.value || 'Channel 1';
    elements.paneTitle1.textContent = state.stream1.label;
    elements.tabText1.textContent = state.stream1.label;
    saveState();
  });

  elements.labelStream2.addEventListener('input', (e) => {
    state.stream2.label = e.target.value || 'Channel 2';
    elements.paneTitle2.textContent = state.stream2.label;
    elements.tabText2.textContent = state.stream2.label;
    saveState();
  });

  // Center tools
  elements.btnSwapStreams.addEventListener('click', swapStreams);
  elements.btnLoadDemo.addEventListener('click', loadDemoStreams);
  elements.btnClearAll.addEventListener('click', clearAll);

  // Layout controls
  elements.btnLayout5050.addEventListener('click', () => applyLayout('5050'));
  elements.btnLayout6040.addEventListener('click', () => applyLayout('6040'));
  elements.btnLayoutVertical.addEventListener('click', () => applyLayout('vertical'));

  // Mobile Tabs
  elements.tabBtn1.addEventListener('click', () => applyMobileTab('tab1'));
  elements.tabBtn2.addEventListener('click', () => applyMobileTab('tab2'));
  elements.tabBtnBoth.addEventListener('click', () => applyMobileTab('tabBoth'));

  // Toggles
  elements.checkShowVideos.addEventListener('change', (e) => {
    state.globalShowVideos = e.target.checked;
    renderStream1();
    renderStream2();
    saveState();
  });

  elements.checkDarkChat.addEventListener('change', (e) => {
    state.darkChat = e.target.checked;
    renderStream1();
    renderStream2();
    saveState();
  });

  elements.btnToggleConfig.addEventListener('click', () => toggleConfigCollapse());

  // Individual pane controls: Video toggle
  elements.btnToggleVideo1.addEventListener('click', () => {
    state.stream1.showVideo = !state.stream1.showVideo;
    renderStream1();
    saveState();
  });

  elements.btnToggleVideo2.addEventListener('click', () => {
    state.stream2.showVideo = !state.stream2.showVideo;
    renderStream2();
    saveState();
  });

  // Individual pane controls: Popout
  elements.btnPopout1.addEventListener('click', () => {
    openPopoutChat(state.stream1.id, state.stream1.label);
  });
  elements.btnPopout2.addEventListener('click', () => {
    openPopoutChat(state.stream2.id, state.stream2.label);
  });

  // Individual pane controls: Reload
  elements.btnReload1.addEventListener('click', () => {
    if (state.stream1.id) {
      elements.chatIframe1.src = buildChatEmbedUrl(state.stream1.id, state.darkChat);
    }
  });
  elements.btnReload2.addEventListener('click', () => {
    if (state.stream2.id) {
      elements.chatIframe2.src = buildChatEmbedUrl(state.stream2.id, state.darkChat);
    }
  });

  // OBS Mode
  elements.btnObsMode.addEventListener('click', () => toggleObsMode(true));
  elements.btnExitObs.addEventListener('click', () => toggleObsMode(false));

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.isObsMode) {
      toggleObsMode(false);
    }
  });

  // Help Modal
  elements.btnOpenHelp.addEventListener('click', () => {
    elements.localNetworkAddress.textContent = window.location.href;
    elements.helpModal.classList.remove('hidden');
  });

  const closeHelp = () => elements.helpModal.classList.add('hidden');
  elements.btnCloseHelp.addEventListener('click', closeHelp);
  elements.btnCloseHelpFooter.addEventListener('click', closeHelp);
  elements.helpModal.addEventListener('click', (e) => {
    if (e.target === elements.helpModal) closeHelp();
  });

  // Copy local address
  elements.btnCopyNetAddr.addEventListener('click', () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      elements.btnCopyNetAddr.textContent = 'Copied!';
      setTimeout(() => elements.btnCopyNetAddr.textContent = 'Copy', 1500);
    }).catch(() => {});
  });
}

// Initialization on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  initDOMElements();
  loadSavedState();

  // Apply restored toggles
  elements.checkShowVideos.checked = state.globalShowVideos;
  elements.checkDarkChat.checked = state.darkChat;
  if (state.configCollapsed) {
    elements.configPanel.classList.add('collapsed');
  }

  // Render both streams
  renderStream1();
  renderStream2();

  // Apply layout and mobile tabs
  applyLayout(state.layout || '5050');
  applyMobileTab(state.mobileTab || 'tab1');

  // Setup event listeners
  setupEventListeners();

  // Auto-collapse drawer on mobile if streams are active
  if (window.innerWidth <= 768 && (state.stream1.id || state.stream2.id)) {
    toggleConfigCollapse(true);
  }
});
