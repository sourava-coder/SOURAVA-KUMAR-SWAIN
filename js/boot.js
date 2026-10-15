/* boot.js: runs before the page paints so animated parts start hidden, and shows everything after 5 s if scripts fail. */
document.documentElement.classList.add("js");setTimeout(function(){document.documentElement.classList.add("ready")},5000)
