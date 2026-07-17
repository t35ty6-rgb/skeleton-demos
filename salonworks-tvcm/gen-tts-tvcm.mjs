// Salonworks TVCM 30s 音声生成
// Neural2-B (女性・明るい・CM的) + SSML mark timepoints
import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const OUT = '/Users/tsukasayoshida/Desktop/skeleton-demos/salonworks-tvcm';
const VOICE = 'ja-JP-Neural2-B';
const RATE = 1.15;  // CM的に少し速め
const PITCH = '+2st'; // +2半音 明るく
const PROJECT = 'skeleton-skel-ec-2606';

// TVCM 5幕 構成
// 00:00-00:03 オープン
// 00:03-00:10 幕1「逃さない」
// 00:10-00:17 幕2「掴む」
// 00:17-00:24 幕3「離さない」
// 00:24-00:32 締め
const SCENES = [
  // ── オープン ────────────────────────────────
  { mark: 'open_start' },
  { text: 'サロン経営、 こんな 悩み、 ない?', rate: 1.10 },
  { mark: 'open_end' },

  // ── 幕1「逃さない」 ────────────────────────
  { mark: 'act1_start' },
  { text: '来てくれた お客さまが、 次、 来なくなる。' },
  { mark: 'act1_pain' },
  { text: '一度 掴んだ お客様は、 二度と 逃さない。' },
  { mark: 'act1_tagline' },
  { text: 'AIが 来店間隔・ 購買履歴 など 4条件で、 自動 配信。', rate: 1.20 },
  { mark: 'act1_end' },

  // ── 幕2「掴む」 ────────────────────────────
  { mark: 'act2_start' },
  { text: 'お客さまの こと、 全部 覚えてますか?' },
  { mark: 'act2_pain' },
  { text: 'お客様の 全部を、 一人 残らず 掴む。' },
  { mark: 'act2_tagline' },
  { text: 'LINEで 統合 カルテ。 来店・購買・会話 が 1画面に。', rate: 1.20 },
  { mark: 'act2_end' },

  // ── 幕3「離さない」 ────────────────────────
  { mark: 'act3_start' },
  { text: 'お客様が 離れてから 気づいても 遅い。' },
  { mark: 'act3_pain' },
  { text: 'お客様が 離れる 前に、 次を 差す。' },
  { mark: 'act3_tagline' },
  { text: 'エルティーヴィ 1.3倍から 1.5倍。 それが Salonworks。', rate: 1.20 },
  { mark: 'act3_end' },

  // ── 締め ───────────────────────────────────
  { mark: 'close_start' },
  { text: '逃さず。 掴み。 離さない。', rate: 0.92 },
  { mark: 'close_tagline' },
  { text: 'Salonworks。 LINE 1本で、 集客・予約・EC・カルテ・再来店。', rate: 1.10 },
  { mark: 'close_end' },
];

// SSMLに変換
function buildSsml(scenes) {
  const parts = scenes.map(p => {
    if (p.mark) return `<mark name="${p.mark}"/>`;
    const r = p.rate || RATE;
    return `<prosody rate="${r}" pitch="${PITCH}">${p.text}</prosody>`;
  });
  return `<speak>${parts.join('\n')}</speak>`;
}

const ssml = buildSsml(SCENES);
const ssmlPath = `${OUT}/tvcm-narration.ssml`;
writeFileSync(ssmlPath, ssml, 'utf8');
console.log('SSML written:', ssmlPath);

// gcloud TTS 呼出
const token = execSync('gcloud auth print-access-token').toString().trim();
const body = JSON.stringify({
  input: { ssml },
  voice: { languageCode: 'ja-JP', name: VOICE },
  audioConfig: {
    audioEncoding: 'MP3',
    sampleRateHertz: 44100,
    speakingRate: 1.0,
  },
  enableTimePointing: ['SSML_MARK'],
});

const bodyPath = `${OUT}/tts-request.json`;
writeFileSync(bodyPath, body);

console.log('Calling TTS API...');
const resp = execSync(
  `curl -s -X POST \
    -H "Authorization: Bearer ${token}" \
    -H "Content-Type: application/json" \
    -H "x-goog-user-project: ${PROJECT}" \
    -d @"${bodyPath}" \
    "https://texttospeech.googleapis.com/v1beta1/text:synthesize"`,
  { maxBuffer: 50 * 1024 * 1024 }
);

const result = JSON.parse(resp.toString());

if (result.error) {
  console.error('TTS Error:', JSON.stringify(result.error));
  process.exit(1);
}

// MP3保存
const mp3Path = `${OUT}/tvcm-narration.mp3`;
const buf = Buffer.from(result.audioContent, 'base64');
writeFileSync(mp3Path, buf);
console.log(`MP3 saved: ${mp3Path} (${(buf.length/1024).toFixed(1)}KB)`);

// timepoints保存
const timepointsPath = `${OUT}/timepoints.json`;
const timepoints = result.timepoints || [];
writeFileSync(timepointsPath, JSON.stringify(timepoints, null, 2));
console.log(`Timepoints: ${timepointsPath}`);
timepoints.forEach(tp => {
  console.log(`  ${tp.markName}: ${tp.timeSeconds.toFixed(3)}s`);
});

// 総尺確認
const { execSync: ex2 } = await import('node:child_process');
try {
  const dur = execSync(
    `ffprobe -v quiet -print_format json -show_streams "${mp3Path}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['streams'][0]['duration'])"`,
    { encoding: 'utf8' }
  ).trim();
  console.log(`\nTotal duration: ${parseFloat(dur).toFixed(2)}s`);
} catch(e) {
  console.log('(ffprobe duration check skipped)');
}
