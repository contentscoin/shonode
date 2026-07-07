# Shonode

> Shonode is a lightweight, open-source storyboard node canvas for planning AI-assisted commercial videos. This README is in Korean; see the docs and code comments for English context.

**Shonode(쇼노드)**는 AI 광고영상 기획을 위한 오픈소스 **스토리보드 노드 캔버스**입니다. 막연한 브리프 한 문단을 광고 문법(6비트 계약)을 지키는 컷 시퀀스로 바꾸고, 각 컷마다 이미지·영상 생성 모델(I2I / T2I / I2V)에 바로 넣을 수 있는 프롬프트를 만들어 줍니다.

- **라이브 데모**: https://shonode-gold.vercel.app
- **SaaS 고도화 기획서**: [`docs/plan/ad-video-storyboard-saas-기획서.md`](docs/plan/ad-video-storyboard-saas-%EA%B8%B0%ED%9A%8D%EC%84%9C.md)

> 상태: 초기 프로토타입 / 커뮤니티 실험. 완성된 상용 제품이 아니며, 빠르게 바뀌는 중입니다.

## 주요 기능

- **프리폼 스토리보드 캔버스** — 팬/줌, 컷 카드를 노드처럼 연결
- **AI 디렉터 브리프** — 한국어 브리프 → 컷 분해 + 컷별 생성 프롬프트 자동 작성
- **Ad Storyboard Skill 플레이북 내장** — 6비트 광고 계약, 클레임 세이프티, 네거티브 제약을 모든 생성에 적용
- **AI 제공자 3종** — Gemini(서버 키) / OpenAI GPT(내 API 키) / Codex(ChatGPT 로그인, 로컬 전용)
- **레퍼런스 이미지 보드** — 첨부 이미지를 컷별로 배치해 I2I 생성 유도
- **선택 컷 재생성** — 문제 컷만 골라 프롬프트 리페어
- **클라우드 모드(선택)** — Supabase 로그인 + 클라우드 프로젝트 저장/불러오기
- **프로젝트 파일** — `.shonode`(JSON) 내보내기/가져오기, 로컬 저장(localStorage + IndexedDB)
- **Vercel 호환** — 정적 프론트 + 서버리스 API로 무설정 배포

## 빠른 시작

### 1. 요구 사항

- Node.js `>=20` (의존성 설치 불필요 — Node 내장 모듈과 브라우저 API만 사용)

### 2. 환경 설정

`.env.example`을 `.env`로 복사하고 필요한 값을 채웁니다:

```env
# Gemini 제공자(서버 기본)를 쓸 때만 필요
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
PORT=4173

# 선택: /api/storyboard 호출을 허용할 웹 오리진 (콤마 구분)
# SHONODE_ALLOWED_ORIGINS=https://your-domain.example

# 선택: Supabase 클라우드 모드
# SUPABASE_URL=https://your-project-ref.supabase.co
# SUPABASE_ANON_KEY=your_supabase_anon_or_publishable_key
```

`.env`와 실제 API 키는 절대 커밋하지 마세요.

### 3. 실행

```bash
npm run dev        # http://127.0.0.1:4173
npm run check      # 전체 JS 문법 검사
```

## AI 제공자

좌측 **AI 패널 → AI 제공자**에서 선택합니다.

