// Initialiser pagesById med det samme
let pagesById = {}
pages.forEach(p => pagesById[p.id] = p)
let current = null

let activeHotspot = null
let hotspotStart = 0
let activeOverlayImg = null
let overlayAlpha = 0

let filmSession = null

let captionBar, captionText, timerFill, pageHeading, pageButton
let canvas

let activeAudio = null
let activeOverlayVideo = null; // p5.MediaElement
let overlayVideoAlpha = 0;

let userInteracted = false

function setupDomBindings(){
  captionBar = select('#captionBar')
  captionText = select('#captionText')
  timerFill = select('#timerFill')
  pageHeading = select('#pageHeading')
  pageButton = select('#pageButton')
  console.log('DOM bindings sat:', {captionBar, captionText, timerFill, pageHeading, pageButton})
}

function preload(){
  // index pages
  pages.forEach(p => pagesById[p.id] = p)
}

function setup(){
  const wrap = select('#canvasWrap')
  const rect = wrap.elt.getBoundingClientRect()
  canvas = createCanvas(rect.width, rect.height)
  canvas.parent('canvasWrap')

  setupDomBindings()
  enterPage('#page1')
}

function windowResized(){
  const wrap = select('#canvasWrap')
  const rect = wrap.elt.getBoundingClientRect()
  resizeCanvas(rect.width, rect.height)
}

function draw(){
  background(8,10,16)
  if (current) {
    //console.log('draw: current side:', current.id)
  }

  // render background image if any
  if (current && current._bg) {
    image(current._bg, 0, 0, width, height)
    //console.log('Tegner baggrundsbillede')
  } else {
    console.log('Intet baggrundsbillede loaded endnu')
  }

  // DEBUG: tegn rammer omkring hotspots
  if (settings.debugHotspots && current && current.hotspots) {
    drawHotspotDebug(current.hotspots)
  }

  // film mode
  if (filmSession){
    renderFilm()
    return
  }

  // overlay for active hotspot image
  if (activeHotspot && activeOverlayImg){
    push();
    noStroke();
    const a = constrain(overlayAlpha, 0, 255);
    tint(255, a);
    // mask to region
    let x = activeHotspot.x, y = activeHotspot.y
    if (x <= 1 && y <= 1) {
      x = percentToPixel(x, 'x')
      y = percentToPixel(y, 'y')
    }
    if (activeHotspot.r){
      const w = activeOverlayImg.width
      const h = activeOverlayImg.height
      image(activeOverlayImg, x - w/2, y - h/2)
    } else {
      let w = activeHotspot.w, hH = activeHotspot.h
      if (w && w <= 1) w = w * width
      if (hH && hH <= 1) hH = hH * height
      image(activeOverlayImg, x, y, w, hH)
    }
    pop();
    overlayAlpha = lerp(overlayAlpha, 255, 0.08);
  }

  // overlay for active hotspot video
  if (activeHotspot && activeOverlayVideo){
    const params = activeOverlayVideo._drawParams || { x: 0, y: 0, w: 320, h: 180 };
    image(activeOverlayVideo, params.x, params.y, params.w, params.h);
  }

  // update timer UI for active hotspot
  if (activeHotspot){
    const elapsed = millis() - hotspotStart
    const dur = activeHotspot.duration || 0
    if (dur > 0){
      const pct = constrain(elapsed / dur, 0, 1)
      timerFill.elt.style.width = (pct * 100).toFixed(2) + '%'
      if (pct >= 1){
        // timeout path
        const to = activeHotspot.timeoutAction
        deactivateHotspot()
        hideCaption()
        if (to) goto(to)
      }
    }
  }

}

