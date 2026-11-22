# 공부방 진행 상황 (담임 선생님 기록)

마지막 저장: 2026-11-07

## 지금까지 한 일
1. **폴더 구조**: 영문 이름(00_schedule, 01_korean~05_science, 06_career, 99_diary), 내용은 한국어. 규칙은 `CLAUDE.md`.
2. **선생님 지침 7개** (`.claude/agents/`): scheduler, korean, math, english, social, science, career. 각 담당 폴더에 `knowhow.md`.
3. **제안서** (https://claude.ai/artifact/HuRwGE2EE8jeGd2SFaiy1G): 2028 대입 조사, 학과 흐름, 선생님 구성, 로드맵, 단계별·과목별 심화 리서치. 사용자가 전부 수용하고 "적용 완료"로 표시함. 원본 HTML은 이 세션 scratchpad에 있음.
4. **로드맵**: `00_schedule/roadmap.md` (2026-11 ~ 2027-11-18 단계별 리서치 항목, 담당, 결과 파일, 상태).
5. **일기장**: `99_diary/` + `.gitignore` 제외. 선생님은 유빈이가 보여 줄 때만 읽음. 2026-11-22부터 git 저장소, GitHub **퍼블릭** https://github.com/anjin011/bini (사용자 선택, 커밋 이메일은 GitHub noreply). 빈 폴더는 `.gitkeep`으로 유지.
6. **상황판 플러그인** `studyroom-board`: `.claude/studyroom/studyroom-board/` (로컬 마켓플레이스 `studyroom`, 프로젝트 범위 설치·enabled, `.claude/settings.json`에 기록).
   - 맨 위 📌 가이드(단계, "이렇게 말해 보세요" 버튼 → 입력창 채우기, 규칙) + 현황 + 로드맵.
   - 역할은 세션 첫 메시지의 `(scheduler|korean|...)`로 판단, 없으면 담임 종합. `/board <role>`로 변경.
   - 폴더에서 바로 읽으므로 파일 수정이 곧 반영(세션 재시작 또는 /reload-plugins).
   - 실제 화면 확인은 아직 못 함.

## 선생님 세션
상황판이 켜진 새 세션 (사용 중):
- 📅 일정 `local_319585e0-19de-460d-90ee-f2ea46b8aaf7`
- 📕 국어 `local_7df21075-f232-49e0-8df7-94f7402dfda2`
- 📐 수학 `local_81402b21-969c-44b8-bbc4-77db7a4c9682`
- 🔤 영어 `local_87d869a8-604b-4e1d-8bf3-45825980e497`
- 🌏 사회 `local_0b76c0aa-788a-4827-aa3d-ac0c56819af1`
- 🔬 과학 `local_86b11c96-673e-4403-970b-687cc4a34a29`
- 🧭 진로 `local_d260392a-71ac-4863-93b5-7d68b37efa71`
- 📔 일기 `local_6aa5199e-84a7-4ea3-a652-56ece27e66f9` (2026-11-07 열림, 보고에는 일기 내용 없음)

7개 모두 준비 완료(2026-11-07 확인): 자기소개를 하고 유빈이의 정보(과목명, 교과서 출판사, 기말 날짜·범위, 수행평가, 시간표, 관심 분야)를 기다리는 중. 파일은 고치지 않음.

이전 세션 7개 (상황판 없음): 일정 `local_04122fbd…`, 국어 `local_530b25c1…`, 수학 `local_028ae3f5…`, 영어 `local_5bf9a1d8…`, 사회 `local_6dc65836…`, 과학 `local_eaa3ba4b…`, 진로 `local_46950528…`. 2026-11-07 사용자 동의로 **보관 완료** (필요하면 보관함에서 다시 열 수 있음).

## 📔 일기장 설정 (2026-11-07 완료, 사용자 요청으로 "일기 선생님" → "일기장")
- [x] `.claude/agents/diary.md` 지침 작성 (99_diary만 쓰기, 말한 그대로, 부탁할 때만 지난 일기, 보고에 내용 넣지 않기, 안전 안내 109·1388)
- [x] 상황판에 diary 역할 추가 (`.claude/studyroom/studyroom-board/`):
  - `types/index.d.ts` RoleId에 `'diary'`
  - `hooks/register.tsx`: ROLE_IDS·TEACHERS(`{ id:'diary', name:'📔 일기장', folder:'99_diary' }`)·역할 정규식·argumentHint에 diary 추가
  - `guideFor('diary')`: 단계(편하게 말하면 그대로 적어요 / 양식은 채우고 싶은 칸만 / 지난 일기는 부탁할 때만), 버튼(오늘 일기 쓰기, 질문해 줘, 기분만 기록, 지난 일기 보기, 이번 달 돌아보기), 규칙(다른 선생님은 일기장을 읽지 않아요, 말한 그대로 적어요, 내용은 다른 파일로 옮기지 않아요)
  - diary 화면: 헤더에 수능 D-day 빼기, "📔 내 일기장" = 오늘 일기 여부·이번 달 개수·전체 개수 (99_diary/YYYY-MM/ 파일 **이름만** 셈, 내용은 읽지 않음), 로드맵 없음
  - `claude plugin validate .claude/studyroom/studyroom-board` 통과 확인 (validate·tsc 통과, 2026-11-07)
- [x] CLAUDE.md: 폴더 트리 99_diary 줄과 선생님 표에 📔 일기장(diary, 99_diary) 추가, 일기장 절에 "일기장 말고는 읽거나 쓰지 않음, 일기 세션의 보고에는 내용 없이 한 일과 파일 위치만, 담임은 일기 세션 대화를 읽지 않음"
- [x] 메모리 `studyroom-diary-private.md`에 같은 내용 추가
- [x] 담임 세션에서 📔 일기장 세션 열기 (첫 메시지에 `(diary)` 포함, 제목 "📔 일기장"). 열면 아래 세션 목록에 id 추가.

## 남은 일 / 결정 대기
- [x] **2026-11-07 오전 8시 심화 개선안** 예약 실행 (받음, 상 11·중 15·하 4개, 사용량 0→4%) (`studyroom-deep-improvements`, 5시간 사용량 40% 안에서, 고치지 않고 제안만) 
- [ ] `.claude/reviews/2026-11-07-deep-improvements.md` 보고 적용할 개선안 고르기
- [ ] 상황판 실제 화면 확인 → 가이드 문구·배치 다듬기
- [x] 이전 선생님 세션 7개 보관 (2026-11-07)
- [ ] 이 담임 세션 재시작 시 종합 상황판 확인
- [ ] 유빈이 실제 과목명이 정해지면 폴더 이름(`02_math-calculus1` 식)과 지침·노하우 경로 변경
- [ ] 주간 회고 자동 실행 (사용자가 "나중에"라고 함)
- [ ] 대시보드 웹페이지 (선택)
- [ ] 11월 로드맵: 고3 개설 과목, 권장과목 대조, 학교 기출 경향, 11월 학평
