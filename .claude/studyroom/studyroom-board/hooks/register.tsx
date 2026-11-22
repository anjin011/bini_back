import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { RoleId } from '../types'

// 유빈이 공부방 상황판: 선생님 세션마다 옆 패널에 가이드(맨 위)와 진행 상황을 보여준다.
// 담임(메인) 세션은 모든 선생님을 모은 종합 상황판.

const PANE = 'board'
const role = atom({ plugin: 'studyroom-board', key: 'role' } as const, '')
const rev = atom({ plugin: 'studyroom-board', key: 'rev' } as const, 0)

const ROLE_IDS: RoleId[] = ['homeroom', 'scheduler', 'korean', 'math', 'english', 'social', 'science', 'career', 'diary']

type Teacher = { id: RoleId; name: string; folder: string; subject?: string }

const TEACHERS: Teacher[] = [
  { id: 'scheduler', name: '📅 일정 선생님', folder: '00_schedule' },
  { id: 'korean', name: '📕 국어 선생님', folder: '01_korean', subject: '국어' },
  { id: 'math', name: '📐 수학 선생님', folder: '02_math', subject: '수학' },
  { id: 'english', name: '🔤 영어 선생님', folder: '03_english', subject: '영어' },
  { id: 'social', name: '🌏 사회 선생님', folder: '04_social', subject: '사회' },
  { id: 'science', name: '🔬 과학 선생님', folder: '05_science', subject: '과학' },
  { id: 'career', name: '🧭 진로 선생님', folder: '06_career' },
  { id: 'diary', name: '📔 일기장', folder: '99_diary' },
]
const SUBJECTS = TEACHERS.filter(t => t.subject)

const CSAT_UTC = Date.UTC(2027, 10, 18)

// ---------- 가이드 ----------

type Ask = { label: string; text: string }
type Guide = { steps: string[]; asks: Ask[]; rules: string[] }

const SUBJECT_EXTRA: Partial<Record<RoleId, Ask>> = {
  korean: { label: '작품 정리', text: '작품 정리해줘: ○○ (작가 ○○)' },
  math: { label: '수능형 섞어 풀기', text: '대수·미적분Ⅰ·확률과 통계를 섞어서 수능형 3문제 내줘.' },
  english: { label: '본문 어법 포인트', text: '○과 본문 어법 포인트 정리해줘.' },
  social: { label: '통합사회 복습', text: '통합사회 복습 퀴즈 3문제 내줘. 단원: ○○' },
  science: { label: '통합과학 복습', text: '통합과학 복습 퀴즈 3문제 내줘. 단원: ○○' },
}

