// Voice A/B 比較 4種 生成
// 同一 SSML を 4 voice に通して MP3 を並べる
import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const OUT = '/Users/tsukasayoshida/Desktop/skeleton-demos/salonworks-tvcm/voice-ab';
const PROJECT = 'skeleton-skel-ec-2606';

// テスト文: TVCM オープン + ACT1 フルフレーズ
const SSML = `<speak>
<prosody rate="1.10" pitch="+2st">サロン経営、 こんな 悩み、 ない?</prosody>
<break time="400ms"/>
<prosody rate="1.10" pitch="+2st">来てくれた お客さまが、 次、 来なくなる。</prosody>
<break time="300ms"/>
<prosody rate="1.10" pitch="+2st">一度 掴んだ お客様は、 二度と 逃さない。</prosody>
<break time="300ms"/>
<prosody rate="1.15" pitch="+2st">AIが 来店間隔・ 購買履歴 など 4条件で、 自動 配信。</prosody>
</speak>`;

const VOICES = [
  { id: 'A', name: 'ja-JP-Neural2-B', label: 'Neural2-B (v1 現状)' },
  { id: 'B', name: 'ja-JP-Wavenet-B', label: 'Wavenet-B (男性低音)' },
  { id: 'C', name: 'ja-JP-Wavenet-C', label: 'Wavenet-C (女性)' },
  { id: 'D', name: 'ja-JP-Neural2-C', label: 'Neural2-C (別女性)' },
];

// Studio / Chirp3 を試す (エラーなら skip)
const PREMIUM_VOICES = [
  { id: 'E', name: 'ja-JP-Studio-B', label: 'Studio-B (Studio課金枠)' },
  { id: 'F', name: 'ja-JP-Studio-C', label: 'Studio-C (Studio課金枠 女性)' },
];

const token = execSync('gcloud auth print-access-token').toString().trim();

async function generateVoice(voice) {
  const body = JSON.stringify({
    input: { ssml: SSML },
    voice: { languageCode: 'ja-JP', name: voice.name },
    audioConfig: {
      audioEncoding: 'MP3',
      sampleRateHertz: 44100,
    },
  });

  const url = `https://texttospeech.googleapis.com/v1beta1/text:synthesize?key=`;

  // REST API 経由
  try {
    const resp = await fetch('https://texttospeech.googleapis.com/v1beta1/text:synthesize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json; charset=utf-8',
        'x-goog-user-project': PROJECT,
      },
      body,
    });
    const res = await resp.json();
    if (!res.audioContent) {
      console.error(`[${voice.id}] ${voice.name}: ERROR - ${JSON.stringify(res).substring(0, 200)}`);
      return null;
    }
    const mp3Path = `${OUT}/voice-${voice.id}-${voice.name.replace(/[^a-zA-Z0-9]/g, '_')}.mp3`;
    writeFileSync(mp3Path, Buffer.from(res.audioContent, 'base64'));
    console.log(`[${voice.id}] ${voice.name}: OK -> ${mp3Path}`);
    return { ...voice, mp3Path };
  } catch (e) {
    console.error(`[${voice.id}] ${voice.name}: EXCEPTION - ${e.message.substring(0, 200)}`);
    return null;
  }
}

console.log('=== Voice A/B Generation ===');
const results = [];

for (const v of [...VOICES, ...PREMIUM_VOICES]) {
  console.log(`Testing ${v.name}...`);
  const r = await generateVoice(v);
  if (r) results.push(r);
}

// 結果 JSON 保存
writeFileSync(`${OUT}/voice-ab-results.json`, JSON.stringify(results, null, 2));
console.log(`\nGenerated ${results.length} voices:`);
results.forEach(r => console.log(`  [${r.id}] ${r.name}: ${r.mp3Path}`));