function enterPage(id){
  current = pagesById[id]
  activeHotspot = null
  filmSession = null
  overlayAlpha = 0
  console.log('enterPage:', id, current)

  if (current.heading){
    pageHeading.html(current.heading)
    console.log('Sætter heading:', current.heading)
  } else {
    pageHeading.html('')
    pageHeading.addClass('hide')
    console.log('Ingen heading på denne side')
  }

  // button
  if (current.button && current.button.text){
    pageButton.html(current.button.text)
    console.log('Sætter knap:', current.button.text)
    pageButton.mousePressed(() => goto(current.button.action))
  } else {
    pageButton.addClass('hide')
    console.log('Ingen knap på denne side')
  }

  // caption hidden by default
  hideCaption()

  // load background image (lazy)
  console.log('Loader baggrundsbillede:', current.background)
  loadImageSafe(current.background, img => {
    current._bg = img
    console.log('Baggrundsbillede loaded:', img)
  })

  // start film if present
  if (current.film){
    console.log('Starter film:', current.film)
    startFilmSession(current.film)
  }
}

function goto(id){
  if (!id) return
  stopAllMedia()
  enterPage(id)
}

function stopAllMedia(){
  // stop video if any
  if (filmSession && filmSession.video){
    try { filmSession.video.pause() } catch(e){}
    try { filmSession.video.remove() } catch(e){}
  }
  filmSession = null
  // no global audio here
}

function startFilmSession(f){
  console.log('trying to start video')
  const video = createVideo([f.video], () => {
    video.loop = false
  }, () => {
    // error loading video – continue without playback
  })
  video.size(width, height)
  video.position(canvas.position().x, canvas.position().y)
  video.elt.setAttribute('playsinline', '')
  video.elt.setAttribute('webkit-playsinline', '')
  video.show()
  video.volume(1)
  video.play()

  filmSession = {
    spec: f,
    video,
    start: millis(),
    promptVisible: false
  }

  // schedule prompt after duration
  setTimeout(() => {
    if (!filmSession) return
    filmSession.promptVisible = true
    showCaption(f.text || '')
    startTimerUi()
  }, f.duration || 0)
}

function renderFilm(){
  console.log('render film')
  if (!filmSession) return
  // ensure video element fits
  // (already sized to canvasWrap; letting DOM handle it)
  // when prompt visible, update timer bar
  if (filmSession.promptVisible){
    const f = filmSession.spec
    const elapsed = millis() - (filmSession.start + (f.duration || 0))
    const dur = f.duration || 0
    const pct = constrain(elapsed / (f.duration || 0), 0, 1)
    timerFill.elt.style.width = (pct * 100).toFixed(2) + '%'
    if (pct >= 1){
      // TIMEOUT
      const to = f.timeoutAction
      // hide video
      stopAllMedia()
      hideCaption()
      if (to) goto(to)
    }
  } else {
    // still in playback period: check if duration elapsed
    const elapsed = millis() - filmSession.start
    const dur = filmSession.spec.duration || 0
    if (elapsed >= dur){
      // show prompt
      filmSession.promptVisible = true
      showCaption(filmSession.spec.text || '')
      startTimerUi()
    }
  }
}

function mousePressed(){
  // emulate physical click
  onPhysicalClick()
}

function onPhysicalClick(){
  // film prompt has priority
  if (filmSession && filmSession.promptVisible){
    const a = filmSession.spec.action
    stopAllMedia()
    hideCaption()
    if (a) goto(a)
    return
  }
  if (activeHotspot){
    const a = activeHotspot.action
    deactivateHotspot()
    if (a) goto(a)
  }
}

function showCaption(t=''){
  captionText.html(t || '')
  captionBar.removeClass('hide')
  timerFill.elt.style.width = '0%'
  showFooter(); // Show footer when caption is shown
}

function hideCaption(){
  captionBar.addClass('hide')
  timerFill.elt.style.width = '0%'
  hideFooter(); // Hide footer when caption is hidden
}

function startTimerUi(){
  // width is updated in draw()
  timerFill.elt.style.width = '0%'
}

