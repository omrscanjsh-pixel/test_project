require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const { MongoClient, ObjectId, ServerApiVersion } = require("mongodb");

const PORT = process.env.PORT || 8080;
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || "feed";

const app = express();
let db;
let client;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

function formatRelativeTime(date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금";
  if (mins < 60) return `${mins}분`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간`;
  const days = Math.floor(hours / 24);
  return `${days}일`;
}

function toPost(doc) {
  return {
    id: doc._id.toString(),
    name: doc.name,
    handle: doc.handle,
    avatar: doc.avatar,
    gradient: doc.gradient,
    text: doc.text,
    likes: doc.likes ?? 0,
    replies: doc.replies ?? 0,
    reposts: doc.reposts ?? 0,
    hasImage: !!doc.hasImage,
    imageUrl: doc.imageUrl || "",
    articleUrl: doc.articleUrl || "",
    liked: !!doc.liked,
    reposted: !!doc.reposted,
    time: formatRelativeTime(doc.createdAt),
    createdAt: doc.createdAt,
  };
}

function parseId(id) {
  if (!ObjectId.isValid(id)) return null;
  return new ObjectId(id);
}

app.get("/api/health", async (_req, res) => {
  try {
    await db.command({ ping: 1 });
    res.json({ ok: true, db: DB_NAME });
  } catch {
    res.status(503).json({ ok: false, error: "DB 연결 실패" });
  }
});

app.get("/api/posts", async (_req, res) => {
  try {
    const docs = await db
      .collection("posts")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    res.json(docs.map(toPost));
  } catch (err) {
    console.error("GET /api/posts", err);
    res.status(500).json({ error: "피드를 불러오지 못했습니다." });
  }
});

app.post("/api/posts", async (req, res) => {
  try {
    const text = (req.body.text || "").trim();
    if (!text) {
      return res.status(400).json({ error: "내용을 입력해 주세요." });
    }

    const doc = {
      name: req.body.name || "나",
      handle: req.body.handle || "me",
      avatar: req.body.avatar || "나",
      gradient: req.body.gradient || "linear-gradient(135deg, #60cdff, #0078d4)",
      text,
      likes: 0,
      replies: 0,
      reposts: 0,
      hasImage: false,
      liked: false,
      reposted: false,
      createdAt: new Date(),
    };

    const result = await db.collection("posts").insertOne(doc);
    const inserted = await db.collection("posts").findOne({ _id: result.insertedId });
    res.status(201).json(toPost(inserted));
  } catch (err) {
    console.error("POST /api/posts", err);
    res.status(500).json({ error: "게시에 실패했습니다." });
  }
});

app.patch("/api/posts/:id/like", async (req, res) => {
  try {
    const oid = parseId(req.params.id);
    if (!oid) return res.status(400).json({ error: "잘못된 ID" });

    const post = await db.collection("posts").findOne({ _id: oid });
    if (!post) return res.status(404).json({ error: "게시글 없음" });

    const liked = !post.liked;
    const likes = Math.max(0, (post.likes || 0) + (liked ? 1 : -1));

    await db.collection("posts").updateOne({ _id: oid }, { $set: { liked, likes } });
    const updated = await db.collection("posts").findOne({ _id: oid });
    res.json(toPost(updated));
  } catch (err) {
    console.error("PATCH like", err);
    res.status(500).json({ error: "처리 실패" });
  }
});

app.patch("/api/posts/:id/repost", async (req, res) => {
  try {
    const oid = parseId(req.params.id);
    if (!oid) return res.status(400).json({ error: "잘못된 ID" });

    const post = await db.collection("posts").findOne({ _id: oid });
    if (!post) return res.status(404).json({ error: "게시글 없음" });

    const reposted = !post.reposted;
    const reposts = Math.max(0, (post.reposts || 0) + (reposted ? 1 : -1));

    await db.collection("posts").updateOne({ _id: oid }, { $set: { reposted, reposts } });
    const updated = await db.collection("posts").findOne({ _id: oid });
    res.json(toPost(updated));
  } catch (err) {
    console.error("PATCH repost", err);
    res.status(500).json({ error: "처리 실패" });
  }
});

function createMongoClient(uri) {
  return new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
    autoSelectFamily: false,
    serverSelectionTimeoutMS: 15000,
  });
}

async function start() {
  if (!MONGODB_URI || MONGODB_URI.includes("YOUR_PASSWORD")) {
    console.error("\n❌ .env 파일에 MONGODB_URI를 설정해 주세요.");
    console.error("   1) .env.example → .env 복사");
    console.error("   2) YOUR_PASSWORD 를 Atlas DB 비밀번호로 변경");
    console.error("   3) 비밀번호에 # 있으면 %23 으로 바꿔야 합니다");
    console.error("   4) npm run seed  후  npm start\n");
    process.exit(1);
  }

  if (MONGODB_URI.startsWith("mongodb+srv://") && /mongodb\.net:\d+/.test(MONGODB_URI)) {
    console.error("\n❌ mongodb+srv 주소에는 :27017 같은 포트를 넣을 수 없습니다.");
    process.exit(1);
  }

  client = createMongoClient(MONGODB_URI);
  await client.connect();
  db = client.db(DB_NAME);

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n🚀 Feed 서버 실행 중 (port ${PORT})`);
    if (process.env.RENDER_EXTERNAL_URL) {
      console.log(`   접속: ${process.env.RENDER_EXTERNAL_URL}`);
    } else {
      console.log(`   PC:       http://localhost:${PORT}`);
      console.log(`   스마트폰: http://[PC IP]:${PORT}`);
    }
    console.log(`   DB:       ${DB_NAME}\n`);
  });
}

start().catch((err) => {
  console.error("\n❌ 서버 시작 실패:", err.message);
  if (/SSL|tlsv1|alert internal error/i.test(err.message)) {
    console.error("\n💡 이 SSL 오류는 보통 Atlas IP 허용 문제입니다.");
    console.error("   Atlas → Network Access → Add IP → Allow Access from Anywhere (0.0.0.0/0)");
    console.error("   저장 후 Render에서 Manual Deploy 로 재배포하세요.\n");
  }
  process.exit(1);
});

process.on("SIGINT", async () => {
  if (client) await client.close();
  process.exit(0);
});