function guideFor(id: RoleId): Guide {
  if (id === 'homeroom') {
    return {
      steps: [
        '과목 선생님 세션에 과목명·교과서·기말 날짜와 범위를 알려줘요',
        '📅 일정 선생님에게 "calendar 업데이트해줘"',
        '매주 일요일 저녁, 여기서 주간 회고를 해요',
        '진로·세특은 🧭 진로 선생님, 공부는 과목 선생님에게',
      ],
      asks: [
        { label: '전체 상황 요약', text: '공부방 전체 상황을 요약해줘: 다가오는 평가, 이번 달 로드맵 항목, 선생님별 진행 상황, 지금 가장 먼저 할 일 3개.' },
        { label: '주간 회고', text: '이번 주 공부방 회고를 해줘. 선생님별로 바뀐 파일, 잘된 것과 밀린 것을 정리하고 각 knowhow.md 5번에 남길 내용을 제안해줘.' },
        { label: '노하우 모으기', text: '각 선생님 knowhow.md의 4·5번을 훑어보고, 여러 과목에 통하는 것을 CLAUDE.md로 옮길 후보로 정리해줘.' },
        { label: '선생님 세션 열기', text: '○○ 선생님 세션을 열어줘.' },
      ],
      rules: ['각 선생님은 자기 폴더에만 써요', '일기장(99_diary)은 유빈이가 보여 줄 때만 읽어요'],
    }
  }
  if (id === 'scheduler') {
    return {
      steps: [
        '과목 선생님이 평가를 기록하면 여기서 모아요',
        '기말 4주 전부터 시험 모드 계획을 짜요',
        '일요일마다 다음 주 계획을 세워요',
      ],
      asks: [
        { label: 'calendar 업데이트', text: 'calendar 업데이트해줘.' },
        { label: '이번 주 계획', text: '이번 주 계획 짜줘. 학원은 ○요일 ○시~○시야.' },
        { label: '시험 모드 계획', text: '기말 시험 모드 계획 세워줘. 시험은 ○○부터 ○○까지, 순서는 ○○.' },
        { label: '모의고사 결과 정리', text: '○월 학평 결과 정리해줘: 국어 ○, 수학 ○, 영어 ○, 통합사회 ○, 통합과학 ○, 한국사 ○.' },
        { label: '이번 달 로드맵', text: '로드맵에서 이번 달 항목과 담당을 보여줘.' },
      ],
      rules: ['과목 평가표는 읽기만 해요', '하루 할 일은 5개까지, 주 1일은 비워 둬요'],
    }
  }
  if (id === 'career') {
    return {
      steps: [
        '좋아하는 과목이나 관심 분야부터 편하게 이야기해요',
        '과목 선생님이 남긴 세특 거리를 모아요',
        '고3 과목이 대학 권장과목과 맞는지 확인해요',
      ],
      asks: [
        { label: '관심 분야 이야기', text: '요즘 관심 있는 건 ○○이야. 어떤 학과들이 있는지 같이 보자.' },
        { label: '세특 거리 모으기', text: '과목별 세특 거리를 모아서 seteuk-notes에 정리해줘.' },
        { label: '고3 과목 점검', text: '고3 수강 과목은 ○○, ○○, ○○이야. 권장과목이랑 맞는지 봐줘.' },
        { label: '학과 탐색', text: '○○학과 탐색해줘.' },
        { label: '11월 리서치', text: '11월 로드맵 리서치 시작해줘: 우리 학교 고3 개설 과목.' },
      ],
      rules: ['자기소개·보고서 글은 대신 쓰지 않아요', '입시 정보는 원문을 확인하고 상태를 표시해요'],
    }
  }
  if (id === 'diary') {
    return {
      steps: [
        '오늘 있었던 일을 편하게 말해요. 말한 그대로 적어요',
        '양식(공부·기분·잘한 것·아쉬운 것·내일)은 채우고 싶은 칸만',
        '지난 일기는 부탁할 때만 같이 봐요',
      ],
      asks: [
        { label: '오늘 일기 쓰기', text: '오늘 일기 쓸래. ○○' },
        { label: '질문해 줘', text: '오늘 일기 쓰게 질문 하나씩 해줘.' },
        { label: '기분만 기록', text: '오늘 기분은 ○점이야. 한 줄만 적어줘: ○○' },
        { label: '지난 일기 보기', text: '○월 ○일 일기 보여줘.' },
        { label: '이번 달 돌아보기', text: '이번 달 일기에서 기분 점수랑 잘한 것만 모아 보여줘.' },
      ],
      rules: ['다른 선생님은 일기장을 읽지 않아요', '말한 그대로 적고, 고치거나 평가하지 않아요', '일기 내용은 다른 파일로 옮기지 않아요'],
    }
  }
  const s = TEACHERS.find(t => t.id === id)?.subject ?? '과목'
  const asks: Ask[] = [
    { label: '평가 일정 기록', text: `${s} 평가 일정 기록해줘: ○○일 기말, 범위 ○○. 수행평가는 ○○일 ○○.` },
    { label: '오늘 배운 것 정리', text: `오늘 ${s} 수업에서 ○○을 배웠어. 정리해줘.` },
    { label: '퀴즈 3문제', text: `${s} 퀴즈 3문제 내줘. 범위: ○○` },
    { label: '힌트만 줘', text: '이 문제 힌트만 줘: ○○' },
    { label: '오답 정리', text: '이 문제 틀렸어. 오답노트에 정리해줘: ○○ (내 답: ○, 정답: ○)' },
  ]
  const extra = SUBJECT_EXTRA[id]
  if (extra) asks.push(extra)
  return {
    steps: [
      '기말 날짜와 범위를 알려주면 평가표에 기록해요',
      '공부가 끝나면 퀴즈 3문제로 확인해요',
      '틀린 문제는 오답노트에 다시 풀 날짜와 함께 남겨요',
    ],
    asks,
    rules: ['정답보다 힌트 먼저 (힌트 사다리)', '수행평가 글은 대신 쓰지 않아요'],
  }
}

