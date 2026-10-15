# Portfolio website

Plain HTML, CSS and JavaScript. No build step, no installs. Double-click `index.html` to open it.

## Folder map
```
index.html              the page skeleton (sections and their ids)
css/
  tokens.css            colours, fonts, dark theme   <- change the look here
  base.css              reset, page background, typography
  layout.css            loader, navigation, buttons, section layout
  hero.css              hero: name, typing line, photo frame, chips
  sections.css          About, Skills, Projects, Journey, Education, Resume, Contact, footer
  animations.css        entrance, tech strip, scroll reveals, hover effects, reduced motion
  print.css             prints only the resume
js/
  data.js               ALL your content          <- edit this file to make it yours
  utils.js              small helpers
  content.js            fills the page from data.js, filters, resume, contact form
  ui.js                 typing line, loader, clock, menu, theme, scroll progress
  hero.js               photo, chips, tech strip, pointer tilt and glow
  reveal.js             scroll-in animations
  boot.js               runs first so animated parts start hidden
assets/
  photo.jpg             your portrait (you add this)
  favicon.svg           browser tab icon
tools/
  build-single-file.py  joins everything into dist/portfolio.html (one file)
```
Keep the `<script>` order in `index.html` as it is: each file uses what the one before it defines.

## Make it yours
1. Open `js/data.js` and change the `P` object: name, role, city, email, WhatsApp number, links, about text, skills, projects, journey, education, certifications.
2. Change the `<title>` and description in `index.html`.
3. Add your photo: save it as `assets/photo.jpg` and set `photo:'assets/photo.jpg'` in `js/data.js`. Use `photoPos` to move the crop. To preview a photo first, open the page with `?edit` on the end of the address.

## Put it online (free)
Drag this whole folder onto vercel.com/new or app.netlify.com/drop, or push it to GitHub and enable Pages. Need one file instead? Run `python tools/build-single-file.py` and use `dist/portfolio.html`. Local hero and favicon images are embedded in the generated file.

## Notes
- The contact form has no server. It opens the visitor's email app with the message filled in. For real submissions use Formspree or Web3Forms.
- "Print or save as PDF" prints only the resume page.
- The loading screen and animations run on each page load, regardless of the device's "reduce motion" setting.
