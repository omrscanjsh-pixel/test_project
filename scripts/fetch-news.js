require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const Parser = require("rss-parser");
const { MongoClient } = require("mongodb");

const MAX_POSTS = 10;

const RSS_FEEDS = [
  {
    url: "https://news.google.com/rss/search?q=SpaceX+OR+Starship&hl=ko&gl=KR&ceid=KR:ko",
    region: "kr",
  },
  {
    url: "https://news.google.com/rss/search?q=SpaceX+Starship&hl=en-US&gl=US&ceid=US:en",
    region: "en",
  },
];

const GRADIENTS = [
  "linear-gradient(135deg, #1e3a5f, #3b82f6)",
  "linear-gradient(135deg, #0f766e, #2dd4bf)",
  "linear-gradient(135deg, #7c2d12, #ea580c)",
  "linear-gradient(135deg, #1d4ed8, #60a5fa)",
  "linear-gradient(135deg, #4c1d95, #a78bfa)",
  "linear-gradient(135deg, #374151, #9ca3af)",
  "linear-gradient(135deg, #0369a1, #38bdf8)",
  "linear-gradient(135deg, #b45309, #fbbf24)",
  "linear-gradient(135deg, #be123c, #fb7185)",
  "linear-gradient(135deg, #111827, #6b7280)",
];

const FALLBACK_IMAGES = [
  "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/SpaceX_Starship_ignition_during_first_test_flight.jpg/960px-SpaceX_Starship_ignition_during_first_test_flight.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Starship_SN8_on_pad.jpg/960px-Starship_SN8_on_pad.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Starship_rocket_on_the_launch_pad.jpg/960px-Starship_rocket_on_the_launch_pad.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Starship_SN15_after_landing.jpg/960px-Starship_SN15_after_landing.jpg",
];

const parser = new Parser({
  customFields: {
    item: [
      ["media:content", "mediaContent"],
      ["media:thumbnail", "mediaThumbnail"],
    ],
  },
  timeout: 20000,
});

function stripHtml(html) {
  if (!html) return "";
  return html
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function extractImage(item) {
  const fromMedia =
    item.mediaContent?.$?.url ||
    item.mediaThumbnail?.$?.url ||
    item.enclosure?.url;

  if (fromMedia && /^https?:\/\//i.test(fromMedia)) return fromMedia;

  const html = item.content || item.contentSnippet || item.description || "";
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (match?.[1] && /^https?:\/\//i.test(match[1])) return match[1];

  return "";
}

function slugHandle(name) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);
  return slug || "news_feed";
}

function avatarFromName(name) {
  const trimmed = name.trim();
  if (!trimmed) return "N";
  const char = [...trimmed][0];
  return char.toUpperCase();
}

function regionTag(region, sourceUrl) {
  if (region === "en") return "[해외]";
  if (/\.kr\b/i.test(sourceUrl || "")) return "[국내]";
  return "[글로벌]";
}

function engagement(seed) {
  const base = 120 + (seed % 900);
  return {
    likes: base + (seed % 400),
    replies: 20 + (seed % 120),
    reposts: 30 + (seed % 200),
  };
}

function parseTitleAndSource(rawTitle) {
  const clean = stripHtml(rawTitle);
  const match = clean.match(/^(.+?)\s+-\s+(.+)$/);
  if (match) {
    return { title: match[1].trim(), source: match[2].trim() };
  }
  return { title: clean, source: "" };
}

function resolveSource(item) {
  const fromField =
    (typeof item.source === "string" && item.source) ||
    item.source?._ ||
    item.source?.title ||
    item.creator ||
    "";

  if (fromField && fromField !== "News") return fromField.trim();

  const parsed = parseTitleAndSource(item.title);
  return parsed.source || "News";
}

function resolveTitle(item) {
  const parsed = parseTitleAndSource(item.title);
  return parsed.title || stripHtml(item.title);
}

function normalizeTitle(rawTitle) {
  return resolveTitle({ title: rawTitle }).toLowerCase().replace(/\s+/g, " ").trim();
}

async function fetchFeedItems(feed) {
  try {
    const parsed = await parser.parseURL(feed.url);
    return (parsed.items || []).map((item) => ({
      ...item,
      _region: feed.region,
    }));
  } catch (err) {
    console.warn(`⚠ RSS 실패 (${feed.url}):`, err.message);
    return [];
  }
}

function toPostDoc(item, index) {
  const sourceName = resolveSource(item);
  const sourceUrl = item.source?.url || item.source?._ || "";
  const title = resolveTitle(item);
  const summary = stripHtml(item.contentSnippet || item.description);
  const tag = regionTag(item._region, sourceUrl);
  const text = summary && summary !== title ? `${tag} ${title}\n\n${summary}` : `${tag} ${title}`;
  const imageUrl = extractImage(item) || FALLBACK_IMAGES[index % FALLBACK_IMAGES.length];
  const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();
  const stats = engagement(index + title.length);

  return {
    name: sourceName,
    handle: slugHandle(sourceName),
    avatar: avatarFromName(sourceName),
    gradient: GRADIENTS[index % GRADIENTS.length],
    text,
    ...stats,
    hasImage: true,
    imageUrl,
    articleUrl: item.link || "",
    liked: false,
    reposted: false,
    createdAt: pubDate,
    _sortKey: pubDate.getTime(),
  };
}

async function fetchNews() {
  const uri = process.env.MONGODB_URI;
  if (!uri || uri.includes("YOUR_PASSWORD")) {
    console.error("\n❌ MONGODB_URI가 설정되지 않았습니다.\n");
    process.exit(1);
  }

  const dbName = process.env.DB_NAME || "feed";
  const client = new MongoClient(uri);

  try {
    console.log("\n📡 RSS 수집 시작…");
    const batches = await Promise.all(RSS_FEEDS.map(fetchFeedItems));
    const merged = batches.flat();

    const seen = new Set();
    const unique = [];
    for (const item of merged) {
      const key = normalizeTitle(item.title);
      if (!key || !item.link || seen.has(key)) continue;
      seen.add(key);
      unique.push(item);
    }

    unique.sort((a, b) => {
      const ta = a.pubDate ? new Date(a.pubDate).getTime() : 0;
      const tb = b.pubDate ? new Date(b.pubDate).getTime() : 0;
      return tb - ta;
    });

    const selected = unique.slice(0, MAX_POSTS);
    if (selected.length === 0) {
      console.error("\n❌ 수집된 기사가 없습니다.\n");
      process.exit(1);
    }

    const docs = selected.map((item, i) => {
      const doc = toPostDoc(item, i);
      delete doc._sortKey;
      return doc;
    });

    await client.connect();
    const posts = client.db(dbName).collection("posts");
    await posts.deleteMany({});
    const result = await posts.insertMany(docs);

    console.log(`✅ MongoDB 갱신 완료 (${dbName}.posts)`);
    console.log(`   RSS 기사 ${result.insertedCount}개 반영\n`);
    docs.forEach((d, i) => console.log(`   ${i + 1}. ${d.name} — ${d.text.split("\n")[0]}`));
    console.log("");
  } catch (err) {
    console.error("\n❌ RSS 수집 실패:", err.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

fetchNews();