// ---------- 파일 읽기 ----------

async function readText($: EngineInterface, path: string): Promise<string | null> {
  try {
    const text = await $.fs.read(path)
    return typeof text === 'string' ? text : null
  } catch {
    return null
  }
}

async function listDir($: EngineInterface, path: string) {
  try {
    return await $.fs.list(path)
  } catch {
    return []
  }
}

async function countFiles($: EngineInterface, path: string, depth = 1): Promise<number> {
  let n = 0
  for (const entry of await listDir($, path)) {
    if (entry.name.startsWith('.') || entry.name.startsWith('_')) continue
    if (entry.kind === 'file') n += 1
    else if (entry.kind === 'dir' && depth > 1) n += await countFiles($, `${path}/${entry.name}`, depth - 1)
  }
  return n
}

async function countDirs($: EngineInterface, path: string): Promise<number> {
  return (await listDir($, path)).filter(e => e.kind === 'dir' && !e.name.startsWith('.')).length
}

type Item = { date: string; kind: string; what: string; status: string; subject: string }

function parseAssessments(md: string, subject: string): Item[] {
  return md
    .split('\n')
    .filter(line => /^\|\s*(\d{4}-\d{2}-\d{2}|미정)\s*\|/.test(line))
    .map(line => {
      const c = line.split('|').slice(1, -1).map(s => s.trim())
      return { date: c[0] ?? '', kind: c[1] ?? '', what: c[2] ?? '', status: c[4] ?? '', subject }
    })
}

type Row = { owner: string; item: string; status: string }
type Stage = { start: string; title: string; rows: Row[] }

