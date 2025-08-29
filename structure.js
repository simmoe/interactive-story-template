/*
  Interaktiv historie – structure.js
  ----------------------------------
  Eleverne redigerer KUN dette dokument.
  'pages' er et array af side-objekter. Hver side beskriver en interaktiv "tavle".

  ✅ Felter i et side-objekt (minimum):
  - id:        Unikt id (string), fx "#page1"
  - title:     Kort titel (string)
  - background: Sti til baggrundsbillede (string) – kan være lokal eller url
  - hotspots:  Liste af klik- eller hover-områder (array)

  ➕ Mulige ekstra felter i et side-objekt:
  - heading:   (string) En synlig overskrift der renderes som <h1> midt på siden
  - button:    (object) En valgfri knap med tekst og evt. handling
  - film:      (object) Valgfrit fuldskærms-klip, der afspilles automatisk og slutter med valg via CLICK/TIMEOUT
               Struktur: { video: '...mp4', duration: ms, text: 'bjælketekst', action?: '#id', timeoutAction?: '#id' }

  ✅ Felter i et hotspot-objekt (enkelt og konsekvent):
  - type:   "text" | "goto" | "audio" | "video" | "image" | "hotspot"
  - x, y:   centrum-koordinater i pixels
  - r:      radius (cirkelområde) – brug r ELLER w+h
  - w, h:   bredde og højde (rektangelområde)
  - text:   tekst der kan vises (tooltip eller bjælke nederst)
  - action: mål for navigation (fx "#page2") – valgfri
  - timeoutAction: mål for navigation hvis timeren udløber uden klik (valgfri)
  - media:  objekt med evt. { audio, overlay, image, video }
  - duration: varighed i ms (timer-bjælken er altid blå)
  - meta:  valgfrit objekt, fx { tooltip: "...", maxActivations: 3 }

  INTERAKTION (kun én fysisk knap):
  - Spilleren kan KUN vælge ved at trykke på knappen MENS timeren kører (CLICK),
    eller ved IKKE at trykke indtil timeren løber ud (TIMEOUT).
  - Dette matcher et MQTT-input til websiden. `action` bruges til CLICK, `timeoutAction` til TIMEOUT.

  Bemærk: Ingen logik her – kun data. En visningsmotor kan senere parse disse felter.
*/

