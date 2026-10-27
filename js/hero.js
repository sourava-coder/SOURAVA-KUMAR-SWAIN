/* hero.js: photo, floating chips, tech strip, and the tilt/glow that follow the pointer. */
/* photo, floating chips, tech strip */
function renderHero(){
  var img=$('#photo'),mono=$('#mono');
  ini=(P.displayName||P.name).split(/\s+/).map(function(w){return w[0]}).join('').slice(0,2).toUpperCase();mono.textContent=ini;
  $('#frame').style.setProperty('--pos',P.photoPos||'50% 20%');
  $('#chip1').textContent=P.role.split(' and ')[0]||'Developer';$('#chip2').textContent=(P.role.split(' and ')[1])||'Open to work';$('#chip3').textContent=P.city;
  if(P.photo){if(!img||!img.parentNode){img=document.createElement('img');img.id='photo';$('#frame').appendChild(img)}mono.style.display='';img.alt=P.photoAlt||('Portrait of '+P.name);img.onload=function(){mono.style.display='none'};img.onerror=function(){img.remove()};img.src=safeUrl(P.photo)}else if(img){img.remove();mono.style.display=''}
  /* add ?edit to the address to preview a photo from your device before you add it to the project */
  if(/[?&]edit\b/.test(location.search)){$('#pv').hidden=false;$('#pvIn').addEventListener('change',function(){var f=this.files&&this.files[0];if(!f)return;var u=URL.createObjectURL(f),t=$('#photo')||document.createElement('img');if(!t.parentNode){t.id='photo';$('#frame').appendChild(t)}t.alt='Portrait preview';t.onload=function(){mono.style.display='none'};t.src=u})}
  var words=[];Object.keys(P.skills).forEach(function(g){P.skills[g].forEach(function(s){if(words.indexOf(s[0])<0)words.push(s[0])})});
  var set='<span>'+words.map(esc).join('</span><span>')+'</span>';$('#track').innerHTML=set+set;
}
window.renderHero=renderHero;
renderHero();
/* decorative pointer follower for mouse users; the native cursor remains available */
(function(){
  if(reduce||!window.matchMedia||!matchMedia('(hover:hover) and (pointer:fine)').matches)return;
  var follower=$('#mouseFollower');
  document.addEventListener('pointermove',function(e){
    if(e.pointerType==='touch')return;
    follower.style.setProperty('--mouse-x',e.clientX+'px');
    follower.style.setProperty('--mouse-y',e.clientY+'px');
    follower.classList.add('visible');
    follower.classList.toggle('hovering',!!(e.target.closest&&e.target.closest('a,button,input,textarea,[role="button"]')));
  },{passive:true});
  document.addEventListener('pointerdown',function(){follower.classList.add('pressed')},{passive:true});
  document.addEventListener('pointerup',function(){follower.classList.remove('pressed')},{passive:true});
  window.addEventListener('pointerleave',function(){follower.classList.remove('visible','hovering','pressed')});
  window.addEventListener('blur',function(){follower.classList.remove('visible','hovering','pressed')});
})();
/* hero pointer effects: tilt the photo and move the glow */
(function(){
  if(reduce||!window.matchMedia||!matchMedia('(hover:hover) and (pointer:fine)').matches)return;
  var hero=$('#home'),t=$('#tilt'),raf=0;
  hero.addEventListener('pointermove',function(e){
    var hr=hero.getBoundingClientRect(),r=t.getBoundingClientRect(),dx=(e.clientX-(r.left+r.width/2))/innerWidth,dy=(e.clientY-(r.top+r.height/2))/innerHeight;
    cancelAnimationFrame(raf);raf=requestAnimationFrame(function(){
      hero.style.setProperty('--mx',(e.clientX-hr.left)+'px');hero.style.setProperty('--my',(e.clientY-hr.top)+'px');
      t.style.transform='perspective(900px) rotateY('+(dx*16).toFixed(2)+'deg) rotateX('+(-dy*16).toFixed(2)+'deg)'});
  });
  hero.addEventListener('pointerleave',function(){cancelAnimationFrame(raf);t.style.transform=''});
})();