| 제공자 | 키/인증 | 동작 환경 | 설명 |
|---|---|---|---|
| **Gemini (서버 기본)** | 운영자가 `GEMINI_API_KEY` 설정 | 로컬 + 호스팅 | `/api/storyboard` 프록시 경유. 키가 없으면 로컬 오프라인 플랜으로 폴백 |
| **OpenAI GPT (내 API 키)** | 사용자가 자기 `sk-...` 키 입력 | 로컬 + 호스팅 | 키는 **사용자 브라우저(localStorage)에만 저장**되고 요청 헤더로 `/api/storyboard-openai`에 전달 — 서버는 보관·로깅 없이 OpenAI로 1회 전달만 합니다. 기본 모델 `gpt-4o-mini`(변경 가능), `OPENAI_BASE_URL`로 호환 업스트림 교체 가능 |
| **Codex (ChatGPT 로그인)** | `codex login` (API 키 불필요) | **로컬 전용** | 로컬에 설치된 [Codex CLI](https://github.com/openai/codex)를 서버가 `codex exec`로 호출해 ChatGPT 계정 인증을 그대로 사용. 호스팅 배포에서는 501 안내 응답. `CODEX_BIN`, `CODEX_EXTRA_ARGS`, `CODEX_TIMEOUT_MS`로 튜닝 |

제공자를 선택하면 선택란 바로 아래 **상태 카드**가 지금 생성 가능한지 알려줍니다:

- Gemini: 서버 키 설정 여부 (미설정이면 오프라인 초안 폴백 안내)
- OpenAI: 키 입력 여부 + "키는 이 브라우저에만 저장" 안내
- Codex: ✅ ChatGPT 로그인됨 / ⚠️ CLI는 있으나 `codex login` 필요 / ⛔ CLI 미설치 / ⛔ 호스팅 환경(로컬 전용) — "다시 확인" 버튼으로 재점검 (`GET /api/codex-status`)

Codex 사용법:

```bash
npm install -g @openai/codex   # Codex CLI 설치 (최초 1회)
codex login                    # ChatGPT 계정 로그인 (최초 1회)
npm run dev                    # Shonode 로컬 실행 후 AI 제공자에서 Codex 선택
```

상태 카드가 "✅ ChatGPT 계정으로 로그인되어 있습니다"로 바뀌면 준비 완료입니다.

제공자 레이어는 추후 OpenAI "Sign in with ChatGPT"(호스팅 앱용 OAuth, 개발자 프로그램 승인 필요) 같은 토큰 기반 제공자를 요청 플로우 재작업 없이 끼울 수 있도록 설계돼 있습니다.

## Ad Storyboard Skill 팩 (광고 문법 플레이북)

`packs/ad-storyboard-skill.js`는 OpenCrab **Ad Storyboard Skill Workflow**(QC 검증된 5노드 워크플로우)에서 증류한 크리에이티브 플레이북으로, **모든 제공자의 생성 프롬프트에 자동 주입**됩니다.

**6비트 광고 계약** (30초 기준, 길이에 따라 비례 조정):

| 비트 | 구간 | 역할 |
|---|---|---|
| `hook` | 0–3s | 스크롤을 멈추게 하는 훅 |
| `tension` | 3–7s | 제품이 해결할 문제/욕구/긴장 |
| `reveal` | 7–12s | 브랜드가 또렷한 제품 등장 |
| `proof` | 12–20s | 데모/증명 — 제품 액션, 사용 장면, 근거 |
| `joy` | 20–26s | 조이 페이오프 — 감정적·사회적·감각적 결과 |
| `cta` | 26–30s | 단일 CTA + 메모리 프레임 |

**QC 규칙**: 고위험 제품(건강기능·의료·금융 등) + 증빙 없음 → 클레임 없는 컨셉만 생성, 통계·수상·후기·전문가 보증 날조 금지, proof와 joy의 장면 기능 중복 금지, CTA는 단 하나, 레퍼런스 이미지는 재해석만(원본 프레임·배우·로고 복제 금지).

생성된 각 컷은 `beat` 라벨을 갖고 패널에 저장됩니다.

## 클라우드 모드 (선택, Supabase)

기본은 완전 로컬 동작입니다. 환경변수 두 개를 설정하면 계정 로그인 + 클라우드 프로젝트 저장이 켜집니다:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_or_publishable_key
```

- 브라우저는 `/api/config`에서 이 값을 받아옵니다. 미설정이면 클라우드 버튼 자체가 나타나지 않고 외부 요청도 없습니다. 환경변수 대신 `shonode.config.json`(공개 설정 파일)로도 제공할 수 있으며, 환경변수가 우선합니다.
- 스키마는 [`supabase/migrations/0001_shonode_studio_init.sql`](supabase/migrations/0001_shonode_studio_init.sql)을 Supabase SQL Editor에서 실행해 적용합니다 — `profiles`, `projects` 테이블과 소유자 전용 RLS, 가입 시 프로필 자동 생성 트리거가 포함됩니다.
- 인증: 이메일/비밀번호 + Google OAuth(Supabase 대시보드에서 프로바이더 활성화 필요). Authentication → URL Configuration의 **Site URL**을 배포 도메인으로 설정하세요.
- 클라우드 프로젝트는 `shonode-workspace-v2` 스냅샷 전체를 저장하며, `.shonode` 내보내기/가져오기는 그대로 유지됩니다(락인 방지).
- anon key는 공개 설계값입니다(데이터 접근은 RLS로 보호). Gemini 키와 Supabase service-role 키는 절대 클라이언트에 노출하지 마세요.
- `vendor/supabase-js-2.110.0.js`는 CDN 의존을 없애기 위해 벤더링한 `@supabase/supabase-js` UMD 빌드로, 클라우드 모드가 설정된 경우에만 로드됩니다.

## 프로젝트 파일 포맷

`.shonode` 파일은 JSON 워크스페이스 스냅샷입니다 (현재 버전: `shonode-workspace-v2`):

- 프로젝트 메타데이터 (선택된 크리에이티브 `pattern`, `claimLog` 포함)
- 컷 카드 내용·위치 (6비트 `beat` 라벨 포함)
- I2I / T2I / I2V 프롬프트
- 레퍼런스 이미지, 선택 상태, 줌/스크롤, 사이드바 상태

가져오기는 `shonode-workspace-v2`와 구버전 `shonode-workspace-v1`, 레거시 `.json` 백업을 모두 지원하며, 구버전 스냅샷은 가져올 때 누락 필드가 안전 기본값으로 채워집니다.

## 배포 (Vercel)

정적 프론트 + 서버리스 API로 배포합니다. `vercel.json`이 빌드(`@vercel/static` + `@vercel/node`)와 라우트를 명시하고 있어 별도 설정이 필요 없습니다.

1. Vercel에서 이 리포를 Import (main 푸시마다 자동 배포)
2. 환경변수 설정:
   - `GEMINI_API_KEY` — Gemini 제공자를 쓸 때 (선택)
   - `GEMINI_MODEL` — 기본 모델 변경 시 (선택)
   - `SHONODE_ALLOWED_ORIGINS` — 프로덕션 오리진 제한 시 (선택)
   - `SUPABASE_URL` / `SUPABASE_ANON_KEY` — 클라우드 모드 (선택, `shonode.config.json`으로 대체 가능)
3. 실제 시크릿 키(Gemini, service-role)는 절대 클라이언트 파일에 넣지 마세요. Supabase anon key는 공개 설계값이라 예외입니다.

공개 배포 시 API 키 보호와 사용량 쿼터는 운영자 책임입니다.

## API 라우트

| 라우트 | 메서드 | 설명 |
|---|---|---|
| `/api/storyboard` | POST | Gemini 프록시 (서버 키, 요청 스키마 검증 + 오리진 정책) |
| `/api/storyboard-openai` | POST | OpenAI 프록시 (BYO 키는 `x-openai-key` 헤더, 서버 미보관) |
| `/api/storyboard-codex` | POST | Codex CLI 실행 (로컬 전용, 호스팅에서는 501) |
| `/api/config` | GET | 공개 클라이언트 설정(Supabase URL/anon key) 주입 |

## 주요 파일

| 파일 | 역할 |
|---|---|
| `index.html` / `style.css` | 앱 마크업과 전체 스타일 |
| `script.js` | 캔버스 엔진 — 패널 모델, 팬/줌, 실행취소, 로컬 저장 |
| `shotboard-ai.js` | AI 워크플로우 — 브리프 플로우, 연결선, 워크스페이스 라이브러리, `.shonode` |
| `ai-client.js` | 제공자별 요청 빌더 + 응답 정규화 (Gemini/OpenAI/Codex 공용 플랜 스키마) |
| `packs/ad-storyboard-skill.js` | 광고 문법 플레이북 (프롬프트 자동 주입) |
| `storyboard-proxy.js` / `openai-proxy.js` / `codex-proxy.js` / `config-endpoint.js` | 서버 측 프록시·설정 핸들러 (로컬 서버와 Vercel 함수가 공유) |
| `auth-client.js` / `cloud-sync.js` | Supabase 인증 + 클라우드 프로젝트 UI |
| `server.js` | 로컬 정적 서버 + API 라우팅 |
| `api/` | Vercel 서버리스 진입점 |
| `supabase/migrations/` | 클라우드 모드 DB 스키마 |
| `docs/plan/` | SaaS 고도화 기획 문서 |

## 로드맵과 기획

제품·아키텍처 기획 문서는 `docs/plan/`에 있습니다. 현재 SaaS 고도화 기획서: [`docs/plan/ad-video-storyboard-saas-기획서.md`](docs/plan/ad-video-storyboard-saas-%EA%B8%B0%ED%9A%8D%EC%84%9C.md) (한국어, 영문 초록 포함). Phase 0(정지작업)과 Phase 1 일부(클라우드 모드, 제공자 확장, 팩 연결)가 반영된 상태이며, 다음 단계는 비트 레인 UI와 인테이크 폼 + qc_gate 리스크 배지입니다.

## 이 리포에 포함되지 않는 것

- 호스팅된 API 키, 번들된 `.env`, 비공개 프로젝트 파일
- 프로토타입 수준 요청 검증을 넘어서는 프로덕션 어뷰징 방어

## 기여

PR, 이슈, 실험, 작은 협업 아이디어 모두 환영합니다. `CONTRIBUTING.md`를 참고하세요.

## 보안

API 키, 민감한 데이터가 담긴 프롬프트, 민감한 레퍼런스가 포함된 프로젝트 파일을 공개 이슈에 올리지 마세요. `SECURITY.md`를 참고하세요.

## 라이선스

MIT License. `LICENSE`를 참고하세요.
