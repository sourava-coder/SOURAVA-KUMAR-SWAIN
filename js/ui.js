/* ui.js: hero typing line, loader, clock, menu, theme switch, scroll progress and active link. */
/* hero typing, loader, clock, nav, theme, progress */
(function(){
  var el=$('#typed'),i=0,j=0,del=false;
  if(reduce){el.textContent=P.phrases[0]||P.role;return}
  (function tick(){
    if(!P.phrases.length){el.textContent=P.role;setTimeout(tick,2000);return}
    i=i%P.phrases.length;
    var w=P.phrases[i];j+=del?-1:1;el.textContent=w.slice(0,j);
    var t=del?28:60;
    if(!del&&j===w.length){del=true;t=1600}else if(del&&j===0){del=false;i=(i+1)%P.phrases.length;t=350}
    setTimeout(tick,t);
  })();
})();
(function(){
  var L=$('#loader'),p=0;
  function done(){L.classList.add('off');document.body.style.overflow='';setTimeout(ready,350);setTimeout(function(){L.remove()},900)}
  if(reduce){L.remove();ready();return}
  document.body.style.overflow='hidden';
  var iv=setInterval(function(){p=Math.min(100,p+Math.ceil(Math.random()*9)+3);$('#pct').textContent=p;$('#pbar').style.width=p+'%';if(p>=100){clearInterval(iv);setTimeout(done,250)}},45);
})();
function clock(){try{$('#clock').textContent=new Date().toLocaleTimeString('en-IN',{timeZone:P.tz,hour:'2-digit',minute:'2-digit',hour12:true})}catch(e){$('#clock').textContent=new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}}
clock();setInterval(clock,20000);
$('#menuBtn').onclick=function(){var o=$('#links').classList.toggle('open');this.setAttribute('aria-expanded',o)};
$$('#links a').forEach(function(a){a.addEventListener('click',function(){$('#links').classList.remove('open');$('#menuBtn').setAttribute('aria-expanded','false')})});
(function(){
  var saved=store.get('pf_theme');if(saved)document.documentElement.setAttribute('data-theme',saved);
  else if(window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches)document.documentElement.setAttribute('data-theme','dark');
  $('#themeBtn').onclick=function(){var d=document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark';document.documentElement.setAttribute('data-theme',d);store.set('pf_theme',d);
    var m=document.querySelector('meta[name=theme-color]');if(m)m.content=d==='dark'?'#0A1029':'#F2F5FB'};
})();
(function(){
  var secs=$$('main section'),links=$$('#links a');
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){links.forEach(function(a){a.setAttribute('aria-current',a.getAttribute('href')==='#'+e.target.id?'true':'false')})}})},{rootMargin:'-45% 0px -50% 0px'});
  secs.forEach(function(s){io.observe(s)});
  var bar=$('#progress'),top=$('#top');
  function sc(){var h=document.documentElement,max=h.scrollHeight-h.clientHeight;bar.style.width=(max>0?h.scrollTop/max*100:0)+'%';top.classList.toggle('on',h.scrollTop>700)}
  addEventListener('scroll',sc,{passive:true});sc();
  top.onclick=function(){scrollTo({top:0,behavior:reduce?'auto':'smooth'})};
})();
