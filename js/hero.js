/* hero.js: photo, floating chips, tech strip, and the tilt/glow that follow the pointer. */
/* photo, floating chips, tech strip */
(function(){
  var img=$('#photo'),mono=$('#mono');mono.textContent=ini;
  $('#frame').style.setProperty('--pos',P.photoPos||'50% 20%');
  $('#chip1').textContent=P.role.split(' and ')[0]||'Developer';$('#chip2').textContent=(P.role.split(' and ')[1])||'Open to work';$('#chip3').textContent=P.city;
  if(P.photo){img.alt=P.photoAlt||('Portrait of '+P.name);img.onload=function(){mono.style.display='none'};img.onerror=function(){img.remove()};img.src=P.photo}else{img.remove()}
  /* add ?edit to the address to preview a photo from your device before you add it to the project */
  if(/[?&]edit\b/.test(location.search)){$('#pv').hidden=false;$('#pvIn').addEventListener('change',function(){var f=this.files&&this.files[0];if(!f)return;var u=URL.createObjectURL(f),t=$('#photo')||document.createElement('img');if(!t.parentNode){t.id='photo';$('#frame').appendChild(t)}t.alt='Portrait preview';t.onload=function(){mono.style.display='none'};t.src=u})}
  var words=[];Object.keys(P.skills).forEach(function(g){P.skills[g].forEach(function(s){if(words.indexOf(s[0])<0)words.push(s[0])})});
  var set='<span>'+words.map(esc).join('</span><span>')+'</span>';$('#track').innerHTML=set+set;
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
