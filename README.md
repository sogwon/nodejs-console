# 업무일지 웹 사이트

MySQL 기반 업무일지 CRUD와 웹 UI를 제공하는 Node.js 프로젝트입니다.  
(Tencent CloudBase MySQL 또는 일반 MySQL 호환 DB 사용 가능)

## 요구 사항

- Node.js 12+
- MySQL (또는 호환 DB)

## 설치

```bash
npm install
```

## 환경 변수

프로젝트 루트에 `.env` 파일을 만들고 MySQL 연결 정보를 설정하세요.

| 변수 | 설명 |
|------|------|
| `PORT` | 서버 포트 (기본 3000) |
| `CONNECTION_URI` | MySQL 연결 문자열 (한 줄) |
| 또는 `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | MySQL 개별 설정 |

`.env.example`을 복사한 뒤 값을 채우면 됩니다.

## DB 초기화 (work_logs 테이블 생성)

```bash
npm run init-db
```

## 실행

```bash
npm start
```

브라우저에서 **http://localhost:3000** 으로 접속하면 업무일지 화면이 열립니다.

## 기능

- **목록**: 날짜별 필터, 최신순 정렬
- **작성**: 새 업무일지 등록 (날짜, 제목, 내용)
- **조회**: 항목 클릭 시 상세 보기 (작성일·수정일 표시)
- **수정**: 상세 화면에서 수정
- **삭제**: 상세 화면에서 삭제 (확인 후 삭제)

## API

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | /api/entries | 목록 (쿼리: limit, offset, log_date) |
| POST | /api/entries | 작성 |
| GET | /api/entries/:id | 단건 조회 |
| PUT | /api/entries/:id | 수정 |
| DELETE | /api/entries/:id | 삭제 |
| GET | /api/health | 헬스 체크 |

## 프로젝트 구조

```
├── lib/
│   └── db.js          # MySQL 연결 풀
├── public/
│   ├── index.html     # 웹 앱 HTML
│   ├── app.js         # 프론트엔드 로직
│   └── style.css      # 스타일
├── scripts/
│   └── init-db.js     # work_logs 테이블 생성
├── server.js          # HTTP 서버 + API + 정적 파일
├── package.json
├── .env.example
└── README.md
```

## GitHub에 올리기

1. [GitHub](https://github.com/new)에서 새 저장소를 만든다 (이름 예: `work-log`).
2. 로컬에서 원격을 추가하고 푸시한다:

```bash
git remote add origin https://github.com/사용자명/저장소이름.git
git push -u origin main
```

(SSH를 쓰면 `git@github.com:사용자명/저장소이름.git` 형태로 추가하면 된다.)

## 참고

- [CloudBase MySQL 연결](https://docs.cloudbase.net/en/cloud-function/resource-integration/mysql)