pages = [
  // ------------------------
  // Side 1 – Anslag (Forsiden)
  // ------------------------
  {
    id: '#page1',
    title: 'Huset i passet',
    background: './assets/front.png',
    heading: 'Velkommen til passet',
    button: { text: 'Gå videre', action: '#page2' },
    backgroundSound: './assets/storm.mp3',
    hotspots: [
      // Månen – foreshadowing + genvej til klimaks-aksen
      {
        type: 'hotspot',
        x: 0.38, y: 0.25, r: 0.08, // 800/1000, 200/1000, 60/750
        text: 'Gå direkte til kælderen',
        media: { audio: './assets/doorOhh.mp3', overlay: './assets/bloodmoon.png' },
        duration: 5000,
        action: '#page4',
        meta: { tooltip: 'Kan aktiveres 3 gange', maxActivations: 3 }
      }
    ]
  },

  // ----------------------------------------
  // Side 2 – Kontoret (Præsentation/Forstyrrelse)
  // ----------------------------------------
  {
    id: '#page2',
    title: 'Kontoret',
    background: './assets/office.png',
    heading: 'Inde på kontoret',
    hotspots: [
      {
        type: 'hotspot',
        x: 0.3, y: 0.1, w: 0.14, h: 0.07, // 300/1000, 500/750, 140/1000, 70/750
        text: 'Skuffen knirker åben',
        media: { video: './assets/stairs.mov' },
        duration: 2500,
        action: '#page3',
        timeoutAction: '#page3',
        meta: { tooltip: 'Tryk for at se i skuffen' }
      },
      {
        type: 'hotspot',
        x: 0.3, y: 0.55, w: 0.25, h: 0.2, // 600/1000, 420/750, 180/1000, 90/750
        text: 'Papirerne rasler',
        media: { image: './assets/dummy.png' },
        duration: 2500,
        action: '#page3',
        timeoutAction: '#page3',
        meta: { tooltip: 'Tryk for at læse' }
      },
      {
        type: 'hotspot',
        x: 0.6, y: 0.32, w: 0.16, h: 0.16, // 900/1000, 300/750, 220/1000, 140/750
        text: 'TV\'et flimrer',
        media: { video: './assets/earth.mp4' },
        duration: 4000,
        action: '#deroute',
        timeoutAction: '#deroute',
        meta: { tooltip: 'Tryk for at se' }
      }
    ]
  },

  // --------------------------------------
  // Side 3 – Gang/trapper (Point of no return)
  // --------------------------------------
  {
    id: '#page3',
    title: 'Gangen',
    background: './assets/dummy.png',
    heading: 'Der er ingen vej tilbage',
    hotspots: [
      {
        type: 'hotspot',
        x: 0.7, y: 0.5, w: 0.22, h: 0.12, // 700/1000, 500/750, 220/1000, 120/750
        text: 'En lyd nedefra – gå ned ad trappen',
        duration: 2000,
        action: '#page4'
      }
    ]
  },

  // ------------------------------
  // Side 4 – Kælderen (Klimaks)
  // ------------------------------
  {
    id: '#page4',
    title: 'Kælderen',
    background: './assets/dummy.png',
    heading: 'Nogen er hernede',
    hotspots: [
      {
        type: 'hotspot',
        x: 0.42, y: 0.52, w: 0.22, h: 0.1, // 420/1000, 520/750, 220/1000, 100/750
        text: 'Lyden flytter sig – hold vejret',
        duration: 2500,
        action: '#escape',
        timeoutAction: '#death'
      }
    ]
  },

  // ------------------------------
  // Side 5 – Dødssiden (Jumpscare)
  // ------------------------------
  {
    id: '#death',
    title: 'Mørket falder på',
    background: './assets/dummy.png',
    heading: 'Du nåede det ikke',
    hotspots: [
      {
        type: 'hotspot',
        x: 0.64, y: 0.62, w: 0.24, h: 0.11, // 640/1000, 620/750, 240/1000, 110/750
        text: 'Prøv igen fra begyndelsen',
        duration: 1500,
        action: '#page1'
      }
    ]
  },

  // ---------------------------------
  // Side 6 – Overlevelse (Udtoning)
  // ---------------------------------
  {
    id: '#escape',
    title: 'Ud i natten',
    background: './assets/dummy.png',
    heading: 'Du slap ud – for nu',
    hotspots: [
      {
        type: 'hotspot',
        x: 0.64, y: 0.62, w: 0.26, h: 0.11, // 640/1000, 620/750, 260/1000, 110/750
        text: 'Spil igen med andre valg',
        duration: 1500,
        action: '#page1'
      }
    ]
  },

  // ---------------------------------
  // Deroute-side – fuldskærmsfilm m. afslutningsvalg
  // ---------------------------------
  {
    id: '#deroute',
    title: 'Overvågning',
    film: {
      video: './assets/stairs.mov',
      videoDuration: 7000,
      duration: 3000,
      text: 'Du synes du mærker noget bag dig. Vend dig om og se?',
      action: '#page3',
      timeoutAction: '#page2'
    },
    hotspots: []
  }
]

/*
  Strukturprincipper i brug:
  - Enkelt input: CLICK (knap) vs TIMEOUT (ingen tryk). Det håndteres med action/timeoutAction.
  - Foldback: Side 2’s hotspots fører til #page3 eller #deroute, men hovedforløbet samles igen i #page3 → #page4.
  - Klimaks i kælderen (#page4): CLICK ⇒ #escape, TIMEOUT ⇒ #death.
  - Deroute-side (#deroute): fuldskærmsfilm; efter duration vises tekstbjælke med CLICK/TIMEOUT der sender tilbage til #page2 eller frem til #page3.
  - Hotspots er rene data: text, media, duration, action, timeoutAction og enkel meta; film-sider bruger samme CLICK/TIMEOUT-princip.
*/

