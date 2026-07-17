// Salonworks TVCM v2 ナレーション生成
// Voice: ja-JP-Chirp3-HD-Kore (Chirp3-HD は SSML prosody 非対応 → speaking_rate で調整)
// mark timepoints は SSML_MARK ではなく word-level で近似
import { writeFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';

const OUT = '/Users/tsukasayoshida/Desktop/skeleton-demos/salonworks-tvcm';
const VOICE = 'ja-JP-Chirp3-HD-Kore';
const PROJECT = 'skeleton-skel-ec-2606';
// Chirp3-HD は speakingRate のみ対応 (SSML 使えない)
const SPEAKING_RATE = 1.05; // 少しゆっくり目でBtoC CM的自然感

// 5幕 全フレーズ (テロップと同期させる単位で分割)
const SEGMENTS = [
  // ── OPEN (0.0s 〜) ────────────────────────────
  { id: 'open_main', text: 'サロン経営。こんな悩み、ない？' },
  // ── ACT1 逃さない (〜) ────────────────────────
  { id: 'act1_pain', text: '来てくれたお客さまが、次、来なくなる。' },
  { id: 'act1_tagline', text: '一度掴んだお客様は、二度と逃さない。' },
  { id: 'act1_sub', text: 'AIが来店間隔・購買履歴など4条件で、自動配信。' },
  // ── ACT2 掴む ─────────────────────────────────
  { id: 'act2_pain', text: 'お客さまのこと、全部覚えてますか？' },
  { id: 'act2_tagline', text: 'お客様の全部を、一人残らず掴む。' },
  { id: 'act2_sub', text: 'LINEで統合カルテ。来店・購買・会話が1画面に。' },
  // ── ACT3 離さない ─────────────────────────────
  { id: 'act3_pain', text: 'お客様が離れてから気づいても遅い。' },
  { id: 'act3_tagline', text: 'お客様が離れる前に、次を差す。' },
  { id: 'act3_sub', text: 'LTV 130から150パーセント。それが Salonworks。' },
  // ── CLOSE ──────────────────────────────────────
  { id: 'close_tagline', text: '逃さず。掴み。離さない。' },
  { id: 'close_logo', text: 'Salonworks。LINE 1本で、集客・予約・EC・カルテ・再来店。' },
];

const TOKEN = execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();

async function synthesize(seg) {
  const body = JSON.stringify({
    input: { text: seg.text },
    voice: { languageCode: 'ja-JP', name: VOICE },
    audioConfig: {
      audioEncoding: 'MP3',
      sampleRateHertz: 44100,
      speakingRate: SPEAKING_RATE,
    },
  });

  const resp = await fetch('https://texttospeech.googleapis.com/v1beta1/text:synthesize', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json; charset=utf-8',
      'x-goog-user-project': PROJECT,
    },
    body,
  });
  const json = await resp.json();
  if (!json.audioContent) {
    throw new Error(`TTS FAIL ${seg.id}: ${JSON.stringify(json).slice(0, 300)}`);
  }
  const mp3 = `${OUT}/v2-audio/${seg.id}.mp3`;
  writeFileSync(mp3, Buffer.from(json.audioContent, 'base64'));
  return mp3;
}

mkdirSync(`${OUT}/v2-audio`, { recursive: true });

console.log(`=== TVCM v2 TTS (${VOICE}) ===`);
const results = {};

for (const seg of SEGMENTS) {
  process.stdout.write(`  ${seg.id}... `);
  const mp3 = await synthesize(seg);
  const dur = parseFloat(execSync(`ffprobe -i "${mp3}" -show_entries format=duration -v quiet -of csv="p=0"`, { encoding: 'utf8' }).trim());
  results[seg.id] = { mp3, duration: dur };
  console.log(`${dur.toFixed(2)}s`);
}

// 全セグメントを沈黙つなぎで concat
// セグメント間に 適切な間隔を挟む
const GAP_SHORT = 0.25; // 同一幕内
const GAP_LONG  = 0.55; // 幕間切替

const ORDER_WITH_GAPS = [
  { seg: 'open_main',    gap_after: GAP_LONG },
  { seg: 'act1_pain',    gap_after: GAP_SHORT },
  { seg: 'act1_tagline', gap_after: GAP_SHORT },
  { seg: 'act1_sub',     gap_after: GAP_LONG },
  { seg: 'act2_pain',    gap_after: GAP_SHORT },
  { seg: 'act2_tagline', gap_after: GAP_SHORT },
  { seg: 'act2_sub',     gap_after: GAP_LONG },
  { seg: 'act3_pain',    gap_after: GAP_SHORT },
  { seg: 'act3_tagline', gap_after: GAP_SHORT },
  { seg: 'act3_sub',     gap_after: GAP_LONG },
  { seg: 'close_tagline',gap_after: GAP_SHORT },
  { seg: 'close_logo',   gap_after: 0 },
];

// 沈黙生成 & タイムポイント計算
const SILENCE_MP3 = `${OUT}/v2-audio/silence.mp3`;
execSync(`ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=stereo -t 1.0 -acodec libmp3lame -ar 44100 "${SILENCE_MP3}" 2>/dev/null`);

const timepoints = {};
let cursor = 0;

const concatFiles = [];
for (const item of ORDER_WITH_GAPS) {
  const r = results[item.seg];
  timepoints[item.seg] = cursor;
  concatFiles.push(`file '${r.mp3}'`);
  cursor += r.duration;

  if (item.gap_after > 0) {
    // 沈黙を必要時間分生成
    const silPath = `${OUT}/v2-audio/sil-${item.seg}.mp3`;
    execSync(`ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=stereo -t ${item.gap_after} -acodec libmp3lame -ar 44100 "${silPath}" 2>/dev/null`);
    concatFiles.push(`file '${silPath}'`);
    cursor += item.gap_after;
  }
}

const concatList = `${OUT}/v2-audio/concat.txt`;
writeFileSync(concatList, concatFiles.join('\n'));

const fullMp3 = `${OUT}/tvcm-v2-narration.mp3`;
execSync(`ffmpeg -y -f concat -safe 0 -i "${concatList}" -c copy "${fullMp3}" 2>/dev/null`);

const totalDur = parseFloat(execSync(`ffprobe -i "${fullMp3}" -show_entries format=duration -v quiet -of csv="p=0"`, { encoding: 'utf8' }).trim());
console.log(`\nFull narration: ${totalDur.toFixed(2)}s`);

// タイムポイント保存
const tpPath = `${OUT}/v2-timepoints.json`;
writeFileSync(tpPath, JSON.stringify({ voice: VOICE, totalDuration: totalDur, marks: timepoints }, null, 2));
console.log('Timepoints:');
for (const [k, v] of Object.entries(timepoints)) {
  const dur = results[k]?.duration || 0;
  console.log(`  ${k}: ${v.toFixed(3)}s (dur=${dur.toFixed(2)}s)`);
}
console.log(`\nSaved: ${fullMp3}`);
console.log(`Saved: ${tpPath}`);
