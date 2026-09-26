# 함께 출석관리 — MVP 운영 안내

교회 서기·임원을 위한 **모바일 우선 출석 관리 MVP**입니다. 종이 출석부를 대체하는 회원 등록, 주차별 출석 체크, 전체/기수별 통계를 제공합니다.

> 현재 MVP는 React + tRPC + MySQL(drizzle-orm) 기반으로 동작하며, Manus 플랫폼 밖에서도 독립적으로 실행할 수 있습니다. **로그인/권한 기능은 아직 붙이지 않았습니다** — 서기·임원 몇 명이 로컬에서 직접 쓰는 초기 단계라 접근 제어 없이 모든 화면이 열려 있고, 실사용 규모가 커지면 그때 추가합니다. 요청하신 **Next.js + Supabase** 전환을 위해 Supabase 커넥터를 활성화했지만, 연결된 Supabase 프로젝트는 아직 없습니다. Supabase 프로젝트 생성은 조직 선택과 비용 확인이 필요하므로 이를 진행하기 전까지는 현재 MVP 런타임을 사용합니다.

## MVP에 포함된 기능

| 영역 | 제공 기능 |
|---|---|
| 접근 제어 | (아직 없음 — 로그인 없이 모든 화면·API가 열려 있음) |
| 회원 명단 | 회원 등록(기수 번호 직접 입력, 성별 선택), 연락처 및 상태 관리, 이름·기수 검색 |
| 출석 체크 | 예배일 선택, 기수별 칩 그리드(대규모 인원에 최적화), 전체 출석/해제, 일괄 저장 |
| 통계 | 최근 최대 8주 전체 출석 추이(Line chart), 최근 주차 기수별 출석률(Bar chart) |
| 반응형 | 모바일 하단 저장 버튼, 큰 터치 영역, 접히는 기수별 목록, 모바일 메뉴 |

## 운영 시작 순서

1. **회원 명단**에서 `회원 등록`으로 회원을 입력합니다. 기수는 숫자로 직접 입력합니다(예: `7` → 7기). `재적`과 `새가족` 상태만 출석 대상에 포함됩니다.
2. **출석 체크**에서 예배일을 선택하고 이름 칩을 눌러 출석/결석을 표시합니다.
3. 화면 하단의 **N명 출석 저장**을 눌러 일괄 저장합니다.
4. **출석 통계**에서 주별 전체 추이와 기수별 출석률을 확인합니다.

## 권한 운영

- 지금은 로그인 화면이 없고 모든 화면과 API가 열려 있습니다. 서기·임원이 소수 인원으로 로컬/사내망에서만 접속하는 초기 단계를 전제로 한 결정입니다.
- 외부에 공개하거나 사용자가 늘어나면 아이디/비밀번호 로그인과 `admin` 권한 검증을 다시 추가해야 합니다. 이전에 구현했던 버전이 git 히스토리(커밋 `ca3a02b`)에 남아 있어 참고해 되살릴 수 있습니다.

## 데이터 모델

| 테이블 | 목적 | 주요 필드 |
|---|---|---|
| `members` | 회원 명단 | `name`, `cohort`, `gender`, `phone`, `status`, `joinedAt` |
| `attendance_weeks` | 예배 주차 | `serviceDate` |
| `attendance` | 회원별 출석 기록 | `weekId`, `memberId`, `attended` |

출석 기록은 `(weekId, memberId)` 조합으로 유일하게 관리되어, 같은 주차에 저장을 반복해도 중복 행이 생기지 않습니다.

## 다음 단계 기능 로드맵

1. **심방 후보** — 설정 가능한 N주 연속 결석을 집계하여 대상 목록과 연락 상태를 제공
2. **새가족 정착** — 등록 후 N주 연속 출석률, 첫 방문일, 담당자 메모
3. **주간 리포트** — 이번 주 출석·전주 대비·연속 결석자를 복사 가능한 텍스트로 생성
4. **엑셀 내보내기** — 회원 명단과 주차별 출석을 `.xlsx`로 안전하게 백업

## Next.js + Supabase 전환 계획

Supabase 프로젝트를 준비하면 다음 순서로 전환합니다.

1. Supabase 조직을 선택하고 프로젝트 생성 비용을 확인·승인합니다.
2. Postgres에 `groups`, `members`, `attendance_weeks`, `attendance`, `profiles` 테이블을 생성하고 `(week_id, member_id)` unique 제약을 적용합니다.
3. Supabase Auth로 서기·임원 계정을 관리하고 `profiles.role = 'admin'` 기준의 RLS 정책을 적용합니다.
4. `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`를 Next.js 환경 변수로 등록합니다. Service Role Key는 서버 전용 환경 변수로만 보관합니다.
5. 현재 화면과 동작은 유지한 채 API 계층을 Supabase Server Actions/Route Handlers로 전환합니다.

### Supabase RLS 원칙

- `authenticated` 사용자라도 관리자 프로필이 아니면 모든 교회 업무 테이블을 조회·수정할 수 없도록 차단합니다.
- `attendance`는 관리자만 작성·수정할 수 있고, `recorded_by`에 현재 사용자 ID를 기록합니다.
- 연락처는 민감 정보이므로 서비스 키를 브라우저에 노출하지 않고, 기본 조회 범위도 관리자에게만 제한합니다.

## 로컬 실행 준비

1. 로컬 MySQL 실행 (Docker 사용):
   ```
   docker compose up -d
   ```
2. `.env.example`을 복사해 `.env`를 만들고 `DATABASE_URL`을 채웁니다. 위 `docker-compose.yml` 기준으로는 `mysql://root:church_member_dev@localhost:3306/church_member`입니다.
   ```
   cp .env.example .env
   ```
3. 스키마를 DB에 반영합니다:
   ```
   pnpm db:push
   ```
4. 개발 서버 실행:
   ```
   pnpm dev
   ```
5. `http://localhost:3000`에서 바로 사용할 수 있습니다 (로그인 없음).

## 검증 결과

- TypeScript: `pnpm check` 통과
- 테스트: `pnpm test` 통과
- 프로덕션 빌드: `pnpm build` 통과
- 데스크톱 및 375px 모바일 화면에서 현황·출석 체크·회원 명단·통계의 빈 상태를 확인
