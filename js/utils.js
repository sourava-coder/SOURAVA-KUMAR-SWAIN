/* utils.js: small helpers shared by the other scripts. */

var $=function(s,r){return (r||document).querySelector(s)},$$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
var esc=function(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
var safeUrl=function(s){var v=String(s||'').trim();if(/^(https?:\/\/|mailto:|tel:)/i.test(v)||v==='#'||/^data:image\/(?:png|jpeg|webp|gif);base64,[a-z0-9+/=]+$/i.test(v))return v;if(v.charAt(0)==='/'&&v.charAt(1)!=='/'&&v.split('/').indexOf('..')<0)return v;if(v.indexOf('assets/')===0&&v.split('/').indexOf('..')<0)return new URL(v,location.protocol==='file:'?document.baseURI:location.origin+'/').href;return '#'};
var reduce=false;
var store={get:function(k){try{return localStorage.getItem(k)}catch(e){return null}},set:function(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
function ready(){document.documentElement.classList.add('ready')}
var ini=P.name.split(/\s+/).map(function(w){return w[0]}).join('').slice(0,2).toUpperCase();
