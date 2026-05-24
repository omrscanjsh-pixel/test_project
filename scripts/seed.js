require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { MongoClient } = require("mongodb");

/** SpaceX 관련 국내·해외 최신 뉴스 요약 (2026-05-22~24) */
const SEED_POSTS = [
  {
    name: "동아일보",
    handle: "donga_space",
    avatar: "동",
    gradient: "linear-gradient(135deg, #1e3a5f, #3b82f6)",
    text: "[국내] IPO 앞둔 SpaceX, '스타십 V3' 첫 시험발사 성공\n\n5월 22일(현지) 텍사스 스타베이스에서 V3 첫 시험비행(12번째) 완료. 길이 124m, 전날 설비 문제로 하루 연기됐으나 발사·분리·2단 임무는 성공. 슈퍼헤비 1단은 일부 엔진 점화 실패로 멕시코만 착수만 진행.",
    likes: 892,
    replies: 134,
    reposts: 256,
    hasImage: true,
    minutesAgo: 45,
    source: "동아일보",
  },
  {
    name: "뉴스핌",
    handle: "newspim_kr",
    avatar: "뉴",
    gradient: "linear-gradient(135deg, #0f766e, #2dd4bf)",
    text: "[국내] SpaceX '스타십 V3' 시험비행 성공… IPO 흥행 청신호\n\n모의 Starlink 위성 20기 배치, 대기권 재진입, 인도양 목표 착수까지 계획 임무 수행. NASA 달 착륙용 최신 모델. 머스크 IPO 발표 이틀 만에 시험비행 진행. FCC에 밝힌 위성 100만 기 발사 목표에도 한 걸음.",
    likes: 654,
    replies: 89,
    reposts: 178,
    hasImage: false,
    minutesAgo: 120,
    source: "뉴스핌",
  },
  {
    name: "Ars Technica",
    handle: "arstechnica",
    avatar: "Ar",
    gradient: "linear-gradient(135deg, #7c2d12, #ea580c)",
    text: "[해외] 스타십 V3, 아직 개선 중이지만 첫 비행은 대체로 성공\n\n124m(408ft) 로켓이 스타베이스에서 발사됐다. 약 66분 뒤 스타십이 인도양에 착수. Raptor 3 첫 비행: 부스터 33기 중 1기·상단부 6기 중 1기 엔진 고장이 있었으나 기체가 이를 흡수. 머스크 X: \"스타십 V3 역사적인 첫 발사·착수, SpaceX 팀 축하!\"",
    likes: 1240,
    replies: 312,
    reposts: 489,
    hasImage: true,
    minutesAgo: 180,
    source: "Ars Technica",
  },
  {
    name: "PBS News",
    handle: "pbsnews",
    avatar: "PB",
    gradient: "linear-gradient(135deg, #1d4ed8, #60a5fa)",
    text: "[해외] SpaceX, 역대 최대 스타십 메가로켓 시험비행 발사\n\n124m(407ft) V3가 머스크의 SpaceX 상장 발표 2일 뒤 첫 등장. 모의 Starlink 위성 20기 탑재. NASA는 아르테미스 달 착륙에 스타십을 기대. 스타베이스 신규 발사대 사용, 목요일 시도는 발사대 문제로 연기.",
    likes: 978,
    replies: 156,
    reposts: 334,
    hasImage: true,
    minutesAgo: 240,
    source: "PBS News",
  },
  {
    name: "비즈월드",
    handle: "bizworld_kr",
    avatar: "비",
    gradient: "linear-gradient(135deg, #4c1d95, #a78bfa)",
    text: "[국내·로이터] 스타십 V3 첫 비행 성공… 달·화성 향한 머스크의 초대형 승부수\n\n12번째 무인 시험비행, V3 첫 공식 발사. 엔진 1기 고장에도 위성 모사체 배치·재진입·인도양 착수 완료. 아르테미스 달 탐사·화성 유인 탐사 핵심 수단. 향후 10년 글로벌 우주산업 구조의 핵심 변수로 평가.",
    likes: 445,
    replies: 67,
    reposts: 123,
    hasImage: false,
    minutesAgo: 360,
    source: "비즈월드",
  },
  {
    name: "SpaceNews",
    handle: "spacenews",
    avatar: "SN",
    gradient: "linear-gradient(135deg, #374151, #9ca3af)",
    text: "[해외] SpaceX, 스타십 V3 첫 발사 (Flight 12)\n\n발사대 유압 핀 고장으로 연기됐으나 5월 22일 발사. 상승 이상으로 엔진 재점화 시험 생략. 인도양에 부드럽게 착수 후 기대대로 전도·폭발. SEC 공시: 2026년 하반기 궤도 페이로드 임무 목표.",
    likes: 567,
    replies: 98,
    reposts: 201,
    hasImage: false,
    minutesAgo: 480,
    source: "SpaceNews",
  },
  {
    name: "ZDNet Korea",
    handle: "zdnet_kr",
    avatar: "ZD",
    gradient: "linear-gradient(135deg, #0369a1, #38bdf8)",
    text: "[국내] 스타십 V3 첫 발사… 달 착륙선 시험 본격화\n\n신규 발사대 '메카질라'에서 V3·슈퍼헤비 통합 조립 완료. 완전 재사용 목표—부스터 공중 회수는 성공, 상단부 회수는 아직. NASA 아르테미스 유인 달 착륙선(2027년 말) 후보. 궤도 간 연료 주입 기술이 V3 핵심 개선점.",
    likes: 389,
    replies: 54,
    reposts: 87,
    hasImage: true,
    minutesAgo: 600,
    source: "ZDNet Korea",
  },
  {
    name: "한국경제",
    handle: "hankyung",
    avatar: "한",
    gradient: "linear-gradient(135deg, #b45309, #fbbf24)",
    text: "[국내] 삼전·닉스보다 큰 IPO… 스타십 V3에 달린 투심\n\n다음 달 역대급 IPO 앞두고 V3 시험비행이 '쇼케이스'. 피치북 \"IPO 전 남은 가장 중요한 이벤트\". 성공 시 12일 상장·로드쇼 4일 시작 예정. 화성 기지·100TW 우주 데이터센터 등 머스크 장기 목표와 연동.",
    likes: 712,
    replies: 143,
    reposts: 267,
    hasImage: false,
    minutesAgo: 720,
    source: "한국경제",
  },
  {
    name: "ABC News",
    handle: "abcnews_au",
    avatar: "AB",
    gradient: "linear-gradient(135deg, #be123c, #fb7185)",
    text: "[해외·호주] 일론 머스크 SpaceX, 업그레이드된 스타십 발사\n\n12번째 무인 시험, V3 크루즈선·슈퍼헤비 첫 비행. 스타십은 재진입을 견뎌 계획대로 기수 위로 인도양 착수. 다음 달 예상되는 역대급 IPO 앞두고 투자자 신뢰에 영향을 줄 수 있는 결과.",
    likes: 834,
    replies: 112,
    reposts: 298,
    hasImage: true,
    minutesAgo: 900,
    source: "ABC News",
  },
  {
    name: "SpaceX Feed",
    handle: "spacex_summary",
    avatar: "SX",
    gradient: "linear-gradient(135deg, #111827, #6b7280)",
    text: "[종합] Flight 12 / Starship V3 첫 비행 요약\n\n✓ 33 Raptor 부스터, 최대 1,800만 파운드 추력\n✓ 모의 Starlink 20기 배치\n✓ 2단 인도양 착수 성공\n△ 1단 슈퍼헤비 제어 착수 실패(멕시코만)\n△ Raptor 3 엔진 2기 이상 이상\n\nNASA Artemis · Starlink · IPO가 한 발사에 걸려 있었다.",
    likes: 1560,
    replies: 421,
    reposts: 890,
    hasImage: false,
    minutesAgo: 60,
    source: "종합",
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
      const { minutesAgo, source, ...rest } = p;
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
    console.log(`   SpaceX 뉴스 ${result.insertedCount}개 삽입됨\n`);
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
