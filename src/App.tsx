import {
  BatteryMedium,
  Bookmark,
  BriefcaseBusiness,
  Camera,
  Check,
  ChevronDown,
  CircleHelp,
  Download,
  Heart,
  House,
  ImagePlus,
  Menu,
  MessageCircle,
  Moon,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Radio,
  Repeat2,
  Search,
  Send,
  Share2,
  Signal,
  Smartphone,
  Sun,
  Trash2,
  UploadCloud,
  UserRound,
  Video,
  Wifi,
  X,
} from 'lucide-react';
import { toPng } from 'html-to-image';
import type React from 'react';
import {
  ChangeEvent,
  DragEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

const PUBLIC_BASE = import.meta.env.BASE_URL;

type AssetKind = 'image' | 'video';
type PlacementId = 'ig-reel' | 'ig-story' | 'ig-feed' | 'fb-feed';
type PreviewMode = 'phone' | 'creative';
type FitMode = 'fit' | 'fill';
type Theme = 'dark' | 'light';

const THEME_STORAGE_KEY = 'placement-theme-v2';

type CreativeAsset = {
  id: string;
  name: string;
  src: string;
  kind: AssetKind;
  mime: string;
  width: number;
  height: number;
  sample?: boolean;
};

type Placement = {
  id: PlacementId;
  short: string;
  title: string;
  platform: 'Instagram' | 'Facebook';
  recommendedRatio: number;
  recommendedLabel: string;
  canvasWidth: number;
  canvasHeight: number;
};

const SAMPLE: CreativeAsset = {
  id: 'sample-creative',
  name: 'Demo creative',
  src: `${PUBLIC_BASE}demo-creative.svg`,
  kind: 'image',
  mime: 'image/svg+xml',
  width: 1080,
  height: 1920,
  sample: true,
};

const PLACEMENTS: Placement[] = [
  { id: 'ig-reel', short: 'Reel', title: 'Instagram Reel', platform: 'Instagram', recommendedRatio: 9 / 16, recommendedLabel: '9:16', canvasWidth: 1440, canvasHeight: 2560 },
  { id: 'ig-story', short: 'Story', title: 'Instagram Story', platform: 'Instagram', recommendedRatio: 9 / 16, recommendedLabel: '9:16', canvasWidth: 1440, canvasHeight: 2560 },
  { id: 'ig-feed', short: 'IG Feed', title: 'Instagram Feed', platform: 'Instagram', recommendedRatio: 4 / 5, recommendedLabel: '4:5', canvasWidth: 1440, canvasHeight: 1800 },
  { id: 'fb-feed', short: 'FB Feed', title: 'Facebook Feed', platform: 'Facebook', recommendedRatio: 4 / 5, recommendedLabel: '4:5', canvasWidth: 1440, canvasHeight: 1800 },
];

const CTA_OPTIONS = ['Learn more', 'Shop now', 'Get offer', 'Sign up', 'Book now'];
const ACCEPTED = 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime';
const FEED_IMAGE_MIN_RATIO = 4 / 5;
const FEED_IMAGE_MAX_RATIO = 1.91;
const FACEBOOK_FEED_IMAGE_RATIO_TOLERANCE = 0.03;
const FEED_VIDEO_MIN_RATIO = 4 / 5;
const FEED_VIDEO_MAX_RATIO = 1.91;

function formatRatio(width: number, height: number) {
  if (!width || !height) return 'Ratio unavailable';
  const ratio = width / height;
  if (Math.abs(ratio - 9 / 16) < 0.012) return '9:16';
  if (Math.abs(ratio - 4 / 5) < 0.015) return '4:5';
  if (Math.abs(ratio - 1) < 0.015) return '1:1';
  if (Math.abs(ratio - 16 / 9) < 0.02) return '16:9';
  return `${ratio.toFixed(2)}:1`;
}

function safeFilename(value: string) {
  return value.toLowerCase().replace(/\.[^.]+$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'creative';
}

function loadDimensions(src: string, kind: AssetKind) {
  return new Promise<{ width: number; height: number }>((resolve) => {
    if (kind === 'image') {
      const image = new Image();
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => resolve({ width: 0, height: 0 });
      image.src = src;
      return;
    }
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => resolve({ width: video.videoWidth, height: video.videoHeight });
    video.onerror = () => resolve({ width: 0, height: 0 });
    video.src = src;
  });
}

function StatusBar() {
  return (
    <div className="status-bar" aria-hidden="true">
      <span>16:21</span>
      <div className="status-icons"><Signal size={15} strokeWidth={2.7} /><Wifi size={16} strokeWidth={2.5} /><BatteryMedium size={18} strokeWidth={2.4} /></div>
    </div>
  );
}

function SafeGuide({ cropped = false, feed = false }: { cropped?: boolean; feed?: boolean }) {
  return <div className={`safe-guide ${cropped ? 'safe-guide-cropped' : ''} ${feed ? 'safe-guide-feed' : ''}`} aria-hidden="true"><span>{feed ? 'Composition margin' : 'Common safe area'}</span></div>;
}

function BusinessAvatar() {
  return <span className="business-avatar" aria-hidden="true"><BriefcaseBusiness size={16} strokeWidth={1.9} /></span>;
}

function MediaLayer({ asset, fitMode, className = '', exportFrame, videoRef, playing }: {
  asset: CreativeAsset;
  fitMode: FitMode;
  className?: string;
  exportFrame: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  playing: boolean;
}) {
  const mediaClass = `creative-media is-${fitMode} ${className}`;
  if (asset.kind === 'video' && !exportFrame) {
    return <video ref={videoRef} className={mediaClass} src={asset.src} autoPlay muted loop playsInline onLoadedData={(event) => { if (playing) void event.currentTarget.play(); }} />;
  }
  return <img className={mediaClass} src={exportFrame || asset.src} alt={asset.name} draggable={false} />;
}

function ReelsOverlay({ businessName, caption, cta, promoted }: { businessName: string; caption: string; cta: string; promoted: boolean }) {
  return (
    <div className="native-overlay reels-overlay" aria-hidden="true">
      <StatusBar />
      <div className="reels-rail">
        <span><Heart /><small>430</small></span><span><MessageCircle /><small>8</small></span><span><Repeat2 /></span><span><Send /><small>215</small></span><span><Menu /></span>
      </div>
      {promoted && <div className="paid-cta"><strong>{cta}</strong><span>›</span></div>}
      <div className="account-row"><BusinessAvatar /><strong>{businessName || 'Business name'}</strong><span className="follow-pill">Follow</span></div>
      <div className="caption-row">{caption || 'Add a caption…'}</div>
      {promoted && <div className="ad-label">Ad</div>}
      <div className="reel-progress"><span /></div>
      <div className="bottom-nav"><House /><span className="active-nav"><Play fill="currentColor" /></span><Send /><Search /><UserRound /></div>
    </div>
  );
}

function StoryOverlay({ businessName, cta, promoted }: { businessName: string; cta: string; promoted: boolean }) {
  return (
    <div className="native-overlay story-overlay" aria-hidden="true">
      <div className="story-progress"><span /><span /><span /></div>
      <div className="story-account"><BusinessAvatar /><strong>{businessName || 'Business name'}</strong>{promoted && <small>Sponsored</small>}</div>
      <MoreHorizontal className="story-more" /><X className="story-close" />
      {promoted && <div className="story-cta">{cta}<span>›</span></div>}
    </div>
  );
}

function StoryPhoneControls({ promoted }: { promoted: boolean }) {
  return <div className="story-phone-controls" aria-hidden="true"><Heart /><MessageCircle />{promoted && <span>Ad</span>}</div>;
}

function FeedOverlay({ platform, businessName, caption, cta, promoted }: { platform: 'Instagram' | 'Facebook'; businessName: string; caption: string; cta: string; promoted: boolean }) {
  return (
    <div className={`native-overlay feed-overlay ${platform === 'Facebook' ? 'facebook-overlay' : ''}`} aria-hidden="true">
      <StatusBar />
      <div className="feed-appbar">{platform === 'Instagram' ? <Camera /> : <strong className="facebook-mark">f</strong>}<div><Heart /><MessageCircle /></div></div>
      <div className="feed-author"><BusinessAvatar /><span><strong>{businessName || 'Business name'}</strong>{promoted && <small>Sponsored</small>}</span><MoreHorizontal /></div>
      <div className="feed-actions"><Heart /><MessageCircle /><Send /><span /><Share2 /></div>
      {promoted && <div className="feed-cta"><strong>{cta}</strong><span>›</span></div>}
      <div className="feed-copy"><strong>{businessName || 'Business name'}</strong> {caption || 'Add a caption…'}</div>
    </div>
  );
}

function FeedCard({ platform, asset, fitMode, exportFrame, videoRef, playing, safeZone, businessName, caption, cta, promoted, mediaRatio, scrollRef }: {
  platform: 'Instagram' | 'Facebook';
  asset: CreativeAsset;
  fitMode: FitMode;
  exportFrame: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  playing: boolean;
  safeZone: boolean;
  businessName: string;
  caption: string;
  cta: string;
  promoted: boolean;
  mediaRatio: string;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className={`ig-feed-video-screen ${platform === 'Facebook' ? 'facebook-feed-card' : ''}`}>
      <div className="ig-feed-video-chrome">
        <StatusBar />
        <div className="ig-feed-video-appbar" aria-hidden="true">{platform === 'Instagram' ? <Camera /> : <strong className="facebook-mark">f</strong>}<div><Heart /><MessageCircle /></div></div>
      </div>
      <div className="ig-feed-video-scroll" ref={scrollRef} role="region" tabIndex={0} aria-label={`Scrollable ${platform} Feed preview`}>
        <article className="ig-feed-video-card">
          <header className="ig-feed-video-author">
            <BusinessAvatar />
            <span><strong>{businessName || 'Business name'}</strong>{promoted && <small>Sponsored</small>}</span>
            <MoreHorizontal aria-hidden="true" />
          </header>
          <div className="ig-feed-video-media official-canvas" style={{ aspectRatio: mediaRatio }}>
            <MediaLayer asset={asset} fitMode={fitMode} exportFrame={exportFrame} videoRef={videoRef} playing={playing} />
            {safeZone && <SafeGuide feed />}
          </div>
          <div className="ig-feed-video-details">
            <div className="ig-feed-video-actions" aria-hidden="true"><Heart /><MessageCircle /><Send /><span />{platform === 'Instagram' ? <Bookmark /> : <Share2 />}</div>
            {promoted && <div className="ig-feed-video-cta"><strong>{cta}</strong><span>›</span></div>}
            <div className="ig-feed-video-copy"><strong>{businessName || 'Business name'}</strong> {caption || 'Add a caption…'}</div>
          </div>
        </article>
      </div>
    </div>
  );
}

export default function Home() {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      return localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });
  const [assets, setAssets] = useState<CreativeAsset[]>([SAMPLE]);
  const [selectedId, setSelectedId] = useState(SAMPLE.id);
  const [placementId, setPlacementId] = useState<PlacementId>('ig-reel');
  const [previewMode, setPreviewMode] = useState<PreviewMode>('phone');
  const [fitMode, setFitMode] = useState<FitMode>('fit');
  const [safeZone, setSafeZone] = useState(false);
  const [promoted, setPromoted] = useState(true);
  const [businessName, setBusinessName] = useState('Your Business');
  const [caption, setCaption] = useState('Your caption goes here.');
  const [cta, setCta] = useState('Learn more');
  const [dragging, setDragging] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportFrame, setExportFrame] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const feedScrollRef = useRef<HTMLDivElement>(null);
  const objectUrls = useRef(new Set<string>());

  const selected = assets.find((asset) => asset.id === selectedId) || assets[0];
  const placement = PLACEMENTS.find((item) => item.id === placementId) || PLACEMENTS[0];
  const sourceRatio = selected?.width && selected?.height ? selected.width / selected.height : 0;
  const isInstagramFeedImage = placement.id === 'ig-feed' && selected?.kind === 'image';
  const isFacebookFeedImage = placement.id === 'fb-feed' && selected?.kind === 'image';
  const isFeedImage = isInstagramFeedImage || isFacebookFeedImage;
  const isFeedVideo = placement.id.includes('feed') && selected?.kind === 'video';
  const isAdaptiveFeedMedia = isFeedImage || isFeedVideo;
  const nativeFeedImageRatio = Boolean(
    isFeedImage
    && sourceRatio
    && sourceRatio >= FEED_IMAGE_MIN_RATIO * (isFacebookFeedImage ? 1 - FACEBOOK_FEED_IMAGE_RATIO_TOLERANCE : 1)
    && sourceRatio <= FEED_IMAGE_MAX_RATIO * (isFacebookFeedImage ? 1 + FACEBOOK_FEED_IMAGE_RATIO_TOLERANCE : 1),
  );
  const unsupportedFeedImageRatio = Boolean(
    isFeedImage
    && sourceRatio
    && !nativeFeedImageRatio,
  );
  const unsupportedFeedVideoRatio = Boolean(
    isFeedVideo
    && sourceRatio
    && (sourceRatio < FEED_VIDEO_MIN_RATIO || sourceRatio > FEED_VIDEO_MAX_RATIO),
  );
  const canvasSpec = useMemo(() => {
    if (isFeedImage) {
      if (nativeFeedImageRatio) {
        const width = 1440;
        const height = Math.ceil(width / sourceRatio);
        const withinNominalRange = sourceRatio >= FEED_IMAGE_MIN_RATIO && sourceRatio <= FEED_IMAGE_MAX_RATIO;
        const label = withinNominalRange ? formatRatio(selected?.width || 0, selected?.height || 0) : `${sourceRatio.toFixed(2)}:1`;
        return { ratio: width / height, label, width, height };
      }
      if (sourceRatio > FEED_IMAGE_MAX_RATIO) {
        const width = 1440;
        const height = Math.ceil(width / FEED_IMAGE_MAX_RATIO);
        return { ratio: width / height, label: '1.91:1', width, height };
      }
      return { ratio: FEED_IMAGE_MIN_RATIO, label: '4:5', width: 1440, height: 1800 };
    }
    if (isFeedVideo) {
      if (sourceRatio >= FEED_VIDEO_MIN_RATIO && sourceRatio <= FEED_VIDEO_MAX_RATIO) {
        const width = 1080;
        const height = Math.ceil(width / sourceRatio);
        return { ratio: width / height, label: formatRatio(selected?.width || 0, selected?.height || 0), width, height };
      }
      if (sourceRatio > FEED_VIDEO_MAX_RATIO) {
        const width = 1080;
        const height = Math.ceil(width / FEED_VIDEO_MAX_RATIO);
        return { ratio: width / height, label: '1.91:1', width, height };
      }
      return { ratio: FEED_VIDEO_MIN_RATIO, label: '4:5', width: 1080, height: 1350 };
    }
    return { ratio: placement.recommendedRatio, label: placement.recommendedLabel, width: placement.canvasWidth, height: placement.canvasHeight };
  }, [isFeedImage, isFeedVideo, nativeFeedImageRatio, placement, selected?.height, selected?.width, sourceRatio]);
  const ratioMismatch = Boolean(
    sourceRatio
    && (
      unsupportedFeedImageRatio
      || unsupportedFeedVideoRatio
      || Math.abs(sourceRatio - canvasSpec.ratio) / canvasSpec.ratio >= 0.025
    ),
  );
  const feedCropDefault = Boolean(
    ratioMismatch
    && (
      unsupportedFeedImageRatio
      || unsupportedFeedVideoRatio
    ),
  );
  const feedVideoCrop = feedCropDefault && isFeedVideo;
  const instagramFeedVideoCrop = feedVideoCrop && placement.id === 'ig-feed';

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') root.setAttribute('data-theme', 'light');
    else root.removeAttribute('data-theme');
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // The theme still works when storage is unavailable.
    }
  }, [theme]);

  useEffect(() => { setFitMode(feedCropDefault ? 'fill' : 'fit'); }, [selectedId, placementId, feedCropDefault]);

  useEffect(() => {
    if (feedScrollRef.current) feedScrollRef.current.scrollTop = 0;
  }, [selectedId, placementId]);

  useEffect(() => () => { objectUrls.current.forEach((url) => URL.revokeObjectURL(url)); }, []);

  const analysis = useMemo(() => {
    if (!selected?.width || !selected?.height) return { tone: 'warn', title: 'Could not read dimensions', detail: 'The file can still be previewed if your browser supports its codec.' };
    const close = !unsupportedFeedImageRatio && !unsupportedFeedVideoRatio && Math.abs(sourceRatio - canvasSpec.ratio) / canvasSpec.ratio < 0.025;
    const lowResolution = selected.mime !== 'image/svg+xml' && (selected.width < canvasSpec.width || selected.height < canvasSpec.height);

    const canvasDetail = `${selected.width} × ${selected.height}px source - Meta target ${canvasSpec.width} × ${canvasSpec.height}px ${canvasSpec.label} canvas`;
    const facebookImageCaveat = isFacebookFeedImage ? ' This preview preserves the native source ratio. Facebook may mask some Feed deliveries to 4:5 depending on device and context, so confirm final framing in Ads Manager.' : '';
    if (close) {
      return lowResolution
        ? { tone: 'warn', title: `${isFacebookFeedImage ? 'Native' : 'Correct'} ${canvasSpec.label} shape, but below Meta's target resolution`, detail: `${canvasDetail} - the preview can scale it, but cannot restore missing source detail.${facebookImageCaveat}` }
        : { tone: 'good', title: isFacebookFeedImage ? `Native ${canvasSpec.label} Facebook Feed preview` : `Ready in Meta's ${canvasSpec.label} canvas`, detail: `${canvasDetail} - ${isFacebookFeedImage ? 'the preview keeps the uploaded ratio.' : 'no ratio adjustment.'}${facebookImageCaveat}` };
    }
    if (fitMode === 'fit') {
      if (feedCropDefault) {
        return { tone: 'info', title: 'Full source comparison - not the default preview', detail: `${canvasDetail} - this view preserves the complete source, while this tool defaults to a ${canvasSpec.label} mobile Feed crop.${instagramFeedVideoCrop ? ' Meta also supports native 9:16 video in Instagram Feed.' : ''} Confirm the final framing in Ads Manager.` };
      }
      return { tone: 'info', title: `Standard preview keeps the full ${formatRatio(selected.width, selected.height)} source`, detail: `${canvasDetail} - fitted inside the placement without Advantage+ expansion or a simulated crop; empty bands show the unused canvas.${lowResolution ? ' Source resolution is also below the target.' : ''} Confirm the final paid preview in Ads Manager.` };
    }

    const cropLabel = feedCropDefault ? 'Standard Feed crop' : 'Possible crop';
    const cropDetail = feedCropDefault
      ? `${canvasDetail} - ${instagramFeedVideoCrop ? `this preview uses a conservative ${canvasSpec.label} mobile Feed frame; Meta also supports native 9:16 Instagram Feed video` : feedVideoCrop ? `this taller video is shown in a ${canvasSpec.label} mobile Feed frame` : unsupportedFeedImageRatio ? `this source falls outside the nominal 4:5 through 1.91:1 Feed range, so the preview uses the nearest ${canvasSpec.label} frame` : 'this taller Feed image is shown in a 4:5 frame'}. The centred crop is representative; confirm its position in Ads Manager.${lowResolution ? ' Source resolution is also below the target.' : ''}`
      : `${canvasDetail} - optional centre-crop simulation, not the standard preview.${lowResolution ? ' Source resolution is also below the target.' : ''} Confirm any placement crop in Ads Manager.`;
    if (sourceRatio > canvasSpec.ratio) {
      const sideCrop = ((1 - canvasSpec.ratio / sourceRatio) / 2) * 100;
      return { tone: 'warn', title: `${cropLabel} removes about ${sideCrop.toFixed(1)}% from each side`, detail: cropDetail };
    }
    const verticalCrop = ((1 - sourceRatio / canvasSpec.ratio) / 2) * 100;
    return { tone: 'warn', title: `${cropLabel} removes about ${verticalCrop.toFixed(1)}% from top and bottom`, detail: cropDetail };
  }, [canvasSpec, feedCropDefault, feedVideoCrop, fitMode, instagramFeedVideoCrop, isFacebookFeedImage, selected, sourceRatio, unsupportedFeedImageRatio, unsupportedFeedVideoRatio]);

  async function addFiles(files: File[]) {
    const supported = files.filter((file) => file.type.startsWith('image/') || file.type.startsWith('video/') || /\.(mov|mp4|webm)$/i.test(file.name));
    if (!supported.length) { setNotice('Choose JPG, PNG, WebP, GIF, MP4, WebM or MOV files.'); return; }
    const incoming = await Promise.all(supported.map(async (file, index) => {
      const kind: AssetKind = file.type.startsWith('video/') || /\.(mov|mp4|webm)$/i.test(file.name) ? 'video' : 'image';
      const src = URL.createObjectURL(file);
      objectUrls.current.add(src);
      const dimensions = await loadDimensions(src, kind);
      return { id: `${Date.now()}-${index}-${file.name}`, name: file.name.replace(/\.[^.]+$/, ''), src, kind, mime: file.type, ...dimensions } satisfies CreativeAsset;
    }));
    setAssets((current) => [...current, ...incoming]);
    setSelectedId(incoming[0].id);
    setPlaying(true);
    setExportFrame(null);
    setNotice(`${incoming.length} creative${incoming.length === 1 ? '' : 's'} added. Files stay in this browser.`);
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) { void addFiles(Array.from(event.target.files || [])); event.target.value = ''; }
  function handleDrop(event: DragEvent<HTMLDivElement>) { event.preventDefault(); setDragging(false); void addFiles(Array.from(event.dataTransfer.files)); }
  function selectAsset(id: string) { setSelectedId(id); setPlaying(true); setExportFrame(null); }
  function removeAsset(id: string) {
    const target = assets.find((asset) => asset.id === id);
    if (target && !target.sample) { URL.revokeObjectURL(target.src); objectUrls.current.delete(target.src); }
    const remaining = assets.filter((asset) => asset.id !== id);
    const next = remaining.length ? remaining : [SAMPLE];
    setAssets(next);
    if (selectedId === id) selectAsset(next[0].id);
  }

  async function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) { await video.play(); setPlaying(true); } else { video.pause(); setPlaying(false); }
  }

  function captureVideoFrame() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return null;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  }

  async function exportMockup() {
    if (!previewRef.current || !selected) return;
    const feedScroll = previewMode === 'phone' && isAdaptiveFeedMedia ? feedScrollRef.current : null;
    const previousFeedScrollTop = feedScroll?.scrollTop ?? 0;
    setExporting(true);
    try {
      if (feedScroll) {
        feedScroll.scrollTop = 0;
        await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      }
      if (selected.kind === 'video') {
        const frame = captureVideoFrame();
        if (frame) { setExportFrame(frame); await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame); }
      }
      const pixelRatio = previewMode === 'creative' ? canvasSpec.width / previewRef.current.clientWidth : 3;
      const dataUrl = await toPng(previewRef.current, { cacheBust: true, pixelRatio, backgroundColor: previewMode === 'phone' ? '#101114' : '#000000' });
      const anchor = document.createElement('a');
      anchor.download = `${safeFilename(selected.name)}-${placement.id}-${previewMode}.png`;
      anchor.href = dataUrl;
      anchor.click();
      setNotice(previewMode === 'creative' ? `Meta-size ${canvasSpec.width} × ${canvasSpec.height}px PNG exported.` : 'Phone mockup PNG exported.');
    } catch { setNotice('The PNG could not be exported. Try pausing the video first or use Chrome/Safari.'); }
    finally {
      if (feedScroll) feedScroll.scrollTop = previousFeedScrollTop;
      setExportFrame(null);
      setExporting(false);
    }
  }

  if (!selected) return null;
  const isVerticalPlacement = canvasSpec.ratio < 0.7;
  const fullRatio = `${canvasSpec.width} / ${canvasSpec.height}`;
  const phoneKind = placement.id === 'ig-story' ? 'story-phone' : placement.id.includes('feed') ? 'feed-phone' : 'reel-phone';

  return (
    <main className="app-root">
      <button className="theme-toggle" type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
        {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
      </button>
      <header className="product-header">
        <a className="brand" href="#top" aria-label="Meta Placement Preview home"><span className="brand-mark"><img src={`${PUBLIC_BASE}meta-logo.svg`} alt="" /></span><span><strong>Placement Preview</strong><small>for Meta</small></span></a>
        <div className="privacy-note"><span className="privacy-dot" />Files stay in your browser</div>
        <div className="header-actions">
          <a className="help-link" href="#how-it-works"><CircleHelp size={17} />How it works</a>
        </div>
      </header>

      <div className="app-layout" id="top">
        <aside className="control-panel">
          <div className="panel-heading"><div><span className="eyebrow">Creative library</span><h1>Check a placement</h1></div><span className="asset-count">{assets.length}</span></div>
          <div className={`drop-zone ${dragging ? 'is-dragging' : ''}`} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={handleDrop} onClick={() => inputRef.current?.click()} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click(); }}>
            <input ref={inputRef} type="file" accept={ACCEPTED} multiple onChange={handleFileInput} hidden />
            <span className="drop-icon"><UploadCloud size={21} /></span><span><strong>Drop creatives here</strong><small>or browse images and video</small></span><Plus size={17} />
          </div>
          {notice && <div className="inline-notice" role="status"><Check size={14} />{notice}</div>}

          <div className="asset-list" aria-label="Creative library">
            {assets.map((asset) => (
              <div key={asset.id} className={`asset-item ${asset.id === selected.id ? 'selected' : ''}`} role="button" tabIndex={0} onClick={() => selectAsset(asset.id)} onKeyDown={(event) => { if (event.key === 'Enter') selectAsset(asset.id); }}>
                <span className="asset-thumb">{asset.kind === 'image' ? <img src={asset.src} alt="" /> : <><video src={asset.src} muted preload="metadata" /><span className="video-badge"><Video size={11} /></span></>}</span>
                <span className="asset-meta"><strong>{asset.name}</strong><small>{asset.width && asset.height ? `${asset.width} × ${asset.height}` : 'Dimensions unavailable'} - {formatRatio(asset.width, asset.height)}</small></span>
                {asset.id === selected.id ? <span className="selected-check"><Check size={13} /></span> : !asset.sample ? <button className="remove-hit" aria-label={`Remove ${asset.name}`} onClick={(event) => { event.stopPropagation(); removeAsset(asset.id); }}><Trash2 size={14} /></button> : null}
              </div>
            ))}
          </div>

          <div className="settings-section">
            <div className="section-title"><span>Ad details</span><small>Shown in paid preview</small></div>
            <label className="field-label">Post type<span className="button-toggle compact-toggle"><button className={promoted ? 'active' : ''} onClick={() => setPromoted(true)} type="button">Paid ad</button><button className={!promoted ? 'active' : ''} onClick={() => setPromoted(false)} type="button">Organic</button></span></label>
            <label className="field-label">Business name<input value={businessName} onChange={(event) => setBusinessName(event.target.value)} /></label>
            <label className="field-label">Caption<input value={caption} onChange={(event) => setCaption(event.target.value)} /></label>
            {promoted && <label className="field-label">Call to action<span className="select-wrap"><select value={cta} onChange={(event) => setCta(event.target.value)}>{CTA_OPTIONS.map((option) => <option key={option}>{option}</option>)}</select><ChevronDown size={14} /></span></label>}
          </div>
        </aside>

        <section className="preview-workspace">
          <div className="workspace-toolbar">
            <div className="placement-tabs" aria-label="Placement">{PLACEMENTS.map((item) => <button key={item.id} className={item.id === placement.id ? 'active' : ''} onClick={() => setPlacementId(item.id)}>{item.short}</button>)}</div>
            <div className="toolbar-actions">{selected.kind === 'video' && <button className="icon-action" onClick={() => void togglePlayback()}>{playing ? <Pause size={16} /> : <Play size={16} />}{playing ? 'Pause' : 'Play'}</button>}<button className="export-button" onClick={() => void exportMockup()} disabled={exporting}><Download size={16} />{exporting ? 'Exporting…' : 'Export PNG'}</button></div>
          </div>

          <div className="preview-stage">
            <div className="stage-controls">
              <div className="stage-control-group">
                <span className="button-toggle"><button className={previewMode === 'phone' ? 'active' : ''} onClick={() => setPreviewMode('phone')}><Smartphone size={14} />Phone preview</button><button className={previewMode === 'creative' ? 'active' : ''} onClick={() => setPreviewMode('creative')}><ImagePlus size={14} />Full creative</button></span>
                <span className="canvas-spec"><strong>Meta {canvasSpec.label}</strong>{canvasSpec.width} × {canvasSpec.height}</span>
              </div>
              <div className="stage-control-group stage-control-group-right">
                {ratioMismatch && (feedCropDefault
                  ? <span className="button-toggle source-view-toggle" aria-label="Feed framing mode"><button className={fitMode === 'fill' ? 'active' : ''} onClick={() => setFitMode('fill')} type="button">Standard Feed crop</button><button className={fitMode === 'fit' ? 'active' : ''} onClick={() => setFitMode('fit')} type="button">Show full source</button></span>
                  : <span className="button-toggle source-view-toggle" aria-label="Off-ratio display mode"><button className={fitMode === 'fit' ? 'active' : ''} onClick={() => setFitMode('fit')} type="button">Standard display</button><button className={fitMode === 'fill' ? 'active' : ''} onClick={() => setFitMode('fill')} type="button">Possible crop</button></span>)}
                <label className="safe-toggle"><input type="checkbox" checked={safeZone} onChange={(event) => setSafeZone(event.target.checked)} /><span /><em>Safe area</em></label>
              </div>
            </div>

            <div className="preview-centre">
              {previewMode === 'phone' ? (
                <div className={`phone-shell ${phoneKind}`} ref={previewRef}>
                  <div className="phone-screen">
                    {placement.id === 'ig-story' ? <><StatusBar /><div className="story-media-slot official-canvas"><MediaLayer asset={selected} fitMode={fitMode} exportFrame={exportFrame} videoRef={videoRef} playing={playing} />{safeZone && <SafeGuide />}<StoryOverlay businessName={businessName} cta={cta} promoted={promoted} /></div><StoryPhoneControls promoted={promoted} /></>
                      : placement.id === 'ig-reel' ? <><div className="reel-media-slot official-canvas"><MediaLayer asset={selected} fitMode={fitMode} exportFrame={exportFrame} videoRef={videoRef} playing={playing} />{safeZone && <SafeGuide />}</div><ReelsOverlay businessName={businessName} caption={caption} cta={cta} promoted={promoted} /></>
                      : isAdaptiveFeedMedia ? <FeedCard platform={placement.platform} asset={selected} fitMode={fitMode} exportFrame={exportFrame} videoRef={videoRef} playing={playing} safeZone={safeZone} businessName={businessName} caption={caption} cta={cta} promoted={promoted} mediaRatio={fullRatio} scrollRef={feedScrollRef} />
                        : <><div className="feed-media-slot official-canvas"><MediaLayer asset={selected} fitMode={fitMode} exportFrame={exportFrame} videoRef={videoRef} playing={playing} />{safeZone && <SafeGuide feed />}</div><FeedOverlay platform={placement.platform} businessName={businessName} caption={caption} cta={cta} promoted={promoted} /></>}
                  </div>
                </div>
              ) : <div className={`creative-frame official-canvas ${isVerticalPlacement ? 'vertical-creative' : 'feed-creative'}`} style={{ aspectRatio: fullRatio }} ref={previewRef}><MediaLayer asset={selected} fitMode={fitMode} exportFrame={exportFrame} videoRef={videoRef} playing={playing} />{safeZone && <SafeGuide feed={placement.id.includes('feed')} />}</div>}
            </div>

            <div className={`analysis-card ${analysis.tone}`}><span className="analysis-icon">{analysis.tone === 'good' ? <Check size={15} /> : analysis.tone === 'info' ? <Radio size={15} /> : '!'}</span><div><strong>{analysis.title}</strong><p>{analysis.detail}</p></div></div>
          </div>
        </section>
      </div>

      <section className="explainer" id="how-it-works"><span className="eyebrow">What the preview means</span><h2>Every upload is checked inside Meta’s placement canvas.</h2><div className="explain-grid"><article><span>01</span><h3>Reels + Stories: 9:16</h3><p>Images and video use Meta’s 1440 × 2560 target canvas. Uploaded dimensions never change its shape.</p></article><article><span>02</span><h3>Feed media keeps native shapes</h3><p>Facebook and Instagram Feed images and videos from 4:5 through 1.91:1 keep their uploaded ratio, so 1:1 stays square. Meta recommends 4:5 for maximum vertical space.</p></article><article><span>03</span><h3>9:16 video defaults to 4:5</h3><p>This tool defaults 9:16 video to a centred 4:5 Feed crop. Meta also supports native 9:16 video in Instagram Feed, so compare the full source and confirm the final Ads Manager preview.</p></article></div></section>
      <footer className="site-footer"><span>Unofficial tool - not affiliated with or endorsed by Meta.</span><span>Uploads stay in your browser.</span></footer>
    </main>
  );
}