function activateHotspot(h){
  if (activeHotspot === h) return
  activeHotspot = h
  hotspotStart = millis()
  overlayAlpha = 0

  // caption
  showCaption(h.text || '')

  // overlay image if provided
  activeOverlayImg = null;
  if (h.media && h.media.overlay){
    loadImageSafe(h.media.overlay, img => { activeOverlayImg = img });
  }

  // overlay video if provided
  if (activeOverlayVideo) {
    activeOverlayVideo.stop();
    activeOverlayVideo.remove();
    activeOverlayVideo = null;
  }
  if (h.media && h.media.video){
    // Beregn position og størrelse
    let x = h.x, y = h.y, w = h.w, hH = h.h;
    if (x <= 1 && y <= 1) {
      x = percentToPixel(x, 'x');
      y = percentToPixel(y, 'y');
      if (w && w <= 1) w = w * width;
      if (hH && hH <= 1) hH = hH * height;
    }
    activeOverlayVideo = createVideo(h.media.video, ()=>{
      activeOverlayVideo.size(w || 320, hH || 180);
      activeOverlayVideo.play();
      activeOverlayVideo.hide();
    });
    // Gem params til draw
    activeOverlayVideo._drawParams = { x, y, w: w || 320, h: hH || 180 };
  }
  // audio if provided
  if (h.media && h.media.audio){
    if (activeAudio) {
      activeAudio.stop()
      activeAudio = null
    }
    activeAudio = loadSound(h.media.audio, () => {
      activeAudio.play()
    })
  }
}

function deactivateHotspot(){
  activeHotspot = null
  activeOverlayImg = null
  overlayAlpha = 0
  hideCaption()
  if (activeAudio) {
    activeAudio.stop()
    activeAudio = null
  }
}

function mouseMoved(){
  if (!current) return
  if (filmSession) return

  const h = hitTestHotspotUnderMouse()
  if (h && h !== activeHotspot){
    activateHotspot(h)
  } else if (!h && activeHotspot){
    deactivateHotspot()
  }
}

function hitTestHotspotUnderMouse(){
  if (!current || !current.hotspots) return null
  for (let i = current.hotspots.length - 1; i >= 0; i--){
    const h = current.hotspots[i]
    if (pointInHotspot(mouseX, mouseY, h)) return h
  }
  return null
}

function percentToPixel(val, axis) {
  // val: 0..1, axis: 'x' eller 'y'
  return axis === 'x' ? val * width : val * height
}

function pointInHotspot(px, py, h){
  let x = h.x, y = h.y, r = h.r, w = h.w, hH = h.h
  if (x <= 1 && y <= 1) {
    x = percentToPixel(x, 'x')
    y = percentToPixel(y, 'y')
    if (r && r <= 1) r = r * Math.min(width, height)
    if (w && w <= 1) w = w * width
    if (hH && hH <= 1) hH = hH * height
  }
  if (r){
    const dx = px - x
    const dy = py - y
    return dx*dx + dy*dy <= r*r
  }
  if (w && hH){
    return px >= x && px <= x + w && py >= y && py <= y + hH
  }
  return false
}

function loadImageSafe(path, cb){
  loadImage(path, img => cb(img), err => {
    // fallback to dummy.png
    loadImage('./assets/dummy.png', img2 => cb(img2), err2 => cb(null))
  })
}

function drawHotspotDebug(hotspots) {
  push()
  noFill()
  stroke(0, 255, 0)
  strokeWeight(2)
  for (const h of hotspots) {
    // Brug procent-koordinater hvis de findes
    let x = h.x, y = h.y, r = h.r, w = h.w, hH = h.h
    if (x <= 1 && y <= 1) {
      x = percentToPixel(x, 'x')
      y = percentToPixel(y, 'y')
      if (r && r <= 1) r = r * Math.min(width, height)
      if (w && w <= 1) w = w * width
      if (hH && hH <= 1) hH = hH * height
    }
    if (r) {
      ellipse(x, y, r*2, r*2)
    } else if (w && hH) {
      rect(x, y, w, hH)
    }
  }
  pop()
}

function showFooter() {
  select('footer').addClass('footer-active');
}

function hideFooter() {
  select('footer').removeClass('footer-active');
}


function touchStarted() {
   if (getAudioContext().state !== 'running') {
     getAudioContext().resume();
   }
}