(()=>{
const $=id=>document.getElementById(id);
const steps=[...document.querySelectorAll('#stSteps li')],phones=[...document.querySelectorAll('.dm-phone')];
const demo=$('demo'),slot=$('slot13'),cands=$('dmCands'),scan=$('dmScan'),send=$('dmSend'),res=$('dmResult'),who=$('stWho'),text=$('stText'),av=$('stAv');
if(!demo)return;
const MSG='【空き枠のご案内】10/25(金) 13:00 にお席をご用意できます。ご都合が合えば、こちらからご予約ください。';
const FOLLOW='ご案内した10/25(金) 13:00 は、ご予約で埋まりました。また空き時間があれば、ご連絡させていただきますね。';
const N=[
 ['オーナー','10月25日（金）の13:00が、まだ空いている…。この日に予約が入ってほしいな。',1],
 ['オーナー','来てくれそうな方を、選んでみよう。 → 来店の間隔や曜日・時間の傾向から、3名が理由つきで抽出されました。',1],
 ['オーナー','この3人に、同時に送ってみよう。 → ボタンを押すと、3名のLINEに同時に届きました。',1],
 ['山田 花子さま','「ちょうど行きたかった！」→ LINEの「予約する」から13:00を予約。予約表に自動で入りました。',0],
 ['サロンワークス','予約が埋まったので、ほかのお二人には「また空き時間があればご連絡しますね」と自動で届きました。',0],
 ['オーナー','空いていた枠に、予約が入った！ 完成です。',1]
];
function bubble(p,cls,html){const c=phones[p].querySelector('.ph-chat');const d=document.createElement('div');d.className=cls;d.innerHTML=html;c.appendChild(d);}
let cur=-1,timer=null,playing=false;
function render(s){
 cur=s; steps.forEach((li,i)=>{li.classList.toggle('on',i===s);li.classList.toggle('done',i<s);});
 const [w,t,owner]=N[s]; who.textContent=w; text.textContent=t; av.style.visibility=owner?'visible':'hidden';
 demo.className='demo s'+s;
 // reset
 phones.forEach(p=>{p.querySelector('.ph-chat').innerHTML='';p.className='dm-phone';});
 slot.className='free'; slot.innerHTML='13:00<small>空き</small>'; res.classList.remove('on');
 cands.classList.toggle('show',s>=1); scan.classList.remove('run'); send.classList.remove('press','sent'); send.textContent='3名に同時に送る';
 if(s===1){scan.classList.add('run');}
 if(s>=2){send.classList.add('sent');send.textContent='3名に送信しました';phones.forEach((p,i)=>{p.classList.add('got');bubble(i,'bub',MSG+'<span class="bk-btn">予約する</span>');});if(s===2)send.classList.add('press');}
 if(s>=3){phones[0].classList.add('tapped');bubble(0,'me','13:00で予約しました');slot.className='new';slot.innerHTML='13:00<small>山田様</small>';}
 if(s>=4){[1,2].forEach(i=>{phones[i].classList.add('follow');bubble(i,'bub bub--auto','<small>自動でお知らせ</small>'+FOLLOW);});}
 if(s>=5){res.classList.add('on');}
}
function play(){ if(cur>=N.length-1) render(0); playing=true; $('stPlay').textContent='❚❚ 一時停止'; $('stPlay').classList.remove('play');
 clearInterval(timer); timer=setInterval(()=>{ if(cur>=N.length-1){stop();return;} render(cur+1); },5200); }
function stop(){ playing=false; clearInterval(timer); $('stPlay').textContent=cur>=N.length-1?'↺ もう一度':'▶ 再生'; $('stPlay').classList.add('play'); }
$('stPlay').onclick=()=>{ if(playing){stop();return;} if(cur<0||cur>=N.length-1){render(0);} play(); };
$('stNext').onclick=()=>{stop(); render(Math.min(cur+1,N.length-1)); if(cur>=N.length-1)stop();};
$('stPrev').onclick=()=>{stop(); render(Math.max(cur-1,0));};
steps.forEach((li,i)=>li.onclick=()=>{stop();render(i);if(i>=N.length-1)stop();});
render(0);
})();
(()=>{const d=document.getElementById('demo');if(!d||!('IntersectionObserver' in window))return;let done=false;
new IntersectionObserver((es,o)=>{es.forEach(e=>{if(e.isIntersecting&&!done){done=true;o.disconnect();setTimeout(()=>document.getElementById('stPlay').click(),900);}})},{threshold:.35}).observe(d);})();
