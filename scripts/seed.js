require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { MongoClient } = require("mongodb");

const SEED_POSTS = [
  {
    name: "김민수",
    handle: "minsu_dev",
    avatar: "민",
    gradient: "linear-gradient(135deg, #0078d4, #60cdff)",
    text: "Windows 11 Fluent Design 적용한 피드 UI 테스트 중입니다. 아크릴 블러 효과 꽤 괜찮네요 ✨",
    likes: 42,
    replies: 8,
    reposts: 3,
    hasImage: false,
    minutesAgo: 2,
  },
  {
    name: "이서연",
    handle: "seoyeon_design",
    avatar: "서",
    gradient: "linear-gradient(135deg, #8764b8, #c084fc)",
    text: "모바일 피드 UI 만들었어요. MongoDB Atlas에 연결해서 실제 DB로 테스트 중 🎨",
    likes: 128,
    replies: 24,
    reposts: 12,
    hasImage: true,
    minutesAgo: 15,
  },
  {
    name: "박준혁",
    handle: "junhyuk_ai",
    avatar: "준",
    gradient: "linear-gradient(135deg, #059669, #34d399)",
    text: "프론트 + Node API + MongoDB 조합으로 피드 앱 백엔드 붙였습니다.",
    likes: 67,
    replies: 15,
    reposts: 5,
    hasImage: false,
    minutesAgo: 32,
  },
  {
    name: "최유진",
    handle: "yujin_photo",
    avatar: "유",
    gradient: "linear-gradient(135deg, #dc2626, #f97316)",
    text: "오늘 한강 산책 ☀️ 날씨 진짜 좋았다. 주말에 또 가야지.",
    likes: 256,
    replies: 31,
    reposts: 18,
    hasImage: true,
    minutesAgo: 60,
  },
  {
    name: "정하늘",
    handle: "haneul_code",
    avatar: "하",
    gradient: "linear-gradient(135deg, #2563eb, #818cf8)",
    text: "스마트폰에서 접속하려면 PC와 같은 Wi-Fi에 연결하고 http://[PC IP]:3000 으로 접속하면 됩니다.",
    likes: 89,
    replies: 12,
    reposts: 45,
    hasImage: false,
    minutesAgo: 120,
  },
  {
    name: "한소희",
    handle: "sohee_music",
    avatar: "소",
    gradient: "linear-gradient(135deg, #db2777, #f472b6)",
    text: "새 EP 들어보세요 🎵 밤에 듣기 좋은 트랙 모음",
    likes: 512,
    replies: 67,
    reposts: 89,
    hasImage: true,
    minutesAgo: 180,
  },
  {
    name: "오태양",
    handle: "taeyang_food",
    avatar: "태",
    gradient: "linear-gradient(135deg, #d97706, #fbbf24)",
    text: "성수동 새로 생긴 카페 다녀왔는데 커피 맛있고 인테리어도 예뻐요 ☕",
    likes: 73,
    replies: 9,
    reposts: 2,
    hasImage: false,
    minutesAgo: 240,
  },
  {
    name: "윤지아",
    handle: "jia_travel",
    avatar: "지",
    gradient: "linear-gradient(135deg, #0891b2, #22d3ee)",
    text: "제주도 3박 4일 코스 공유합니다 🏝️\n\nDay1: 공항 → 성산일출봉\nDay2: 우도\nDay3: 애월 카페",
    likes: 340,
    replies: 52,
    reposts: 78,
    hasImage: true,
    minutesAgo: 300,
  },
  {
    name: "강도현",
    handle: "dohyun_tech",
    avatar: "도",
    gradient: "linear-gradient(135deg, #4f46e5, #a78bfa)",
    text: "MongoDB Atlas Free Tier로 시작하기 딱 좋네요. 프로토타입엔 충분합니다.",
    likes: 156,
    replies: 28,
    reposts: 34,
    hasImage: false,
    minutesAgo: 360,
  },
  {
    name: "임수빈",
    handle: "subin_daily",
    avatar: "수",
    gradient: "linear-gradient(135deg, #65a30d, #a3e635)",
    text: "DB 시드 데이터 넣고 피드 불러오기 성공! ☕",
    likes: 24,
    replies: 5,
    reposts: 1,
    hasImage: false,
    minutesAgo: 480,
  },
];

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri || uri.includes("YOUR_PASSWORD")) {
    console.error("\n❌ .env 파일에 MONGODB_URI를 설정해 주세요.");
    console.error("   .env.example 을 복사해 .env 를 만들고 비밀번호를 입력하세요.\n");
    process.exit(1);
  }

  const dbName = process.env.DB_NAME || "feed";
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);
    const posts = db.collection("posts");

    const docs = SEED_POSTS.map((p) => {
      const { minutesAgo, ...rest } = p;
      return {
        ...rest,
        liked: false,
        reposted: false,
        createdAt: new Date(Date.now() - minutesAgo * 60 * 1000),
      };
    });

    await posts.deleteMany({});
    const result = await posts.insertMany(docs);

    console.log(`\n✅ MongoDB 시드 완료 (${dbName}.posts)`);
    console.log(`   ${result.insertedCount}개 게시글 삽입됨\n`);
  } catch (err) {
    console.error("\n❌ 시드 실패:", err.message);
    if (err.message.includes("authentication")) {
      console.error("   → DB 사용자 비밀번호를 확인하세요.");
    }
    if (err.message.includes("ENOTFOUND") || err.message.includes("querySrv")) {
      console.error("   → Connection String / 네트워크를 확인하세요.");
    }
    process.exit(1);
  } finally {
    await client.close();
  }
}

seed();