function parseRoadmap(md: string): Stage[] {
  const stages: Stage[] = []
  let cur: Stage | undefined
  for (const line of md.split('\n')) {
    const h = line.match(/^## (\d{4}-\d{2})(.*)$/)
    if (h) {
      cur = { start: h[1] ?? '', title: `${h[1] ?? ''}${h[2] ?? ''}`.replace('(지금)', '').replace(/\s+/g, ' ').trim(), rows: [] }
      stages.push(cur)
      continue
    }
    if (!cur || !line.startsWith('|') || /^\|\s*(담당|-)/.test(line)) continue
    const c = line.split('|').slice(1, -1).map(s => s.trim())
    if (c.length >= 4) cur.rows.push({ owner: c[0] ?? '', item: c[1] ?? '', status: c[3] ?? '' })
  }
  return stages
}

function seteukCount(md: string | null): number {
  if (!md) return 0
  return (md.replace(/<!--[\s\S]*?-->/g, '').match(/^## /gm) ?? []).length
}

// ---------- 날짜 ----------

type Today = { utc: number; ymd: string; ym: string }

async function today($: EngineInterface): Promise<Today> {
  const k = new Date((await $.clock.now()) + 9 * 3600 * 1000)
  const y = k.getUTCFullYear()
  const m = k.getUTCMonth() + 1
  const d = k.getUTCDate()
  const pad = (n: number) => String(n).padStart(2, '0')
  return { utc: Date.UTC(y, m - 1, d), ymd: `${y}-${pad(m)}-${pad(d)}`, ym: `${y}-${pad(m)}` }
}

function daysUntil(date: string, t: Today): number | null {
  const m = date.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  return Math.round((Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) - t.utc) / 86400000)
}

function dLabel(n: number | null): string {
  if (n === null) return '미정'
  if (n === 0) return 'D-DAY'
  return n > 0 ? `D-${n}` : `D+${-n}`
}

function weekKey(date: string): string | null {
  const m = date.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  const dow = (new Date(t).getUTCDay() + 6) % 7
  return new Date(t - dow * 86400000).toISOString().slice(0, 10)
}

// ---------- 역할 ----------

let detected: RoleId | undefined

async function currentRole($: EngineInterface): Promise<RoleId> {
  const set = await read($, role)
  if (ROLE_IDS.includes(set as RoleId)) return set as RoleId
  if (detected) return detected
  const msgs = await $.session.messages()
  if (Array.isArray(msgs)) {
    const first = msgs.find(m => m.role === 'user')
    if (first) {
      const m = first.text.match(/\((scheduler|korean|math|english|social|science|career|diary)\)/)
      detected = (m?.[1] as RoleId | undefined) ?? 'homeroom'
      return detected
    }
  }
  return 'homeroom'
}

function roleName(id: RoleId): string {
  return id === 'homeroom' ? '🏫 담임 선생님' : TEACHERS.find(t => t.id === id)?.name ?? id
}

function ownsRow(id: RoleId, owner: string): boolean {
  if (id === 'homeroom') return true
  if (owner.includes(id)) return true
  if (id === 'scheduler') return false
  if (id === 'career' || id === 'diary') return false
  return owner.includes('각 과목') || owner.includes('전 과목') || owner.includes('유빈이')
}

async function isStudyRoom($: EngineInterface, root: string): Promise<boolean> {
  return (await $.fs.exists(`${root}/00_schedule/roadmap.md`)) && (await $.fs.exists(`${root}/CLAUDE.md`))
}

async function upcoming($: EngineInterface, root: string, teachers: Teacher[], t: Today) {
  const all: Item[] = []
  for (const s of teachers) {
    const md = await readText($, `${root}/${s.folder}/1_assessment/assessments.md`)
    if (md) all.push(...parseAssessments(md, s.subject ?? s.name))
  }
  const open = all.filter(i => i.status !== '완료')
  const dated = open
    .filter(i => (daysUntil(i.date, t) ?? -1) >= 0)
    .sort((a, b) => a.date.localeCompare(b.date))
  const undated = open.filter(i => i.date === '미정')
  const weeks = new Map<string, number>()
  for (const i of dated) {
    const w = weekKey(i.date)
    if (w) weeks.set(w, (weeks.get(w) ?? 0) + 1)
  }
  const crowded = [...weeks.entries()].filter(([, n]) => n >= 3).map(([w, n]) => `${w} 주에 평가 ${n}개`)
  return { dated, undated, crowded }
}

// 일기장: 파일 이름(날짜)만 센다. 내용은 읽지 않는다.
async function diaryStats($: EngineInterface, root: string, t: Today) {
  const days = new Set<string>()
  for (const dir of await listDir($, `${root}/99_diary`)) {
    if (dir.kind !== 'dir' || !/^\d{4}-\d{2}$/.test(dir.name)) continue
    for (const f of await listDir($, `${root}/99_diary/${dir.name}`)) {
      const m = f.kind === 'file' ? f.name.match(/^(\d{4}-\d{2}-\d{2})\.md$/) : null
      if (m?.[1]) days.add(m[1])
    }
  }
  return {
    today: days.has(t.ymd),
    month: [...days].filter(d => d.startsWith(t.ym)).length,
    total: days.size,
  }
}

// ---------- 그리기 ----------

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'board',
      description: '공부방 상황판 열기 (/board math 처럼 역할을 바꿀 수 있어요)',
      argumentHint: '[homeroom|scheduler|korean|math|english|social|science|career|diary]',
    })
    const root = await $.session.root()
    if (await isStudyRoom($, root)) {
      void $.ui.open({ id: PANE, title: '📋 상황판' })
      $.clock.every(60000, () => void update($, rev, n => n + 1))
    }
    return next(e)
  })

  on('command.run', { command: 'board' }, async ($, e) => {
    const arg = e.args.trim()
    if (arg && ROLE_IDS.includes(arg as RoleId)) await update($, role, () => arg)
    else if (arg) return { text: `역할 이름을 모르겠어요: ${arg}. 쓸 수 있는 이름: ${ROLE_IDS.join(', ')}` }
    const opened = await $.ui.open({ id: PANE, title: '📋 상황판' })
    await update($, rev, n => n + 1)
    return { text: opened.isPlaced ? '상황판을 열었어요.' : '상황판을 열었지만 지금 화면에 자리가 없어요.' }
  })

  on('tool.call', async ($, e, next) => {
    const result = await next(e)
    if (['Write', 'Edit', 'MultiEdit', 'NotebookEdit', 'Bash'].includes(String(e.tool))) {
      await update($, rev, n => n + 1)
    }
    return result
  })

  on('turn.complete', async ($, e, next) => {
    await update($, rev, n => n + 1)
    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    await read($, rev)
    const root = await $.session.root()
    if (!(await isStudyRoom($, root))) {
      return <Text dimColor>이 폴더는 공부방이 아니에요. bini 폴더에서 열어 주세요.</Text>
    }
    const id = await currentRole($)
    const t = await today($)
    const guide = guideFor(id)
    const csat = Math.round((CSAT_UTC - t.utc) / 86400000)

    const roadmapMd = await readText($, `${root}/00_schedule/roadmap.md`)
    const stages = roadmapMd ? parseRoadmap(roadmapMd) : []
    const curIdx = Math.max(0, stages.reduce((acc, s, i) => (s.start <= t.ym ? i : acc), 0))
    const stage = stages[curIdx]
    const myRows = stage ? stage.rows.filter(r => ownsRow(id, r.owner)) : []

    const refresh = () => void update($, rev, n => n + 1)

    const header = (
      <Box flexDirection="column">
        <Text bold size="heading">
          {roleName(id)}
        </Text>
        <Text dimColor>
          {id === 'diary' ? t.ymd : `${t.ymd} · 2028 수능 ${dLabel(csat)} (2027-11-18)`}
        </Text>
      </Box>
    )

    const guideBox = (
      <Box flexDirection="column" borderStyle="round" borderColor="claude" paddingX={1} gap={1}>
        <Text bold color="claude" size="heading">
          📌 가이드
        </Text>
        <Box flexDirection="column">
          {guide.steps.map((s, i) => (
            <Text>{`${i + 1}. ${s}`}</Text>
          ))}
        </Box>
        <Box flexDirection="column">
          <Text bold>이렇게 말해 보세요</Text>
          <Text dimColor>누르면 입력창에 들어가요. ○○만 고쳐서 보내요.</Text>
          {guide.asks.map((a, i) => (
            <Button
              key={`ask-${i}`}
              label={a.label}
              variant={i === 0 ? 'primary' : 'secondary'}
              onPress={() => void $.prompt.fill({ text: a.text })}
            />
          ))}
        </Box>
        <Box flexDirection="column">
          {guide.rules.map(r => (
            <Text dimColor>{`· ${r}`}</Text>
          ))}
        </Box>
      </Box>
    )

    const roadmapBox = stage ? (
      <Box flexDirection="column">
        <Text bold>{`🗺️ 로드맵 · ${stage.title}`}</Text>
        {myRows.length === 0 && <Text dimColor>이번 단계에 맡은 항목이 없어요.</Text>}
        {myRows.slice(0, 8).map(r => (
          <Text dimColor={r.status === '완료'}>
            {`${r.status === '완료' ? '✔' : r.status === '진행중' ? '▶' : '○'} ${id === 'homeroom' ? `[${r.owner}] ` : ''}${r.item}`}
          </Text>
        ))}
        {myRows.length > 8 && <Text dimColor>{`… 외 ${myRows.length - 8}개 (00_schedule/roadmap.md)`}</Text>}
      </Box>
    ) : (
      <Text dimColor>로드맵 파일을 찾지 못했어요.</Text>
    )

    // 일기장
    if (id === 'diary') {
      const d = await diaryStats($, root, t)
      return (
        <Box flexDirection="column" gap={1}>
          {header}
          {guideBox}
          <Box flexDirection="column">
            <Text bold>📔 내 일기장</Text>
            <Text>{d.today ? '오늘 일기 ✔' : '오늘 일기는 아직이에요'}</Text>
            <Text>{`이번 달 ${d.month}개 · 모두 ${d.total}개`}</Text>
            <Text dimColor>일기 내용은 상황판에 보이지 않아요. 다른 선생님 상황판에도 나오지 않아요.</Text>
          </Box>
          <Button key="refresh" label="새로고침" plain onPress={refresh} />
        </Box>
      )
    }

    // 담임 종합 상황판
    if (id === 'homeroom' || id === 'scheduler') {
      const up = await upcoming($, root, SUBJECTS, t)
      const rows: string[] = []
      if (id === 'homeroom') {
        for (const s of SUBJECTS) {
          const items = up.dated.filter(i => i.subject === s.subject)
          const nextOne = items[0]
          const mistakes = await countFiles($, `${root}/${s.folder}/3_mistakes`)
          const research = (await listDir($, `${root}/${s.folder}/5_research`)).filter(
            f => f.kind === 'file' && f.name !== 'seteuk-ideas.md' && !f.name.startsWith('.'),
          ).length
          const seteuk = seteukCount(await readText($, `${root}/${s.folder}/5_research/seteuk-ideas.md`))
          const nextText = nextOne ? `${dLabel(daysUntil(nextOne.date, t))} ${nextOne.kind}` : '평가 없음'
          rows.push(`${s.name.split(' ')[0]} ${s.subject}  ${nextText} · 오답 ${mistakes} · 리서치 ${research} · 세특 ${seteuk}`)
        }
        const notes = await readText($, `${root}/06_career/seteuk-notes.md`)
        const noteRows = notes ? notes.split('\n').filter(l => /^\|\s*\d{4}-/.test(l)).length : 0
        const careerResearch = await countFiles($, `${root}/06_career/research`)
        rows.push(`🧭 진로  세특 메모 ${noteRows} · 리서치 ${careerResearch} · 학과 ${await countFiles($, `${root}/06_career/majors`)}`)
      }
      const weekly = (await listDir($, `${root}/00_schedule/weekly`))
        .filter(f => f.kind === 'file' && f.name.endsWith('.md'))
        .map(f => f.name)
        .sort()
        .at(-1)
      const calendar = await readText($, `${root}/00_schedule/calendar.md`)
      const lastUpdate = calendar?.match(/마지막 업데이트:\s*(.+)/)?.[1]?.trim() ?? '없음'

      return (
        <Box flexDirection="column" gap={1}>
          {header}
          {guideBox}
          <Box flexDirection="column">
            <Text bold>📅 다가오는 평가</Text>
            {up.dated.length === 0 && <Text dimColor>아직 기록된 평가가 없어요. 과목 선생님에게 알려 주세요.</Text>}
            {up.dated.slice(0, 6).map(i => (
              <Text>{`${dLabel(daysUntil(i.date, t))}  ${i.date} ${i.subject} ${i.kind} · ${i.what}`}</Text>
            ))}
            {up.undated.length > 0 && <Text dimColor>{`날짜 미정 ${up.undated.length}개`}</Text>}
            {up.crowded.map(w => (
              <Text color="warning">{`⚠️ ${w}`}</Text>
            ))}
          </Box>
          {id === 'homeroom' && (
            <Box flexDirection="column">
              <Text bold>👩‍🏫 선생님별 현황</Text>
              {rows.map(r => (
                <Text>{r}</Text>
              ))}
            </Box>
          )}
          {roadmapBox}
          <Text dimColor>{`calendar 마지막 업데이트: ${lastUpdate} · 최근 주간 계획: ${weekly ?? '없음'}`}</Text>
          <Button key="refresh" label="새로고침" plain onPress={refresh} />
        </Box>
      )
    }

    // 진로 선생님
    if (id === 'career') {
      const notes = await readText($, `${root}/06_career/seteuk-notes.md`)
      const noteRows = notes ? notes.split('\n').filter(l => /^\|\s*\d{4}-/.test(l)).length : 0
      const waiting: string[] = []
      for (const s of SUBJECTS) {
        const n = seteukCount(await readText($, `${root}/${s.folder}/5_research/seteuk-ideas.md`))
        if (n > 0) waiting.push(`${s.subject} ${n}`)
      }
      const plan = await readText($, `${root}/06_career/course-plan.md`)
      const planRows = plan ? plan.split('\n').filter(l => /^\|/.test(l) && !/^\|\s*(-|순위|학기|대학)/.test(l)).length : 0
      return (
        <Box flexDirection="column" gap={1}>
          {header}
          {guideBox}
          <Box flexDirection="column">
            <Text bold>🧭 진로 현황</Text>
            <Text>{`세특 메모 ${noteRows}줄 · 과목별 세특 거리: ${waiting.length ? waiting.join(', ') : '아직 없음'}`}</Text>
            <Text>{`과목 선택 계획 ${planRows}줄 · 리서치 ${await countFiles($, `${root}/06_career/research`)} · 학과 ${await countFiles($, `${root}/06_career/majors`)}`}</Text>
          </Box>
          {roadmapBox}
          <Button key="refresh" label="새로고침" plain onPress={refresh} />
        </Box>
      )
    }

    // 과목 선생님
    const me = TEACHERS.find(x => x.id === id)
    const folder = me?.folder ?? ''
    const up = await upcoming($, root, me ? [me] : [], t)
    const units = await countDirs($, `${root}/${folder}/2_materials`)
    const mistakes = await countFiles($, `${root}/${folder}/3_mistakes`)
    const csatFiles = await countFiles($, `${root}/${folder}/4_csat`, 2)
    const research = (await listDir($, `${root}/${folder}/5_research`)).filter(
      f => f.kind === 'file' && f.name !== 'seteuk-ideas.md' && !f.name.startsWith('.'),
    ).length
    const seteuk = seteukCount(await readText($, `${root}/${folder}/5_research/seteuk-ideas.md`))

    return (
      <Box flexDirection="column" gap={1}>
        {header}
        {guideBox}
        <Box flexDirection="column">
          <Text bold>📅 다가오는 평가</Text>
          {up.dated.length === 0 && up.undated.length === 0 && <Text dimColor>아직 기록된 평가가 없어요.</Text>}
          {up.dated.slice(0, 4).map(i => (
            <Text>{`${dLabel(daysUntil(i.date, t))}  ${i.date} ${i.kind} · ${i.what}`}</Text>
          ))}
          {up.undated.map(i => (
            <Text dimColor>{`미정  ${i.kind} · ${i.what}`}</Text>
          ))}
        </Box>
        <Box flexDirection="column">
          <Text bold>📂 내 폴더</Text>
          <Text>{`단원 ${units} · 오답 ${mistakes} · 수능 트랙 ${csatFiles} · 리서치 ${research} · 세특 거리 ${seteuk}`}</Text>
        </Box>
        {roadmapBox}
        <Button key="refresh" label="새로고침" plain onPress={refresh} />
      </Box>
    )
  })
}
