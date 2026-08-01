#!/usr/bin/env node
//////////////////////////////////////// 새 챌린지 앱 생성 ////////////////////////////////////////
// 사용법:
//   node scripts/new-app.js tip-calc "팁 계산기" "금액 나누고 팁까지 한 번에"
//   node scripts/new-app.js day07-timer "포모도로 타이머" --icon timer-outline
//
// 하는 일:
//   1) src/app/(apps)/<슬러그>.tsx        라우트 파일 생성
//   2) src/views/<슬러그>/<Pascal>View.tsx 화면 스켈레톤 생성
//   3) src/shared/constants/apps.ts       레지스트리에 항목 추가

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REGISTRY_PATH = path.join(ROOT, 'src', 'shared', 'constants', 'apps.ts');
const ROUTE_DIR = path.join(ROOT, 'src', 'app', '(apps)');
const VIEWS_DIR = path.join(ROOT, 'src', 'views');

////////// colors.ts 의 accents 와 동일하게 유지할 것
const ACCENTS = [
  '#3B5BFF',
  '#E5484D',
  '#30A46C',
  '#F5A524',
  '#8E4EC6',
  '#0BA5EC',
  '#EC4899',
  '#14B8A6',
];

const DEFAULT_ICON = 'application-outline';

//////////////////////////////////////// 인자 파싱 ////////////////////////////////////////
function parseArguments(argv) {
  const positional = [];
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token.startsWith('--')) {
      options[token.slice(2)] = argv[index + 1];
      index += 1;
    } else {
      positional.push(token);
    }
  }

  return { positional, options };
}

//////////////////////////////////////// 문자열 유틸 ////////////////////////////////////////
////////// 'day01-tip-calc' → 'Day01TipCalc'
function toPascalCase(slug) {
  const words = slug.split('-').filter(Boolean);
  const pascal = words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join('');
  return pascal;
}

////////// 오늘 날짜 'YYYY-MM-DD' (로컬 기준)
function today() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const date = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
}

//////////////////////////////////////// 레지스트리 읽기 ////////////////////////////////////////
////////// 등록된 Day 번호 중 가장 큰 값
function readMaxDay(source) {
  const matches = [...source.matchAll(/^\s*day:\s*(\d+),/gm)];
  if (matches.length === 0) return 0;
  const days = matches.map((match) => Number(match[1]));
  return Math.max(...days);
}

//////////////////////////////////////// 파일 템플릿 ////////////////////////////////////////
function routeTemplate(slug, pascal, title) {
  return `//////////////////////////////////////// ${slug} 라우트 ////////////////////////////////////////
// 라우트는 화면 조립만 담당하고 실제 화면은 views 로 위임합니다.

import { Stack } from 'expo-router';

import { ${pascal}View } from '@/views/${slug}/${pascal}View';

export default function ${pascal}Route() {
  return (
    <>
      <Stack.Screen options={{ title: '${title}' }} />
      <${pascal}View />
    </>
  );
}
`;
}

function viewTemplate(pascal, title) {
  return `//////////////////////////////////////// ${title} ////////////////////////////////////////
// 화면 로직은 여기부터 작성합니다.
// 데이터 패칭이 필요하면 _hooks/, 전용 컴포넌트는 _components/ 에 두세요.

import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { fontSize, fontWeight, spacing } from '@/shared/theme';

export function ${pascal}View() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>${title}</Text>
      <Text style={styles.hint}>여기부터 만들기 시작</Text>
    </View>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  hint: {
    fontSize: fontSize.sm,
    opacity: 0.6,
  },
});
`;
}

function registryEntry({ slug, day, title, description, icon, accentColor, createdAt }) {
  return `  {
    id: '${slug}',
    day: ${day},
    title: '${title}',
    description: '${description}',
    icon: '${icon}',
    accentColor: '${accentColor}',
    createdAt: '${createdAt}',
    route: '/(apps)/${slug}',
  },
`;
}

//////////////////////////////////////// 메인 ////////////////////////////////////////
function main() {
  const { positional, options } = parseArguments(process.argv.slice(2));
  const [rawSlug, title, description] = positional;

  ////////// 1) 입력 검증
  if (!rawSlug || !title) {
    console.error('사용법: node scripts/new-app.js <슬러그> "<제목>" ["<설명>"] [--icon 아이콘] [--day 번호]');
    process.exit(1);
  }

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(rawSlug)) {
    console.error(`슬러그는 소문자 케밥 케이스여야 합니다: ${rawSlug}`);
    process.exit(1);
  }

  ////////// 2) Day 번호 결정 — 옵션 > 슬러그 접두사 > 마지막 Day + 1
  const registrySource = fs.readFileSync(REGISTRY_PATH, 'utf8');
  const slugDayMatch = rawSlug.match(/^day(\d+)-/);

  let day;
  if (options.day) {
    day = Number(options.day);
  } else if (slugDayMatch) {
    day = Number(slugDayMatch[1]);
  } else {
    day = readMaxDay(registrySource) + 1;
  }

  ////////// 3) 슬러그에 dayNN- 접두사 보정
  const slug = slugDayMatch ? rawSlug : `day${String(day).padStart(2, '0')}-${rawSlug}`;
  const pascal = toPascalCase(slug);

  const routePath = path.join(ROUTE_DIR, `${slug}.tsx`);
  const viewDir = path.join(VIEWS_DIR, slug);
  const viewPath = path.join(viewDir, `${pascal}View.tsx`);

  ////////// 4) 중복 방지
  if (fs.existsSync(routePath) || fs.existsSync(viewDir)) {
    console.error(`이미 존재하는 앱입니다: ${slug}`);
    process.exit(1);
  }

  const accentColor = ACCENTS[((day - 1) % ACCENTS.length + ACCENTS.length) % ACCENTS.length];
  const icon = options.icon || DEFAULT_ICON;
  const finalDescription = description || title;
  const createdAt = today();

  ////////// 5) 파일 생성
  fs.writeFileSync(routePath, routeTemplate(slug, pascal, title), 'utf8');
  fs.mkdirSync(viewDir, { recursive: true });
  fs.writeFileSync(viewPath, viewTemplate(pascal, title), 'utf8');

  ////////// 6) 레지스트리에 항목 추가 (APPS_END 마커 직전의 배열 닫기 앞에 삽입)
  const marker = '];\n//////////////////// APPS_END';
  if (!registrySource.includes(marker)) {
    console.error('apps.ts 에서 APPS_END 마커를 찾지 못했습니다. 레지스트리 형식을 확인하세요.');
    process.exit(1);
  }

  const entry = registryEntry({ slug, day, title, description: finalDescription, icon, accentColor, createdAt });
  const nextSource = registrySource.replace(marker, `${entry}${marker}`);
  fs.writeFileSync(REGISTRY_PATH, nextSource, 'utf8');

  ////////// 7) 안내
  console.log(`✅ Day ${day} · ${title} 생성 완료`);
  console.log(`   라우트  src/app/(apps)/${slug}.tsx`);
  console.log(`   화면    src/views/${slug}/${pascal}View.tsx`);
  console.log(`   아이콘  ${icon} (바꾸려면 apps.ts 수정 — https://pictogrammers.com/library/mdi/)`);
}

main();
