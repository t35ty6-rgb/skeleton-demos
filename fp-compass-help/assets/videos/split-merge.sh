#!/bin/zsh
# _all.webm + _timeline.json → 各機能 mp4 (動画範囲切出し + 対応 mp3 マージ + 末尾静止延長で 音声尺に揃える)
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

WEBM="_all.webm"
TL="_timeline.json"
AUDIO_DIR="../audio"

[ ! -f "$WEBM" ] && { echo "✗ no $WEBM"; exit 1; }
[ ! -f "$TL" ] && { echo "✗ no $TL"; exit 1; }

mp3_dur() { ffprobe -i "$1" -show_entries format=duration -v quiet -of csv="p=0" 2>/dev/null; }

# python で timeline 読み込み → 各 entry 処理
python3 << 'PYEOF' > /tmp/_split_plan.sh
import json, os, subprocess
with open('_timeline.json') as f: timeline = json.load(f)
audio_dir = '../audio'
lines = []
for entry in timeline:
    n = entry['name']
    vid_start = entry['start']
    vid_dur = entry['end'] - entry['start']
    # ★ 07-recording は 開始 3秒 (濃色ダッシュボード hero が残る frame) を cut
    if n == '07-recording':
        vid_start += 3
        vid_dur -= 3
    mp3 = f'{audio_dir}/{n}.mp3'
    if not os.path.exists(mp3):
        print(f"# SKIP {n}: no mp3", flush=True)
        continue
    nar_dur = float(subprocess.check_output(['ffprobe','-i',mp3,'-show_entries','format=duration','-v','quiet','-of','csv=p=0']).strip())
    # 動画 vs ナレ の差
    diff = nar_dur - vid_dur
    if diff > 0.3:
        # 動画 を tpad で 末尾フリーズ延長
        vf = f"tpad=stop_mode=clone:stop_duration={diff:.2f},format=yuv420p"
    else:
        vf = "format=yuv420p"
    lines.append(f'echo "→ {n} (vid {vid_dur:.1f}s, nar {nar_dur:.1f}s, pad {max(diff,0):.1f}s)"')
    lines.append(f'ffmpeg -y -ss {vid_start:.3f} -t {vid_dur:.3f} -i "_all.webm" -i "{mp3}" -c:v libx264 -preset fast -crf 22 -c:a aac -b:a 128k -map 0:v:0 -map 1:a:0 -vf "{vf}" -movflags +faststart "{n}.mp4" 2>/dev/null')
print('\n'.join(lines))
PYEOF

bash /tmp/_split_plan.sh
echo ""
ls -la *.mp4 2>/dev/null | awk '{print $9, $5}'
