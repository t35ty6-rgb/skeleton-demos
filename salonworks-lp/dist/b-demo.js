(function(){
  var btn=document.getElementById('hdmenu'), nav=document.getElementById('hdnav');
  if(!btn||!nav) return;
  function isDesktop(){ return window.matchMedia('(min-width:861px)').matches; }
  btn.addEventListener('click',function(){
    var open=btn.getAttribute('aria-expanded')==='true';
    btn.setAttribute('aria-expanded',open?'false':'true');
    btn.setAttribute('aria-label',open?'メニューを開く':'メニューを閉じる');
    if(open){nav.setAttribute('hidden','');}else{nav.removeAttribute('hidden');}
  });
  nav.addEventListener('click',function(e){
    if(e.target.tagName==='A'&&!isDesktop()){
      btn.setAttribute('aria-expanded','false');
      btn.setAttribute('aria-label','メニューを開く');
      nav.setAttribute('hidden','');
    }
  });
})();
