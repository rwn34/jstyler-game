// === PWA LOGIC (Installable App) ===
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  $('btnInstall').style.display = 'block';
});
function installPWA() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(() => {
      deferredPrompt = null;
      $('btnInstall').style.display = 'none';
    });
  }
}
function initPWA() {
    if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) {
        return;
    }
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('sw.js', { scope: './' }).then(function(reg) {
            reg.addEventListener('updatefound', function() {
                var newSW = reg.installing;
                newSW.addEventListener('statechange', function() {
                    if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
                        showUpdateBanner();
                    }
                });
            });
        }).catch(function(e) {
            console.warn('Service worker registration failed:', e);
        });
    });
}
function showUpdateBanner() {
    var b = document.createElement('div');
    b.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:9999;background:linear-gradient(135deg,#0af,#08f);color:#fff;padding:12px 24px;border-radius:12px;font-size:0.8rem;font-weight:700;display:flex;align-items:center;gap:12px;box-shadow:0 4px 20px rgba(0,0,0,0.5);font-family:monospace;';
    b.innerHTML = '🔄 Update available! <button onclick="location.reload()" style="background:#fff;color:#000;border:none;padding:6px 14px;border-radius:8px;font-weight:700;font-size:0.75rem;cursor:pointer;">REFRESH</button>';
    document.body.appendChild(b);
}
initPWA();

// === 50 RANDOM TIPS & TRIVIA ===
const TIPS = [
    "Coyote Time: You can jump a split second after running off a ledge.",
    "Double jump cooldown is 3 seconds. Watch the circular indicator on the jump button.",
    "Switch to Arrow Buttons in Controls if the joystick doesn't feel right.",
    "Hold jump while falling with Slow Fall equipped to glide gently downward.",
    "Vibration feedback pulses on jump, coin pickup, and death — toggle it in Controls.",
    "Jump Buffer: Press jump a few frames before landing and it still registers.",
    "Adjust button position and size in Controls > Adjust Layout.",
    "Lasers blink on a predictable rhythm. Watch the red warning line before it fires.",
    "Silver gems in arcs between platforms guide the optimal jump path.",
    "Gold gems are limited — spend them wisely in the Store on permanent skills.",
    "Collect gems quickly for combo multipliers! x2, x3, x4... more style points.",
    "Falling into the void? Auto Resurrect skill saves you at the last platform.",
    "Tap the N30N logo to pause. Hold it to exit back to level select.",
    "The split timer shows green when you're ahead of your best time, red when behind.",
    "Orange bounce pads launch you 1.5x higher — and reset your double jump!",
    "Zip lines auto-slide you forward. Press jump to hop off early.",
    "Shield skill absorbs one spike or laser hit per run. Doesn't save from falls.",
    "Air Dash: After double jump, press jump AGAIN for a horizontal burst forward.",
    "Near-miss a spike or laser? You'll see 'CLOSE!' and earn a style point.",
    "Land on the very edge of a platform for an 'EDGE!' bonus and style point.",
    "The Store has cosmetics: hats, capes, body colors, trails, and more.",
    "Triple Jump consumable gives you a 3rd jump mid-air with 15s cooldown.",
    "Double Shield consumable absorbs 2 hits in one run.",
    "Ghost Rival skill records your best run and races you next time.",
    "Your player rank grows from gold gems, silver, clears, and matches played.",
    "Share your victories! Tap the share button after clearing a level.",
    "Export your save from Settings to back up progress across devices.",
    "Each level unlocks the next one. Beat them all to reach Terminal!",
    "Body color cosmetics change your stickman's color permanently while equipped.",
    "Cape cosmetics flow behind you as you run — fire cape has flickering flames!",
    "Headgear sits on your stickman's head. Crown, horns, halo, and more.",
    "Platform: Hologram makes all platforms look like flickering holograms.",
    "The implosion effect on level clear pulls particles inward. Satisfying!",
    "Score = distance + gems + style - deaths + time bonus. Aim high!",
    "Weather effects are visual only — they don't change physics.",
    "Moving platforms have dashed borders. Watch their rhythm before jumping.",
    "Patience is key. Wait for moving platforms to align perfectly.",
    "You can steer left and right equally fast while in the air.",
    "The game works offline once installed as a PWA. Play anywhere!",
    "Rank info (tap ⓘ) shows exactly how points are earned.",
    "Visit the Store daily \u2014 the free chest gives gold or silver gems every 24 hours!",
    "The shopkeeper has random tips. Open the Store to hear what they say.",
    "Each stage has unique landing effects \u2014 fire in Magma, bubbles in Swamp, sparks in Storm.",
    "Toggle the ghost rival on/off with the \ud83d\udc7b button (bottom-left) during gameplay.",
    "Parallax backgrounds change per stage \u2014 notice the different shapes and depths!"
];

// === DEBUG LOADER ===
var bootPct=0;
var bootReady=setInterval(function(){if(typeof THEMES!=='undefined'){clearInterval(bootReady);
var bootBgCanvas=document.getElementById('bootBg'),bootBgCtx=bootBgCanvas?bootBgCanvas.getContext('2d'):null;
var bootPCanvas=document.getElementById('bootParticles'),bootPCtx=bootPCanvas?bootPCanvas.getContext('2d'):null;
var bootThemeIdx=0,bootT=0;
function resizeBootCanvas(){
    if(bootBgCanvas){bootBgCanvas.width=window.innerWidth;bootBgCanvas.height=window.innerHeight;}
    if(bootPCanvas){bootPCanvas.width=window.innerWidth;bootPCanvas.height=window.innerHeight;}
}
resizeBootCanvas();
var bootParts=[];
function bootBurst(){
    var cx=window.innerWidth/2,cy=window.innerHeight/2;
    for(var i=0;i<60;i++){
        var ang=Math.random()*Math.PI*2,spd=2+Math.random()*8;
        bootParts.push({x:cx,y:cy,vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd,life:1,color:THEMES[Math.floor(Math.random()*THEMES.length)].acc,size:2+Math.random()*4});
    }
}
function drawBootFrame(){
    if(!bootBgCtx)return;
    var w=bootBgCanvas.width,h=bootBgCanvas.height;
    bootT+=0.02;
    // Cycle theme every 2 seconds
    bootThemeIdx=Math.floor(bootT*0.5)%THEMES.length;
    var th=THEMES[bootThemeIdx];

    // Dark sky gradient
    var g=bootBgCtx.createLinearGradient(0,0,0,h);
    g.addColorStop(0,th.skyT);g.addColorStop(0.6,th.skyM);g.addColorStop(1,th.skyB);
    bootBgCtx.fillStyle=g;bootBgCtx.fillRect(0,0,w,h);

    // Perspective grid floor
    bootBgCtx.strokeStyle=th.grid;bootBgCtx.lineWidth=1;bootBgCtx.globalAlpha=0.1;
    var horizon=h*0.55;
    var gridScroll=(bootT*100)%60;
    for(var gz=0;gz<12;gz++){
        var zy=horizon+(gz*60+gridScroll)*(h-horizon)/720;
        if(zy>h)continue;
        var spread=(zy-horizon)/(h-horizon);
        bootBgCtx.beginPath();bootBgCtx.moveTo(w*0.5-w*spread*0.8,zy);bootBgCtx.lineTo(w*0.5+w*spread*0.8,zy);bootBgCtx.stroke();
    }
    for(var gv=-6;gv<=6;gv++){
        bootBgCtx.beginPath();bootBgCtx.moveTo(w*0.5,horizon);bootBgCtx.lineTo(w*0.5+gv*w*0.15,h);bootBgCtx.stroke();
    }
    bootBgCtx.globalAlpha=1;

    // Scrolling platforms (silhouette cityscape)
    var platY=h*0.7;
    bootBgCtx.fillStyle=th.acc;bootBgCtx.globalAlpha=0.15;
    for(var i=0;i<8;i++){
        var px=((i*120-bootT*80)%960+960)%(w+200)-100;
        var ph=20+Math.sin(i*2.5)*15;
        bootBgCtx.fillRect(px,platY-ph,80,8);
        // Top edge glow
        bootBgCtx.strokeStyle=th.acc;bootBgCtx.lineWidth=1.5;bootBgCtx.globalAlpha=0.4;
        bootBgCtx.beginPath();bootBgCtx.moveTo(px,platY-ph);bootBgCtx.lineTo(px+80,platY-ph);bootBgCtx.stroke();
        bootBgCtx.globalAlpha=0.15;
    }
    bootBgCtx.globalAlpha=1;

    // Running player dot
    var dotX=w*0.5+Math.sin(bootT*1.5)*w*0.1;
    var dotY=platY-30-Math.abs(Math.sin(bootT*3))*40;
    bootBgCtx.shadowBlur=12;bootBgCtx.shadowColor=th.acc;bootBgCtx.fillStyle=th.acc;
    bootBgCtx.beginPath();bootBgCtx.arc(dotX,dotY,6,0,Math.PI*2);bootBgCtx.fill();
    // Trail
    bootBgCtx.globalAlpha=0.3;
    for(var ti=1;ti<=4;ti++){
        var ty=platY-30-Math.abs(Math.sin((bootT-ti*0.05)*3))*40;
        bootBgCtx.beginPath();bootBgCtx.arc(dotX-ti*8,ty,6-ti,0,Math.PI*2);bootBgCtx.fill();
    }
    bootBgCtx.globalAlpha=1;bootBgCtx.shadowBlur=0;

    // Floating particles (ambient)
    for(var i=0;i<15;i++){
        var fx=(i*137+bootT*30)%w;
        var fy=(i*89+bootT*15)%h;
        bootBgCtx.fillStyle=th.part;bootBgCtx.globalAlpha=0.2+Math.sin(bootT+i)*0.15;
        bootBgCtx.beginPath();bootBgCtx.arc(fx,fy,1.5,0,Math.PI*2);bootBgCtx.fill();
    }
    bootBgCtx.globalAlpha=1;

    // Ring color sync
    var ring=document.getElementById('bootRing');
    if(ring) ring.style.stroke=th.acc;

    // Burst particles
    if(bootPCtx){
        bootPCtx.clearRect(0,0,w,h);
        for(var i=bootParts.length-1;i>=0;i--){
            var p=bootParts[i];
            p.x+=p.vx;p.y+=p.vy;p.life-=0.02;p.vy+=0.1;
            if(p.life<=0){bootParts.splice(i,1);continue;}
            bootPCtx.globalAlpha=p.life;
            bootPCtx.fillStyle=p.color;
            bootPCtx.beginPath();bootPCtx.arc(p.x,p.y,p.size*p.life,0,Math.PI*2);bootPCtx.fill();
        }
        bootPCtx.globalAlpha=1;
    }
}
var bootAnimId=requestAnimationFrame(function bootLoop(){drawBootFrame();var b=document.getElementById('boot');if(b&&!b.classList.contains('hidden'))bootAnimId=requestAnimationFrame(bootLoop);});
var bootIv=setInterval(function(){
    bootPct+=2;
    if(bootPct>100)bootPct=100;
    var el=document.getElementById('bootPct');
    if(el)el.textContent=bootPct+'%';
    var ring=document.getElementById('bootRing');
    if(ring) ring.style.strokeDashoffset=283-(283*bootPct/100);
    if(bootPct>=100){
        clearInterval(bootIv);
        bootBurst();
        setTimeout(function(){
            var boot=document.getElementById('boot');
            if(boot)boot.style.opacity='0';
            setTimeout(function(){
                if(boot)boot.classList.add('hidden');
                cancelAnimationFrame(bootAnimId);
                checkOrient();
            },600);
        },600);
    }
},50);

}},10);

// === AUDIO & MUSIC ===
var AC=window.AudioContext||window.webkitAudioContext,ac=null;
var musLoop=null, musSeq=0, nextNoteTime=0.0;

function initAudio(){
    if(!ac){
        ac=new AC();
        if(musOn) startMusic();
    }else if(ac.state==='suspended'){
        ac.resume();
    }
}
function playSfx(type){
    if(!sfxOn||!ac)return;
    var o=ac.createOscillator(),g=ac.createGain(),now=ac.currentTime;
    o.connect(g);g.connect(ac.destination);
    if(type==='jump'){o.type='square';o.frequency.setValueAtTime(440,now);o.frequency.exponentialRampToValueAtTime(880,now+.1);g.gain.setValueAtTime(.1,now);g.gain.exponentialRampToValueAtTime(.001,now+.15);o.start(now);o.stop(now+.15);}
    else if(type==='land'){o.type='sine';o.frequency.setValueAtTime(200,now);o.frequency.exponentialRampToValueAtTime(50,now+.1);g.gain.setValueAtTime(.08,now);g.gain.exponentialRampToValueAtTime(.001,now+.1);o.start(now);o.stop(now+.1);}
    else if(type==='die'){o.type='sawtooth';o.frequency.setValueAtTime(100,now);o.frequency.exponentialRampToValueAtTime(20,now+.5);g.gain.setValueAtTime(.15,now);g.gain.exponentialRampToValueAtTime(.001,now+.5);o.start(now);o.stop(now+.5);}
    else if(type==='win'){o.type='square';o.frequency.setValueAtTime(523,now);o.frequency.setValueAtTime(659,now+.1);o.frequency.setValueAtTime(784,now+.2);g.gain.setValueAtTime(.08,now);g.gain.exponentialRampToValueAtTime(.001,now+.4);o.start(now);o.stop(now+.4);}
    else if(type==='coin'){o.type='sine';o.frequency.setValueAtTime(1000,now);o.frequency.exponentialRampToValueAtTime(1800,now+.1);g.gain.setValueAtTime(.1,now);g.gain.exponentialRampToValueAtTime(.001,now+.15);o.start(now);o.stop(now+.15);}
}
function vib(ms){if(vibrateOn&&navigator.vibrate)navigator.vibrate(ms);}

var SCALES = [
    [220, 220, 440, 220, 330, 220, 261, 293], // Base
    [196, 261, 392, 261, 329, 196, 293, 220], // Moody
    [261, 329, 392, 523, 392, 329, 261, 196], // Upbeat
    [146, 220, 293, 329, 440, 329, 293, 220], // Cyber
    [329, 261, 220, 196, 164, 196, 220, 261]  // Descent
];
var TEMPOS = [0.15, 0.12, 0.14, 0.18, 0.13];
var SYNTHS = ['square', 'sawtooth', 'square', 'triangle', 'sawtooth'];

var audioInitialized = false;
function initAudioOnFirstInteract() {
    if(!audioInitialized && musOn) {
        initAudio();
        audioInitialized = true;
        document.removeEventListener('touchstart', initAudioOnFirstInteract);
        document.removeEventListener('mousedown', initAudioOnFirstInteract);
        document.removeEventListener('keydown', initAudioOnFirstInteract);
    }
}
document.addEventListener('touchstart', initAudioOnFirstInteract, {passive: true});
document.addEventListener('mousedown', initAudioOnFirstInteract);
document.addEventListener('keydown', initAudioOnFirstInteract);

function playMusicStep() {
    if(!musOn || !ac) return;
    
    var noteScale, stepTempo, sType;
    
    if (!gameRunning) {
        noteScale = [220, 261, 329, 440, 392, 329, 261, 196]; // Ambient menu scale
        stepTempo = 0.25;
        sType = 'sine';
    } else {
        var sIdx = curLvl % SCALES.length;
        noteScale = SCALES[sIdx];
        stepTempo = TEMPOS[sIdx];
        sType = SYNTHS[sIdx];
    }

    while (nextNoteTime < ac.currentTime + 0.1) {
        var note = noteScale[musSeq % 8];
        
        if (musSeq % 4 === 0 && gameRunning) {
            var k = ac.createOscillator(), kg = ac.createGain();
            k.frequency.setValueAtTime(150, nextNoteTime);
            k.frequency.exponentialRampToValueAtTime(0.01, nextNoteTime + 0.1);
            k.connect(kg); kg.connect(ac.destination);
            kg.gain.setValueAtTime(0.3, nextNoteTime);
            kg.gain.exponentialRampToValueAtTime(0.01, nextNoteTime + 0.1);
            k.start(nextNoteTime); k.stop(nextNoteTime + 0.1);
        }
        
        var prob = gameRunning ? 0.2 : 0.4;
        if (Math.random() > prob) {
            var o = ac.createOscillator(), g = ac.createGain();
            o.type = sType;
            o.frequency.setValueAtTime(note, nextNoteTime);
            o.connect(g); g.connect(ac.destination);
            g.gain.setValueAtTime(gameRunning ? 0.03 : 0.015, nextNoteTime);
            g.gain.exponentialRampToValueAtTime(0.001, nextNoteTime + stepTempo);
            o.start(nextNoteTime); o.stop(nextNoteTime + stepTempo);
        }
        nextNoteTime += stepTempo; 
        musSeq++;
    }
    musLoop = requestAnimationFrame(playMusicStep);
}
function startMusic() {
    if(!musOn || !ac) return;
    if(ac.state === 'suspended') ac.resume();
    if(!musLoop) {
        nextNoteTime = ac.currentTime + 0.1;
        musSeq = 0;
        musLoop = requestAnimationFrame(playMusicStep);
    }
}
function stopMusic() {
    if(musLoop) { cancelAnimationFrame(musLoop); musLoop = null; }
}

// === DATA ===

var THEMES=[
{name:"Neon Abyss",skyT:"#020208",skyM:"#0a0a1a",skyB:"#1a0a2a",grid:"#0ff",build:"#0a0a30",acc:"#f0f",part:"#0ff",grav:.6,jmp:-13,fric:.85,weather:'clear',bg:'city'},
{name:"Cyber Rain",skyT:"#080810",skyM:"#0a0a18",skyB:"#0d0d20",grid:"#08f",build:"#0a0a20",acc:"#0af",part:"#0af",grav:.6,jmp:-13,fric:.82,weather:'rain',bg:'city'},
{name:"Crystal Spire",skyT:"#0a0a15",skyM:"#101020",skyB:"#1a1a30",grid:"#aaf",build:"#151530",acc:"#aaf",part:"#aaf",grav:.55,jmp:-14,fric:.88,weather:'snow',bg:'spire'},
{name:"Magma Core",skyT:"#1a0505",skyM:"#200808",skyB:"#2a0a0a",grid:"#f50",build:"#200505",acc:"#f50",part:"#f80",grav:.65,jmp:-12,fric:.8,weather:'clear',bg:'magma'},
{name:"Toxic Swamp",skyT:"#051a05",skyM:"#082008",skyB:"#0a2a0a",grid:"#0f0",build:"#051a05",acc:"#5f0",part:"#5f0",grav:.6,jmp:-13,fric:.85,weather:'rain',bg:'swamp'},
{name:"Void Walker",skyT:"#000000",skyM:"#020202",skyB:"#050505",grid:"#888",build:"#000000",acc:"#fff",part:"#fff",grav:.5,jmp:-15,fric:.9,weather:'clear',bg:'void'},
{name:"Solar Flare",skyT:"#1a1005",skyM:"#2a1808",skyB:"#3a200a",grid:"#fa0",build:"#2a1505",acc:"#fa0",part:"#ff0",grav:.7,jmp:-11,fric:.78,weather:'clear',bg:'sun'},
{name:"Deep Ocean",theme:7,skyT:"#000510",skyM:"#000818",skyB:"#000a20",grid:"#08f",build:"#000818",acc:"#0af",part:"#0af",grav:.6,jmp:-13,fric:.85,weather:'rain',bg:'ocean'},
{name:"Frost Byte",skyT:"#0d0d18",skyM:"#101020",skyB:"#151528",grid:"#aff",build:"#101020",acc:"#aff",part:"#aff",grav:.5,jmp:-14,fric:.92,weather:'snow',bg:'ice'},
{name:"Rust Belt",skyT:"#1a1008",skyM:"#20120a",skyB:"#2a150c",grid:"#a50",build:"#201008",acc:"#a50",part:"#a80",grav:.65,jmp:-12,fric:.8,weather:'dust',bg:'rust'},
{name:"Ghost Line",skyT:"#0a0a0a",skyM:"#111",skyB:"#1a1a1a",grid:"#ccc",build:"#111",acc:"#ccc",part:"#ccc",grav:.6,jmp:-13,fric:.85,weather:'clear',bg:'ghost'},
{name:"Voltage",skyT:"#101005",skyM:"#1a1a08",skyB:"#20200a",grid:"#ff0",build:"#1a1a05",acc:"#ff0",part:"#ff0",grav:.6,jmp:-13,fric:.85,weather:'storm',bg:'storm'},
{name:"Bio Lab",skyT:"#051005",skyM:"#081808",skyB:"#0a200a",grid:"#0f8",build:"#081808",acc:"#0f8",part:"#0f8",grav:.6,jmp:-13,fric:.85,weather:'rain',bg:'bio'},
{name:"Dust Storm",skyT:"#181005",skyM:"#201508",skyB:"#2a1a0a",grid:"#ca8",build:"#201508",acc:"#ca8",part:"#ca8",grav:.7,jmp:-11,fric:.75,weather:'dust',bg:'dust'},
{name:"Mirror City",skyT:"#080818",skyM:"#0a0a20",skyB:"#0c0c28",grid:"#f0f",build:"#0a0a20",acc:"#f0f",part:"#f0f",grav:.6,jmp:-13,fric:.85,weather:'clear',bg:'mirror'},
{name:"Glitch Zone",skyT:"#0a0a0a",skyM:"#0f0f0f",skyB:"#151515",grid:"#0f0",build:"#0f0f0f",acc:"#f0f",part:"#0f0",grav:.6,jmp:-13,fric:.85,weather:'storm',bg:'glitch'},
{name:"Aurora Veil",skyT:"#080818",skyM:"#0a1020",skyB:"#0c1830",grid:"#8af",build:"#0a1020",acc:"#8af",part:"#8af",grav:.55,jmp:-14,fric:.88,weather:'snow',bg:'aurora'},
{name:"Obsidian",skyT:"#020202",skyM:"#050505",skyB:"#080808",grid:"#f05",build:"#050505",acc:"#f05",part:"#f05",grav:.6,jmp:-13,fric:.85,weather:'clear',bg:'obsidian'},
{name:"Starlight",skyT:"#020208",skyM:"#050510",skyB:"#0a0a1a",grid:"#fff",build:"#050510",acc:"#fff",part:"#fff",grav:.5,jmp:-15,fric:.9,weather:'clear',bg:'star'},
{name:"Terminal",skyT:"#001000",skyM:"#001800",skyB:"#002000",grid:"#0f0",build:"#001800",acc:"#0f0",part:"#0f0",grav:.6,jmp:-13,fric:.85,weather:'clear',bg:'terminal'}
];

var LEVELS=[
{name:"Neon Abyss",theme:0,sc:1,plats:20,gaps:[100,140],hc:60,move:0, diff:"STARTER"},
{name:"Cyber Rain",theme:1,sc:1,plats:22,gaps:[100,140],hc:50,move:1, diff:"STARTER"},
{name:"Crystal Spire",theme:2,sc:1,plats:25,gaps:[110,160],hc:80,move:1, diff:"SIMPLE"},
{name:"Magma Core",theme:3,sc:1,plats:18,gaps:[90,130],hc:60,move:1, diff:"SIMPLE"},
{name:"Toxic Swamp",theme:4,sc:1,plats:24,gaps:[100,145],hc:70,move:1, diff:"SIMPLE"},
{name:"Void Walker",theme:5,sc:1,plats:30,gaps:[120,180],hc:90,move:1, diff:"SIMPLE"},
{name:"Solar Flare",theme:6,sc:1,plats:20,gaps:[100,140],hc:60,move:1, diff:"MODERATE"},
{name:"Deep Ocean",theme:7,sc:1,plats:26,gaps:[110,155],hc:75,move:2, diff:"MODERATE"},
{name:"Voltage",theme:11,sc:1,plats:20,gaps:[110,160],hc:80,move:2, diff:"MODERATE"},
{name:"Rust Belt",theme:9,sc:1,plats:22,gaps:[100,145],hc:65,move:2, diff:"MODERATE"},
{name:"Frost Byte",theme:8,sc:1,plats:28,gaps:[120,180],hc:90,move:2, diff:"MODERATE"},
{name:"Aurora Veil",theme:16,sc:1,plats:24,gaps:[110,155],hc:80,move:3, diff:"MODERATE"},
{name:"Bio Lab",theme:12,sc:1,plats:24,gaps:[110,150],hc:85,move:2, diff:"MODERATE"},
{name:"Dust Storm",theme:13,sc:1,plats:18,gaps:[110,140],hc:55,move:2, diff:"MODERATE"},
{name:"Mirror City",theme:14,sc:1,plats:28,gaps:[110,160],hc:100,move:3, diff:"HARD"},
{name:"Glitch Zone",theme:15,sc:1,plats:28,gaps:[120,170],hc:100,move:3, diff:"HARD"},
{name:"Starlight",theme:18,sc:1,plats:35,gaps:[150,220],hc:110,move:3, diff:"HARD"},
{name:"Ghost Line",theme:10,sc:1,plats:32,gaps:[140,200],hc:100,move:2, diff:"HARD"},
{name:"Obsidian",theme:17,sc:1,plats:30,gaps:[130,190],hc:95,move:3, diff:"HARD"},
{name:"Terminal",theme:19,sc:1,plats:30,gaps:[120,200],hc:120,move:3, diff:"HARD"}
];

// === DAILY STAGE HELPERS ===
function hashString(str){
    var h = 0;
    for(var i = 0; i < str.length; i++) h = ((h * 31) + str.charCodeAt(i)) >>> 0;
    return h;
}
function buildDailyTheme(seed1, seed2, seed3){
    var moodIdx   = hashString(seed1) % THEMES.length;
    var energyIdx = hashString(seed2) % THEMES.length;
    var feelIdx   = hashString(seed3) % THEMES.length;
    var mood   = THEMES[moodIdx];
    var energy = THEMES[energyIdx];
    var feel   = THEMES[feelIdx];
    return {
        name: 'DAILY',
        skyT: mood.skyB, skyM: mood.skyM, skyB: mood.skyT,
        grid: energy.grid,
        build: energy.build,
        acc: energy.acc,
        part: energy.part,
        grav: feel.grav, jmp: feel.jmp, fric: feel.fric,
        weather: feel.weather,
        bg: mood.bg,
        inverted: true
    };
}

const GAME_VERSION = 2;
const LAYOUT_VERSION = 2;
const STAGE_CONTENT_VERSION = 1; // bump when stage gameplay content changes (e.g., new mechanics)
const STAGE_CONTENT_AFFECTS_FROM_LVL = 6; // stages from this index up are affected by current content version

// === STORAGE ===

var LS=null;
try{LS=localStorage;}catch(e){console.warn('localStorage unavailable:',e);}
var _sk='n3j8x2qf';
function _xor(s){var o='';for(var i=0;i<s.length;i++)o+=String.fromCharCode(s.charCodeAt(i)^_sk.charCodeAt(i%_sk.length));return o;}
function _enc(s){return btoa(_xor(s));}
function _dec(s){try{return _xor(atob(s));}catch(e){return null;}}
function load(k,d){
    if(!LS)return d;
    var v=LS.getItem('ndj_'+k);
    if(!v)return d;
    var raw=_dec(v);
    if(raw===null){try{return JSON.parse(v);}catch(e){return d;}}
    try{return JSON.parse(raw);}
    catch(e){
        try{return JSON.parse(v);}catch(e2){}
        try{LS.removeItem('ndj_'+k);}catch(_e){}
        return d;
    }
}
function save(k,v){if(!LS)return;try{LS.setItem('ndj_'+k,_enc(JSON.stringify(v)));}catch(e){console.warn('Save failed for '+k+':',e);}}

var isV2 = load('v2', false);
if(!isV2) {
    if(LS) LS.removeItem('ndj_unlocked');
    save('v2', true);
}

// === METRICS (anonymous, opt-out by setting METRIC_URL='') ===
var METRIC_URL = 'https://ndj-metrics.jstylr.workers.dev'; // Cloudflare Worker — set to '' to disable metrics
var playerId = load('playerId', null);
if(!playerId){playerId='p_'+Math.random().toString(36).slice(2,10)+Date.now().toString(36);save('playerId',playerId);}

// v2: session token + HMAC signing for anti-cheat
var _sessionToken=null,_sessionExpiresAt=0,_sessionPromise=null;
function getSessionToken(){
    if(_sessionToken&&Date.now()<_sessionExpiresAt-60000)return Promise.resolve(_sessionToken);
    if(!METRIC_URL)return Promise.resolve(null);
    if(_sessionPromise)return _sessionPromise;
    _sessionPromise=fetch(METRIC_URL+'/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pid:playerId,ts:Date.now()})}).then(function(r){
        return r.ok?r.json():null;
    }).then(function(d){
        if(d&&d.ok&&d.token){_sessionToken=d.token;_sessionExpiresAt=d.expiresAt||(Date.now()+3600000);return _sessionToken;}
        return null;
    }).catch(function(){return null;}).then(function(t){
        setTimeout(function(){_sessionPromise=null;},1000);
        return t;
    });
    return _sessionPromise;
}
function _hmacSign(key,message){
    if(!window.crypto||!crypto.subtle)return Promise.resolve(null);
    try{
        var enc=new TextEncoder();
        return crypto.subtle.importKey('raw',enc.encode(key),{name:'HMAC',hash:'SHA-256'},false,['sign']).then(function(k){
            return crypto.subtle.sign('HMAC',k,enc.encode(message));
        }).then(function(sig){
            return Array.from(new Uint8Array(sig)).map(function(b){return ('0'+b.toString(16)).slice(-2);}).join('');
        }).catch(function(){return null;});
    }catch(err){return Promise.resolve(null);}
}

function sendMetric(type, data){
    if(!METRIC_URL)return;
    var e={pid:playerId,name:(typeof playerName!=='undefined'&&playerName)?playerName:null,type:type,data:data||{},ts:Date.now()};
    getSessionToken().then(function(token){
        if(token){
            e.token=token;
            return _hmacSign(token,JSON.stringify(e.data)+e.ts).then(function(sig){if(sig)e.sig=sig;return e;});
        }
        return e;
    }).then(function(ev){
        try{
            if(navigator.onLine!==false){
                fetch(METRIC_URL+'/event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(ev),keepalive:true}).catch(function(){queueMetric(ev);});
            }else{queueMetric(ev);}
        }catch(err){queueMetric(ev);}
    });
}
function queueMetric(e){
    try{
        var q=JSON.parse(localStorage.getItem('ndj_mq')||'[]');
        q.push(e);
        if(q.length>500)q=q.slice(-500);
        localStorage.setItem('ndj_mq',JSON.stringify(q));
    }catch(err){}
}
function flushMetricQueue(){
    if(!METRIC_URL)return;
    try{
        var q=JSON.parse(localStorage.getItem('ndj_mq')||'[]');
        if(!q.length)return;
        fetch(METRIC_URL+'/events/batch',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({events:q,offline:true}),keepalive:true}).then(function(r){
            if(r&&r.ok)localStorage.setItem('ndj_mq','[]');
        }).catch(function(){});
    }catch(err){}
}
window.addEventListener('online',flushMetricQueue);
// Try flushing on load too
setTimeout(flushMetricQueue,3000);
// Heartbeat every 90s for online count (only when page visible AND named)
var HEARTBEAT_INTERVAL = 90;
setInterval(function(){
    if(typeof playerName!=='undefined'&&playerName&&document.visibilityState==='visible')sendMetric('heartbeat',{inGame:typeof gameRunning!=='undefined'&&gameRunning,level:typeof curLvl!=='undefined'?curLvl:null,interval:HEARTBEAT_INTERVAL});
},HEARTBEAT_INTERVAL*1000);
// Session start sender — deferred until name is known to avoid (anon) noise
var _sessionStartSent = false;
function sendSessionStart(){
    if(_sessionStartSent)return;
    _sessionStartSent = true;
    var displayMode = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true ? 'standalone' : 'browser';
    var pwaSupported = ('serviceWorker' in navigator);
    var installedAt = parseInt(load('pwaInstalledAt', 0), 10) || null;
    sendMetric('session_start',{
        ua:navigator.userAgent.slice(0,120),
        lang:navigator.language,
        scr:screen.width+'x'+screen.height,
        display:displayMode,
        pwa:pwaSupported?'supported':'unsupported',
        installed_at:installedAt
    });
}
// PWA install lifecycle tracking
var _pwaInstallEvent = null;
window.addEventListener('beforeinstallprompt', function(e){
    e.preventDefault();
    _pwaInstallEvent = e;
    sendMetric('ui_event',{action:'pwa_prompt_shown'});
    var btn = $('pwaInstallBtn'); if(btn) btn.style.display = 'inline-block';
});
window.addEventListener('appinstalled', function(){
    save('pwaInstalledAt', Date.now());
    sendMetric('ui_event',{action:'pwa_appinstalled'});
});
function triggerPwaInstall(){
    if(!_pwaInstallEvent) return;
    _pwaInstallEvent.prompt();
    _pwaInstallEvent.userChoice.then(function(c){
        sendMetric('ui_event',{action: c.outcome==='accepted' ? 'pwa_install_accepted' : 'pwa_install_dismissed'});
        _pwaInstallEvent = null;
    });
}
window.triggerPwaInstall = triggerPwaInstall;

// Helper to calculate Max Gems for any level
function getMaxChips(lvlIdx) {
    var lv = LEVELS[lvlIdx];
    var cMax = 0;
    for(var j=0; j<lv.plats; j++) { if(j>2 && j%3===0 && j>=lv.move) cMax++; }
    return cMax;
}

function cleanNumber(v,d){v=Number(v);return Number.isFinite(v)?v:d;}
function normalizeUnlocked(v){
    if(!Array.isArray(v)) return [0,1];
    var seen={},out=[];
    for(var i=0;i<v.length;i++){
        var idx=Math.floor(cleanNumber(v[i],-1));
        if(idx>=0&&idx<LEVELS.length&&!seen[idx]){seen[idx]=true;out.push(idx);}
    }
    return out.length?out:[0,1];
}
function normalizeGlobalData(v){
    v=v&&typeof v==='object'?v:{};
    return {
        timePlayed: Math.max(0,cleanNumber(v.timePlayed,0)),
        matches: Math.max(0,cleanNumber(v.matches,0)),
        deadFall: Math.max(0,cleanNumber(v.deadFall,0)),
        deadSpike: Math.max(0,cleanNumber(v.deadSpike,0)),
        deadLaser: Math.max(0,cleanNumber(v.deadLaser,0))
    };
}
function normalizeLevelStat(v){
    v=v&&typeof v==='object'?v:{};
    var hazards=cleanNumber(v.hazards,cleanNumber(v.deaths,cleanNumber(v.falls,0)));
    return {
        attempts: Math.max(0,cleanNumber(v.attempts,0)),
        completions: Math.max(0,cleanNumber(v.completions,0)),
        hazards: Math.max(0,hazards),
        first: !!v.first,
        timePlayed: Math.max(0,cleanNumber(v.timePlayed,0)),
        silver: Math.max(0,cleanNumber(v.silver,0)),
        contentVersion: Math.max(0,cleanNumber(v.contentVersion,0)),
        masterGems: Array.isArray(v.masterGems)?v.masterGems.slice():[]
    };
}
function normalizeLevelStats(v){
    var out={};
    if(v&&typeof v==='object'){
        for(var k in v){
            var idx=Math.floor(cleanNumber(k,-1));
            if(idx>=0&&idx<LEVELS.length) out[idx]=normalizeLevelStat(v[k]);
        }
    }
    return out;
}
function normalizeBestChips(v){
    var out={};
    if(v&&typeof v==='object'){
        for(var k in v){
            var idx=Math.floor(cleanNumber(k,-1));
            if(idx<0||idx>=LEVELS.length) continue;
            var maxGems=getMaxChips(idx),src=v[k],arr=[];
            if(Array.isArray(src)){
                for(var i=0;i<maxGems;i++) arr[i]=!!src[i];
            }else if(typeof src==='number'){
                for(var j=0;j<maxGems;j++) arr[j]=j<src;
            }
            out[idx]=arr;
        }
    }
    return out;
}
function normalizeNumberMap(v){
    var out={};
    if(v&&typeof v==='object'){
        for(var k in v){
            var idx=Math.floor(cleanNumber(k,-1));
            var n=cleanNumber(v[k],NaN);
            if(idx>=0&&idx<LEVELS.length&&Number.isFinite(n)&&n>=0) out[idx]=n;
        }
    }
    return out;
}

var unlocked=normalizeUnlocked(load('unlocked',[0,1]));
var bestScores=normalizeNumberMap(load('scores',{}));
var bestTimes=normalizeNumberMap(load('times',{}));
// v1.1.8 migration: pack sparse bestChips before normalize destroys high indices.
// Old format had gold-chip trues at sparse positions (0, 4, 8, ...) due to silver arcs in between.
// New format is packed (0..maxGems-1). Also strips master/daily kind chips that may have leaked TRUE.
(function migratePackBestChips(){
    var raw = load('chips', {});
    var changed = false;
    for (var k in raw) {
        var arr = raw[k];
        if (!Array.isArray(arr)) continue;
        var trueCount = 0;
        for (var j = 0; j < arr.length; j++) if (arr[j]) trueCount++;
        if (trueCount === 0) continue;
        var idx = parseInt(k);
        var maxGems = (idx >= 0 && idx < LEVELS.length) ? getMaxChips(idx) : trueCount;
        // Build packed array: first N entries true (where N = min(trueCount, maxGems))
        var packed = [];
        var n = Math.min(trueCount, maxGems);
        for (var i = 0; i < n; i++) packed.push(true);
        // Detect if already packed correctly (all trues at start of array, length <= maxGems)
        var alreadyPacked = arr.length <= maxGems;
        if (alreadyPacked) {
            for (var i = 0; i < arr.length; i++) {
                if (!arr[i] && i < trueCount) { alreadyPacked = false; break; }
            }
        }
        if (!alreadyPacked) { raw[k] = packed; changed = true; }
    }
    if (changed) save('chips', raw);
})();
var bestChips=normalizeBestChips(load('chips',{}));
save('unlocked', unlocked);
save('scores', bestScores);
save('times', bestTimes);
save('chips', bestChips);

var levelStats=normalizeLevelStats(load('stats',{}));
save('stats', levelStats);
var silverWallet=Math.max(0,cleanNumber(load('silver', 0),0));
var playerName=load('playerName','');
// If returning user already has a name, send session_start now
if(playerName) sendSessionStart();
save('silver', silverWallet);
var SKILLS=[{id:'airdash',name:'Air Dash',icon:'\ud83d\udca8',desc:'Horizontal burst mid-air',preview:'Tap dash mid-air to rocket forward \u2014 cross gaps instantly',cost:18},{id:'phasedash',name:'Clipping',icon:'\ud83c\udf00',desc:'Phase through one hazard per run',preview:'Once per run, ignore the first hazard hit (spike or laser) with a purple phase effect and 0.75s invuln. Falls still kill you.',cost:22},{id:'resurrect',name:'Auto Resurrect',icon:'\u2764\ufe0f',desc:'Respawn at last platform (2min CD)',preview:'On death, rewind to your last safe platform instead of restarting',cost:22},{id:'coyote',name:'Coyote Boost',icon:'\ud83d\udc3e',desc:'Extended ledge-jump grace',preview:'Doubles the time you can jump after running off a ledge \u2014 forgiveness skill',cost:10},{id:'magnet',name:'Magnet',icon:'\ud83e\uddf2',desc:'Auto-collect nearby gems',preview:'All gems within range auto-fly to you (silver and gold) \u2014 great for combo runs',cost:20},{id:'wallslide',name:'Platform Bounce',icon:'\ud83e\udea9',desc:'Bounce off platform sides',preview:'Hit a platform side mid-air? Get launched back instead of falling \u2014 a save mechanic for tough jumps',cost:22},{id:'slowfall',name:'Slow Fall',icon:'\ud83e\ude82',desc:'Hold jump to halve fall speed',preview:'Hold jump while falling to glide gently \u2014 land with precision. Permanent skill.',cost:30}];
var COSMETICS=[{id:'trail_cyan',name:'Trail: Cyan',icon:'\u2728',cat:'trail',tier:'common',cost:30,preview:'Cool cyan afterimages follow your movement'},{id:'trail_fire',name:'Trail: Fire',icon:'\ud83d\udd25',cat:'trail',tier:'common',cost:40,preview:'Blazing orange-red trail burns behind you'},{id:'trail_ice',name:'Trail: Ice',icon:'\u2744\ufe0f',cat:'trail',tier:'common',cost:40,preview:'Frosty blue crystals shimmer in your wake'},{id:'jump_sparks',name:'Jump: Sparks',icon:'\u26a1',cat:'jump',tier:'common',cost:50,preview:'Yellow electric sparks burst on every jump'},{id:'glow_gold',name:'Glow: Gold',icon:'\ud83d\udcab',cat:'glow',tier:'uncommon',cost:80,preview:'Golden aura radiates around your character'},{id:'glow_pink',name:'Glow: Pink',icon:'\ud83c\udf38',cat:'glow',tier:'uncommon',cost:80,preview:'Soft pink neon glow surrounds you'},{id:'death_pixel',name:'Death: Pixelate',icon:'\ud83d\udfeb',cat:'death',tier:'uncommon',cost:120,preview:'Shatter into chunky pixel blocks on death'},{id:'death_dissolve',name:'Death: Dissolve',icon:'\ud83c\udf2c\ufe0f',cat:'death',tier:'uncommon',cost:150,preview:'Fade into floating particles that drift upward'},{id:'jump_lightning',name:'Jump: Lightning',icon:'\u26a1',cat:'jump',tier:'rare',cost:250,preview:'Blue lightning bolts crack beneath your feet'},{id:'trail_rainbow',name:'Trail: Rainbow',icon:'\ud83c\udf08',cat:'trail',tier:'rare',cost:300,preview:'Cycling rainbow colors flow behind you'},{id:'death_supernova',name:'Death: Supernova',icon:'\ud83d\udca5',cat:'death',tier:'rare',cost:400,preview:'Massive explosion ring + shower of star particles'},{id:'glow_rainbow',name:'Glow: Rainbow',icon:'\ud83c\udf1f',cat:'glow',tier:'legendary',cost:800,preview:'Continuously cycling rainbow aura \u2014 mesmerizing'},{id:'trail_glitch',name:'Trail: Glitch',icon:'\ud83d\udcdf',cat:'trail',tier:'legendary',cost:1000,preview:'Flickering digital artifacts and static trail'},{id:'death_logo',name:'Death: Logo Shatter',icon:'\ud83c\udfae',cat:'death',tier:'legendary',cost:1200,preview:'Particles briefly form N30N before dispersing'},{id:'plat_holo',name:'Platform: Hologram',icon:'\ud83d\udd73\ufe0f',cat:'platform',tier:'legendary',cost:1500,preview:'All platforms render as flickering holograms'},{id:'hat_tophat',name:'Top Hat',icon:'\ud83c\udfa9',cat:'hat',tier:'common',cost:35,preview:'A classy black top hat on your head'},{id:'hat_horns',name:'Horns',icon:'\ud83d\ude08',cat:'hat',tier:'uncommon',cost:90,preview:'Devilish red horns sprout from your head'},{id:'hat_catears',name:'Cat Ears',icon:'\ud83d\udc31',cat:'hat',tier:'uncommon',cost:100,preview:'Cute pointy cat ears on top'},{id:'hat_crown',name:'Crown',icon:'\ud83d\udc51',cat:'hat',tier:'rare',cost:300,preview:'A golden crown fit for a neon king'},{id:'hat_halo',name:'Halo',icon:'\ud83d\ude07',cat:'hat',tier:'rare',cost:250,preview:'A glowing ring floats above your head'},{id:'hat_antenna',name:'Antenna',icon:'\ud83e\udd16',cat:'hat',tier:'legendary',cost:600,preview:'A bobbing robot antenna with glowing tip'},{id:'cape_white',name:'Cape: White',icon:'\ud83e\udde3',cat:'cape',tier:'common',cost:40,preview:'A short white cape flows behind you'},{id:'cape_red',name:'Cape: Red',icon:'\ud83e\udde3',cat:'cape',tier:'uncommon',cost:80,preview:'A heroic red cape billows as you run'},{id:'cape_rainbow',name:'Cape: Rainbow',icon:'\ud83c\udf08',cat:'cape',tier:'rare',cost:350,preview:'A shimmering rainbow cape trails behind'},{id:'cape_fire',name:'Cape: Fire',icon:'\ud83d\udd25',cat:'cape',tier:'legendary',cost:700,preview:'A blazing fire cape with flickering flames'},{id:'body_gold',name:'Body: Gold',icon:'\u2b50',cat:'body',tier:'uncommon',cost:100,preview:'Your stickman glows solid gold'},{id:'body_pink',name:'Body: Pink',icon:'\ud83c\udf38',cat:'body',tier:'uncommon',cost:100,preview:'A vibrant pink neon body color'},{id:'body_black',name:'Body: Black',icon:'\u26ab',cat:'body',tier:'common',cost:30,preview:'Sleek black body \u2014 contrasts beautifully with neon glow'},{id:'body_rainbow',name:'Body: Rainbow',icon:'\ud83c\udf08',cat:'body',tier:'legendary',cost:900,preview:'Your body cycles through all rainbow colors'},{id:'glow_champion',name:'Champion\'s Aura',icon:'\u2728',cat:'glow',tier:'master',cost:0,champion:true,preview:'Pulsing gold halo with ascending sparks \u2014 the aura of a master'}];
var CONSUMABLES=[{id:'triplejump',name:'Triple Jump',icon:'\u2b06\ufe0f',desc:'3rd jump mid-air (15s CD)',cost:10,preview:'After double jump, jump once more! Recharges every 15 seconds'},{id:'dblshield',name:'Double Shield',icon:'\ud83d\udee1\ufe0f',desc:'Absorb 2 hits this run',cost:15,preview:'Two layers of protection \u2014 survive two hits before dying'},{id:'timefreeze',name:'Time Freeze',icon:'\u23f8\ufe0f',desc:'Freeze hazards 10s (60s CD)',cost:12,preview:'Tap the \u23f8 button to freeze lasers and moving platforms'},{id:'namechange',name:'Name Change',icon:'\u270f\ufe0f',desc:'Change your player name',cost:50,preview:'Pick a new name (5-10 chars, alphanumeric)'},{id:'streakfreeze',name:'Streak Freeze',icon:'\ud83e\uddca',desc:'Protect streak for 1 missed day',cost:10,preview:'If you miss a day, your streak is preserved. Max 2 in inventory.'}];
var goldSpent=load('goldSpent',0);
var bonusGold=load('bonusGold',0); // accumulated gold from master gems + daily champion bonus (separate from chips)
var ownedSkills=load('ownedSkills',[]);
var equippedSkills=load('equippedSkills',[]);
var championStatus=load('championStatus',{unlocked:false,ceremonyShown:false,unlockedAt:0});
var reflexDashEnabled=load('reflexDashEnabled',true); // champion toggle for Reflex Dash; auto-disabled when Air Dash is equipped or sold
// v1.1.5 migration: Reflex Dash is now champion-only (auto), refund prior purchases
(function migrateReflexDash(){
    var refundIdx=ownedSkills.indexOf('reflexdash');
    if(refundIdx>=0){
        ownedSkills.splice(refundIdx,1);
        save('ownedSkills',ownedSkills);
        var goldSpent=load('goldSpent',0);
        goldSpent=Math.max(0, goldSpent-12);
        save('goldSpent',goldSpent);
    }
    var eqIdx=equippedSkills.indexOf('reflexdash');
    if(eqIdx>=0){
        equippedSkills.splice(eqIdx,1);
        save('equippedSkills',equippedSkills);
    }
})();
function checkChampionStatus(){
    var allCleared = LEVELS.length>0;
    for(var i=0;i<LEVELS.length;i++){
        if(!levelStats[i] || !levelStats[i].completions || levelStats[i].completions<=0){allCleared=false;break;}
    }
    if(allCleared && !championStatus.unlocked){
        championStatus.unlocked = true;
        championStatus.unlockedAt = Date.now();
        if(ownedCosmetics.indexOf('glow_champion')<0){ownedCosmetics.push('glow_champion');save('ownedCosmetics',ownedCosmetics);}
        equippedCosmetics.glow='glow_champion';save('equippedCosmetics',equippedCosmetics);
        save('championStatus',championStatus);
        return true;
    }
    return false;
}
function silverGainAmt(){return championStatus.unlocked?(Math.random()<0.5?2:1):1;}
function getDisplayName(){return playerName||'';}
// Migration: refund and remove obsolete skills (shield, slowfall, timefreeze moved to consumables)
var _migRefund=0;
['shield','timefreeze'].forEach(function(rid){var ridx=ownedSkills.indexOf(rid);if(ridx>=0){ownedSkills.splice(ridx,1);if(rid==='shield')_migRefund+=10;else if(rid==='timefreeze')_migRefund+=20;}var eidx=equippedSkills.indexOf(rid);if(eidx>=0)equippedSkills.splice(eidx,1);});
// Ghost Rival is now free — refund anyone who paid for it
var _ghostIdx=ownedSkills.indexOf('ghost');
if(_ghostIdx>=0){ownedSkills.splice(_ghostIdx,1);_migRefund+=15;}
var _eGhostIdx=equippedSkills.indexOf('ghost');
if(_eGhostIdx>=0)equippedSkills.splice(_eGhostIdx,1);
if(_migRefund>0){goldSpent=Math.max(0,goldSpent-_migRefund);save('goldSpent',goldSpent);save('ownedSkills',ownedSkills);save('equippedSkills',equippedSkills);}
var ownedCosmetics=load('ownedCosmetics',[]);
var equippedCosmetics=load('equippedCosmetics',{trail:null,glow:null,death:null,jump:null,platform:null,hat:null,cape:null,body:null});
// Migrate body_white → body_black (renamed in v1.1.1)
var _bwIdx=ownedCosmetics.indexOf('body_white');
if(_bwIdx>=0){ownedCosmetics.splice(_bwIdx,1);if(ownedCosmetics.indexOf('body_black')<0)ownedCosmetics.push('body_black');save('ownedCosmetics',ownedCosmetics);}
if(equippedCosmetics.body==='body_white'){equippedCosmetics.body='body_black';save('equippedCosmetics',equippedCosmetics);}
if(!equippedCosmetics.hat)equippedCosmetics.hat=null;if(!equippedCosmetics.cape)equippedCosmetics.cape=null;if(!equippedCosmetics.body)equippedCosmetics.body=null;
var consumableInv=load('consumableInv',{});
if(consumableInv.timefreeze){consumableInv.triplejump=(consumableInv.triplejump||0)+consumableInv.timefreeze;delete consumableInv.timefreeze;save('consumableInv',consumableInv);}
var lastResurrectTime=load('lastResurrect',0);
var ghostData=load('ghostData',{});
var lastChestClaim=load('lastChest',0);
var hintsSeen=load('hintsSeen',0);
// Layout version migration — wipe stats & ghosts for indexes 8+ when level layout changes
var _storedLayout=load('layoutVersion',0);
if(_storedLayout<LAYOUT_VERSION){
    for(var k in bestScores)if(parseInt(k)>=8)delete bestScores[k];
    for(var k in bestTimes)if(parseInt(k)>=8)delete bestTimes[k];
    for(var k in bestChips)if(parseInt(k)>=8)delete bestChips[k];
    for(var k in levelStats)if(parseInt(k)>=8)delete levelStats[k];
    if(Array.isArray(unlocked))unlocked=unlocked.filter(function(i){return i<8;});
    ghostData={};
    save('scores',bestScores);save('times',bestTimes);save('chips',bestChips);save('stats',levelStats);
    save('unlocked',unlocked);save('ghostData',ghostData);
    save('layoutVersion',LAYOUT_VERSION);
}
// Stage content version migration — wipes ghosts for affected stages, marks them as needing replay (UPDATED badge)
var _storedContent=load('stageContentVersion',0);
if(_storedContent<STAGE_CONTENT_VERSION){
    for(var ci=STAGE_CONTENT_AFFECTS_FROM_LVL;ci<LEVELS.length;ci++){
        if(ghostData[ci])delete ghostData[ci];
        // Don't wipe completions/scores/times — keep achievement
    }
    save('ghostData',ghostData);
    save('stageContentVersion',STAGE_CONTENT_VERSION);
}
function getTotalGoldEarned(){var t=0;for(var i=0;i<LEVELS.length;i++){var c=bestChips[i]||[];for(var j=0;j<c.length;j++)if(c[j])t++;}return t;}
function getOwnedSkillsCost(){var t=0;for(var i=0;i<ownedSkills.length;i++){var s=SKILLS.find(function(x){return x.id===ownedSkills[i];});if(s)t+=s.cost;}return t;}
function getGoldBalance(){
    var earned = getTotalGoldEarned() + (bonusGold||0);
    var spent = goldSpent;
    // Self-heal: if goldSpent went out of sync (e.g. corrupt save), recompute from owned skills
    var ownedCost = getOwnedSkillsCost();
    if(spent < 0 || spent > earned + ownedCost){
        spent = ownedCost;
        goldSpent = ownedCost;
        save('goldSpent', goldSpent);
    }
    return Math.max(0, earned - spent);
}
function gravLabel(g){return g<=0.55?'Low Gravity':g>=0.65?'Heavy Gravity':'Normal Gravity';}
function showNpcAdvice(th, lv){
    var msg=null,icon='\ud83d\udcdc'; // scroll icon default
    // First two stages: tutorial reminder
    if(curLvl===0||curLvl===1){msg='TIP: Tap jump twice in mid-air for a double-jump (3-second cooldown between).';icon='\u2b06\ufe0f';}
    else if(th.grav>=0.65){msg='WARNING: HIGH GRAVITY. Patience and double-jump are recommended. Godspeed.';icon='\ud83c\udf0c';}
    else if(th.grav<=0.55){msg='LOW GRAVITY. Floating jumps. Patience tames the height.';icon='\u2728';}
    else if(th.fric<=0.8){msg='SLIPPERY GROUND. Ease into stops or you will overshoot. Stay light.';icon='\u2744\ufe0f';}
    else if(th.weather==='storm'&&lv&&lv.diff!=='STARTER'&&lv.diff!=='SIMPLE'){msg='STORM. Lightning strikes. Slick surfaces. Stay sharp.';icon='\u26c8\ufe0f';}
    else if(th.weather==='dust'&&lv&&lv.diff!=='STARTER'&&lv.diff!=='SIMPLE'){msg='DUST STORM. Visibility limited. Trust your rhythm.';icon='\ud83c\udf2c\ufe0f';}
    if(!msg)return;
    var el=$('npcAdvice');if(!el)return;
    el.innerHTML='<span class="npc-icon">'+icon+'</span><span class="npc-msg">'+msg+'</span>';
    el.classList.add('active');
    if(W._npcAdviceTimer)clearTimeout(W._npcAdviceTimer);
    W._npcAdviceTimer=setTimeout(function(){
        el.classList.remove('active');
        setTimeout(function(){el.style.display='';},700);
    }, 4500);
}
function fricLabel(f){return f<=0.8?'Slippery':f>=0.88?'Grippy':'Normal Friction';}
function isGhostUnlocked(){
    var s0=levelStats[0]&&levelStats[0].completions>0;
    var s1=levelStats[1]&&levelStats[1].completions>0;
    return s0&&s1;
}
function hasSkill(id){
    if(id==='ghost')return ghostsEnabled&&isGhostUnlocked();
    if(id==='reflexdash')return championStatus.unlocked && reflexDashEnabled;
    if(id==='airdash')return equippedSkills.indexOf('airdash')>=0||(championStatus.unlocked && reflexDashEnabled);
    return equippedSkills.indexOf(id)>=0;
}
var globalData=normalizeGlobalData(load('globalData', {}));
save('globalData', globalData);
// v1.1.5 migration: replays previously incremented levelStats[i].completions and globalData.matches.
// Cap completions at attempts (impossible to complete more times than you started) and recompute matches.
// Also: if a level has 0 legit completions after capping, scrub any stale bestTimes/bestChips/ghostData.
(function migrateReplayInflation(){
    var totalAttempts=0, statsChanged=false, btChanged=false, bcChanged=false, gdChanged=false;
    for(var i=0;i<LEVELS.length;i++){
        var st=normalizeLevelStat(levelStats[i]);
        if(st.completions>st.attempts){st.completions=st.attempts;statsChanged=true;}
        levelStats[i]=st;
        totalAttempts+=st.attempts||0;
        if(st.completions===0){
            if(bestTimes[i]!=null){delete bestTimes[i];btChanged=true;}
            if(bestChips[i]!=null){delete bestChips[i];bcChanged=true;}
            if(ghostData[i]!=null){delete ghostData[i];gdChanged=true;}
        }
    }
    if(statsChanged)save('stats',levelStats);
    if(btChanged)save('times',bestTimes);
    if(bcChanged)save('chips',bestChips);
    if(gdChanged)save('ghostData',ghostData);
    if(globalData.matches>totalAttempts){
        globalData.matches=totalAttempts;
        save('globalData',globalData);
    }
})();
// v1.1.8 migration: retroactively credit bonusGold for master gems already collected,
// and self-heal goldSpent if it went negative from the old buggy code path.
(function migrateBonusGold(){
    var totalMasterCollected = 0;
    for(var i=0;i<LEVELS.length;i++){
        var st = levelStats[i];
        if(st && Array.isArray(st.masterGems)) totalMasterCollected += st.masterGems.length;
    }
    if(totalMasterCollected > 0 && bonusGold < totalMasterCollected * 2){
        bonusGold = Math.max(bonusGold, totalMasterCollected * 2);
        save('bonusGold', bonusGold);
    }
    if(goldSpent < 0){
        goldSpent = getOwnedSkillsCost();
        save('goldSpent', goldSpent);
    }
})();
var partMult=load('part',1);
var visualQuality=load('visualQuality','high');
var ghostsEnabled=load('ghostsEnabled',true);
var showFps=load('showFps',false);
// autoRetryDelay: 'none' = no auto retry (manual tap), '0' = instant, '0.5', '1', '2' (seconds)
var autoRetryDelay=load('autoRetryDelay', null);
if(autoRetryDelay===null){
    // Migration from v1.1.9: combine old autoRetry+deathScreenDelay into autoRetryDelay
    var _oldAR=load('autoRetry', false);
    var _oldDelay=load('deathScreenDelay', 2);
    autoRetryDelay = _oldAR ? String(_oldDelay) : 'none';
    save('autoRetryDelay', autoRetryDelay);
}
var qAtmosMult=1, qStarMult=1, qBgMult=1, qShadowMult=1;
function applyQuality(q){
    visualQuality=q;
    if(q==='low'){partMult=0.25;qAtmosMult=0.15;qStarMult=0.3;qBgMult=0.2;qShadowMult=0;}
    else if(q==='med'){partMult=0.6;qAtmosMult=0.5;qStarMult=0.7;qBgMult=0.7;qShadowMult=0.6;}
    else{partMult=1;qAtmosMult=1;qStarMult=1;qBgMult=1;qShadowMult=1;}
}
applyQuality(visualQuality);
function setQuality(q){applyQuality(q);save('visualQuality',q);save('part',partMult);qualityHinted=false;lowFpsAccum=0;if(typeof initStars==='function')initStars();if(typeof initBG==='function'&&theme)initBG();}
function setQualityConfirmed(q,sourceEl){
    if(q==='low' && visualQuality!=='low'){
        var msg='Set Visual to LOW?\n\nThis will also disable Ghost Replays (recording, playback, and the WATCH button) for better performance on lower-end devices.\n\nYou can re-enable ghosts manually in settings later.';
        if(!confirm(msg)){
            if(sourceEl)sourceEl.value=visualQuality;
            return;
        }
        ghostsEnabled=false;save('ghostsEnabled',ghostsEnabled);
        if($('setGhost'))$('setGhost').value='0';
    }
    setQuality(q);
}
// Per-orientation control layouts (separate persistence for portrait vs landscape)
var DEFAULT_CTRL_LAYOUT = {padX:20, padY:20, jSize:150, btnSize:80};
var ctrlLayouts = load('ctrlLayouts', null);
if(!ctrlLayouts || typeof ctrlLayouts!=='object'){
    // Migrate legacy single-orientation save (if any) into both layouts as starting point
    var legacy = {
        padX: cleanNumber(load('padX', 20), 20),
        padY: cleanNumber(load('padY', 20), 20),
        jSize: cleanNumber(load('jSize', 150), 150),
        btnSize: cleanNumber(load('btnSize', 80), 80)
    };
    ctrlLayouts = {portrait:Object.assign({},legacy), landscape:Object.assign({},legacy)};
    save('ctrlLayouts', ctrlLayouts);
}
function currentLayoutKey(){return W.innerWidth >= W.innerHeight ? 'landscape' : 'portrait';}
function loadCurrentCtrlLayout(){
    var key = currentLayoutKey();
    var layout = ctrlLayouts[key] || Object.assign({}, DEFAULT_CTRL_LAYOUT);
    padX = layout.padX; padY = layout.padY; jSize = layout.jSize; btnSize = layout.btnSize;
}
function saveCurrentCtrlLayout(){
    var key = currentLayoutKey();
    ctrlLayouts[key] = {padX:padX, padY:padY, jSize:jSize, btnSize:btnSize};
    save('ctrlLayouts', ctrlLayouts);
}
var jSize = 150;
var padX = 20;
var padY = 20;
var orient=load('orient','landscape');
if(orient!=='landscape'&&orient!=='portrait'){orient='landscape';save('orient',orient);}
var ctrlMode=load('ctrl','arrows');
var vibrateOn=load('vibrate',true);
var sfxOn=load('sfx',true);
var musOn=load('mus',true);
var lastPlayed=load('lastPlayed', null);

var RANKS = [
    {name: "Iron Spark", min: 0, color: "#aaa"},
    {name: "Bronze Node", min: 200, color: "#cd7f32"},
    {name: "Silver Circuit", min: 800, color: "#ccc"},
    {name: "Gold Dash", min: 2500, color: "#ffd700"},
    {name: "Neon Runner", min: 5500, color: "#0ff"},
    {name: "Cyber Legend", min: 9500, color: "#f0f"}
];

function getPlayerRankInfo() {
    var totalGold = 0;
    var levelsCleared = 0;
    for(var i=0; i<LEVELS.length; i++) {
        var cArr = bestChips[i] || [];
        for(var j=0; j<cArr.length; j++) if(cArr[j]) totalGold++;
        if(levelStats[i] && levelStats[i].completions > 0) levelsCleared++;
    }
    var clearPct = Math.floor((levelsCleared / LEVELS.length) * 100);
    var score = (totalGold * 50) + (silverWallet * 5) + (clearPct * 10) + (globalData.matches * 2);
    
    var curRank = RANKS[0], nextRank = RANKS[1];
    for(var i=0; i<RANKS.length; i++) {
        if(score >= RANKS[i].min) {
            curRank = RANKS[i];
            nextRank = RANKS[i+1] || null;
        }
    }
    return {score: score, current: curRank, next: nextRank, index: RANKS.indexOf(curRank)};
}

// === DAILY STAGE SYSTEM ===
var dailyStreak = load('dailyStreak', 0);
var lastStreakDay = load('lastStreakDay', '');
var streakFreezes = load('streakFreezes', 2);
var maxStreakFreezes = 2;

function getGameDayKey(){
    var d = new Date();
    var utc7 = new Date(d.getTime() + (7 * 60 * 60 * 1000));
    var h = utc7.getUTCHours();
    if(h < 5) utc7 = new Date(utc7.getTime() - 86400000);
    var y = utc7.getUTCFullYear();
    var m = String(utc7.getUTCMonth()+1).padStart(2,'0');
    var day = String(utc7.getUTCDate()).padStart(2,'0');
    return y + m + day + day + m + y;
}
function getGameDayShort(){
    return getGameDayKey().slice(0, 8);
}
function getPrevGameDay(){
    var d = new Date();
    var utc7 = new Date(d.getTime() + (7 * 60 * 60 * 1000));
    var h = utc7.getUTCHours();
    if(h < 5) utc7 = new Date(utc7.getTime() - 86400000);
    utc7 = new Date(utc7.getTime() - 86400000);
    var y = utc7.getUTCFullYear();
    var m = String(utc7.getUTCMonth()+1).padStart(2,'0');
    var day = String(utc7.getUTCDate()).padStart(2,'0');
    return y + m + day;
}
function updateStreak(){
    var today = getGameDayShort();
    if(lastStreakDay === today) return dailyStreak;
    var prev = getPrevGameDay();
    if(lastStreakDay === prev){
        dailyStreak++;
    } else {
        var daysMissed = 0;
        var last = lastStreakDay;
        if(last){
            var ly = parseInt(last.slice(0,4),10), lm = parseInt(last.slice(4,6),10)-1, ld = parseInt(last.slice(6,8),10);
            var ty = parseInt(today.slice(0,4),10), tm = parseInt(today.slice(4,6),10)-1, td = parseInt(today.slice(6,8),10);
            var lastDate = new Date(ly,lm,ld);
            var todayDate = new Date(ty,tm,td);
            daysMissed = Math.floor((todayDate - lastDate) / 86400000) - 1;
        } else {
            daysMissed = 999;
        }
        if(daysMissed <= 0){
            dailyStreak = 1;
        } else {
            var canSave = Math.min(daysMissed, streakFreezes);
            streakFreezes -= canSave;
            save('streakFreezes', streakFreezes);
            if(daysMissed <= canSave){
                dailyStreak++;
            } else {
                dailyStreak = 1;
            }
        }
    }
    lastStreakDay = today;
    save('dailyStreak', dailyStreak);
    save('lastStreakDay', lastStreakDay);
    return dailyStreak;
}
function getDailyStats(){
    var today = getGameDayShort();
    var saved = load('dailyStats', {day:'', played:false, completed:false, bestTime:null, deaths:0, reward:null});
    if(saved.day !== today) return {day:today, played:false, completed:false, bestTime:null, deaths:0, reward:null};
    return saved;
}
function saveDailyStats(stats){
    save('dailyStats', stats);
}

var DAILY_REWARD_TABLE = [
    {type:'gold', min:3, max:8, weight:20},
    {type:'silver', min:15, max:40, weight:30},
    {type:'consumable', id:'triplejump', weight:20},
    {type:'consumable', id:'dblshield', weight:20},
    {type:'streakFreeze', weight:10}
];
function rollDailyReward(){
    var total = 0;
    for(var i=0;i<DAILY_REWARD_TABLE.length;i++) total += DAILY_REWARD_TABLE[i].weight;
    var roll = Math.random() * total;
    var acc = 0;
    for(var i=0;i<DAILY_REWARD_TABLE.length;i++){
        acc += DAILY_REWARD_TABLE[i].weight;
        if(roll < acc) return DAILY_REWARD_TABLE[i];
    }
    return DAILY_REWARD_TABLE[0];
}
function generateDailyLevel(){
    var today = getGameDayKey();
    var ymd = today.slice(0, 8);
    var dmy = today.slice(8, 16);
    var mdy = today.slice(4, 6) + today.slice(2, 4) + ymd.slice(0, 4);
    
    var rankInfo = getPlayerRankInfo();
    var rankIdx = rankInfo.index;
    if(rankIdx < 0) rankIdx = 0;
    
    var s1 = ymd + rankIdx;
    var s2 = dmy + rankIdx;
    var s3 = mdy + rankIdx;
    
    var customTheme = buildDailyTheme(s1, s2, s3);
    
    var h2 = hashString(s2);
    var h3 = hashString(s3);
    
    var basePlats = 18 + (h2 % 14);
    var baseGapMin = 90 + (h2 % 20);
    var baseGapMax = 130 + (h2 % 60);
    var baseHc = 40 + (h3 % 70);
    var baseMove = h3 % 4;
    
    var plats = Math.max(15, basePlats + rankIdx * 2);
    var gapMin = Math.max(80, baseGapMin + rankIdx * 5);
    var gapMax = Math.max(gapMin + 20, baseGapMax + rankIdx * 8);
    var hc = Math.max(25, baseHc + rankIdx * 10);
    var move = Math.max(0, baseMove + Math.floor(rankIdx / 2));
    var diff = rankIdx < 2 ? 'SIMPLE' : rankIdx < 4 ? 'MODERATE' : 'HARD';
    
    return {
        name: 'DAILY STAGE',
        theme: -1,
        customTheme: customTheme,
        sc: 1,
        plats: plats,
        gaps: [gapMin, gapMax],
        hc: hc,
        move: move,
        diff: diff,
        reversed: true
    };
}

function applyDailyReward(reward){
    if(!reward) return '';
    if(reward.type === 'gold'){
        var amt = Math.floor(Math.random()*(reward.max-reward.min+1))+reward.min;
        bonusGold += amt; save('bonusGold', bonusGold);
        return '+'+amt+' ★ Gold';
    } else if(reward.type === 'silver'){
        var amt = Math.floor(Math.random()*(reward.max-reward.min+1))+reward.min;
        silverWallet += amt; save('silver', silverWallet);
        return '+'+amt+' ♦ Silver';
    } else if(reward.type === 'consumable'){
        consumableInv[reward.id] = (consumableInv[reward.id]||0)+1;
        save('consumableInv', consumableInv);
        return '+1 '+(reward.id==='triplejump'?'⬆️ Triple Jump':'🛡️ Double Shield');
    } else if(reward.type === 'streakFreeze'){
        streakFreezes = Math.min(maxStreakFreezes, streakFreezes+1);
        save('streakFreezes', streakFreezes);
        return '+1 🧊 Streak Freeze';
    }
    return '';
}

function showRankPopup() {
    var info = getPlayerRankInfo();
    var html = '<div style="text-align:left; width:100%; max-width:560px; margin:0 auto 15px auto;">';
    html += '<div style="text-align:center; font-size:1.5rem; font-weight:900; color:'+info.current.color+'; text-shadow:0 0 10px '+info.current.color+'; margin-bottom:15px; text-transform:uppercase;">'+info.current.name+'</div>';
    html += '<div class="rank-grid">';
    
    // Left column: rank tiers + progress
    html += '<div>';
    html += '<div style="font-size:0.75rem; color:#888; margin-bottom:10px; border-bottom:1px solid #333; padding-bottom:5px;">RANK TIERS</div>';
    RANKS.forEach(function(r) {
        var isCur = r.name === info.current.name;
        var opac = info.score >= r.min ? 1 : 0.3;
        html += '<div style="display:flex; justify-content:space-between; margin-bottom:6px; opacity:'+opac+'; font-size:0.8rem;">' +
            '<span style="color:'+(isCur ? r.color : '#ccc')+'; font-weight:'+(isCur ? 'bold' : 'normal')+';">'+(isCur ? '▶ ' : '')+r.name+'</span>' +
            '<span style="font-family:monospace; color:#888;">'+r.min+' pt</span>' +
        '</div>';
    });
    
    if (info.next) {
        var pct = Math.max(0, Math.min(100, Math.floor((info.score - info.current.min) / (info.next.min - info.current.min) * 100)));
        html += '<div style="margin-top:14px;">' +
            '<div style="font-size:0.6rem; color:#888; margin-bottom:4px; display:flex; justify-content:space-between;"><span>PROGRESS TO '+info.next.name.toUpperCase()+'</span> <span style="font-family:monospace;">'+info.score+' / '+info.next.min+'</span></div>' +
            '<div style="width:100%; background:#222; height:6px; border-radius:3px; overflow:hidden;"><div style="width:'+pct+'%; background:'+info.next.color+'; height:100%;"></div></div>' +
        '</div>';
    } else {
        html += '<div style="margin-top:14px; text-align:center; color:#0f8; font-weight:bold; font-size:0.8rem;">MAX RANK ACHIEVED!</div>';
    }
    html += '</div>';
    
    // Right column: how to earn points
    html += '<div>';
    html += '<div style="font-size:0.75rem; color:#888; margin-bottom:10px; border-bottom:1px solid #333; padding-bottom:5px;">HOW TO EARN POINTS</div>';
    html += '<div style="font-size:0.7rem; color:#aaa; line-height:1.8;">';
    html += '<div style="display:flex;justify-content:space-between;"><span>★ Gold Gem (first collect)</span><span style="color:#ffd700;font-family:monospace;">+50 pt</span></div>';
    html += '<div style="display:flex;justify-content:space-between;"><span>♦ Silver Coin (re-collect)</span><span style="color:#ccc;font-family:monospace;">+5 pt</span></div>';
    html += '<div style="display:flex;justify-content:space-between;"><span>🚩 Clear a Level (+5%)</span><span style="color:#0f8;font-family:monospace;">+50 pt</span></div>';
    html += '<div style="display:flex;justify-content:space-between;"><span>🎮 Each Match (win or die)</span><span style="color:#0af;font-family:monospace;">+2 pt</span></div>';
    html += '</div>';
    html += '</div>';
    
    html += '</div>'; // close rank-grid
    html += '</div>';

    var ov = $('overlay');
    $('ovTitle').textContent = 'PLAYER RANK';
    $('ovTitle').style.color = '#fff';
    $('ovMsg').innerHTML = html;
    $('ovBtn').style.display = 'none';
    $('ovBtnCancel').style.display = 'inline-block';
    $('ovBtnCancel').textContent = 'CLOSE';
    $('ovBtnCancel').onclick = function(){ ov.classList.remove('active'); };
    ov.classList.add('active');
}

// === SAVE EXPORT / IMPORT LOGIC ===
function simpleHash(str) {
    var hash = 5381;
    for (var i = 0; i < str.length; i++) hash = ((hash << 5) + hash) + str.charCodeAt(i);
    return (hash >>> 0).toString(16); 
}
function stringToHex(str) {
    var hex = '';
    for(var i=0; i<str.length; i++) hex += '' + str.charCodeAt(i).toString(16).padStart(2, '0');
    return hex;
}
function hexToString(hex) {
    var str = '';
    for (var i = 0; i < hex.length; i += 2) str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    return str;
}
var SAVE_CHECKSUM_SALT = "ndj-save-v1";

function buildSaveData(includeGhost){
    var saveData = { 
        v: GAME_VERSION, unlocked: unlocked, scores: bestScores, times: bestTimes, 
        chips: bestChips, stats: levelStats, lastPlayed: lastPlayed, 
        silver: silverWallet, globalData: globalData,
        goldSpent: goldSpent, ownedSkills: ownedSkills, equippedSkills: equippedSkills,
        ownedCosmetics: ownedCosmetics, equippedCosmetics: equippedCosmetics,
        consumableInv: consumableInv, playerName: playerName,
        lastChest: lastChestClaim, lastResurrect: lastResurrectTime,
        hintsSeen: hintsSeen,
        tutorialDone: load('tutorialDone',false), ctrlPicked: load('ctrlPicked',false),
        sfx: sfxOn, mus: musOn, part: partMult, ctrl: ctrlMode, vibrate: vibrateOn, orient: orient,
        championStatus: championStatus, visualQuality: visualQuality, ghostsEnabled: ghostsEnabled, showFps: showFps
    };
    if(includeGhost) saveData.ghostData = ghostData;
    return saveData;
}
function buildSaveCode(includeGhost){
    var jsonStr = JSON.stringify(buildSaveData(includeGhost));
    var hexData = stringToHex(jsonStr);
    var crc = simpleHash(jsonStr + SAVE_CHECKSUM_SALT);
    return "NDJ-" + hexData + "-" + crc;
}
function downloadSave(includeGhost){
    var code = buildSaveCode(includeGhost);
    var ts = new Date();
    var pad=function(n){return n<10?'0'+n:''+n;};
    var fname = 'ndj-save-'+ts.getFullYear()+pad(ts.getMonth()+1)+pad(ts.getDate())+'-'+pad(ts.getHours())+pad(ts.getMinutes())+(includeGhost?'-full':'')+'.txt';
    var blob = new Blob([code], {type:'text/plain'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = fname;
    document.body.appendChild(a); a.click();
    setTimeout(function(){ document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
}
function showExport() {
    $('settings').classList.remove('active');
    var ov=$('overlay');
    var sizeFull = buildSaveCode(true).length;
    var sizeLight = buildSaveCode(false).length;
    var fmt=function(n){return n>1024?(n/1024).toFixed(1)+' KB':n+' B';};
    
    $('ovTitle').textContent='EXPORT PROGRESS';
    $('ovTitle').style.color='#0ff';
    $('ovMsg').innerHTML=
        '<div style="margin-bottom:12px;font-size:0.85rem;">Save your progress to a file. You can transfer it to another device.</div>'+
        '<label style="display:flex;align-items:center;gap:8px;justify-content:center;font-size:0.8rem;cursor:pointer;background:#111;padding:10px;border-radius:8px;border:1px solid #333;">'+
        '  <input type="checkbox" id="expIncGhost" style="width:16px;height:16px;cursor:pointer;">'+
        '  <span>Include 👻 ghost replays</span>'+
        '</label>'+
        '<div id="expSizeInfo" style="margin-top:8px;font-size:0.75rem;color:#888;">Size: '+fmt(sizeLight)+' (without ghosts) | '+fmt(sizeFull)+' (with ghosts)</div>'+
        '<div style="margin-top:14px;font-size:0.7rem;color:#666;">Two ways to save:</div>'+
        '<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;justify-content:center;">'+
        '  <button onclick="downloadSave($(\'expIncGhost\').checked)" style="background:linear-gradient(135deg,#0aa,#055);padding:10px 18px;font-size:0.8rem;">⬇ DOWNLOAD FILE</button>'+
        '  <button onclick="copyExportToClipboard()" style="background:linear-gradient(135deg,#055,#022);padding:10px 18px;font-size:0.8rem;">📋 COPY CODE</button>'+
        '</div>'+
        '<div id="expFeedback" style="margin-top:10px;font-size:0.8rem;color:#0f8;min-height:1.2em;"></div>';
    
    $('ovBtn').style.display='none';
    $('ovBtnExtra').style.display='none';
    $('ovBtnReplay').style.display='none';
    $('ovBtnCancel').style.display='inline-block';
    $('ovBtnCancel').textContent='CLOSE';
    $('ovBtnCancel').style.background='linear-gradient(135deg,#555,#333)';
    $('ovBtnCancel').onclick=function(){ ov.classList.remove('active'); $('settings').classList.add('active'); };
    ov.classList.add('active');
}
function copyExportToClipboard(){
    var inc = $('expIncGhost') && $('expIncGhost').checked;
    var code = buildSaveCode(inc);
    var done=function(){ $('expFeedback').textContent='✓ Copied to clipboard ('+code.length+' chars)'; setTimeout(function(){var f=$('expFeedback');if(f)f.textContent='';},3000); };
    if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(code).then(done, function(){
        var ta=document.createElement('textarea');ta.value=code;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);done();
    });} else {
        var ta=document.createElement('textarea');ta.value=code;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);done();
    }
}

function applyImportCode(code, ov){
    code = (code||'').trim().replace(/\s+/g,'');
    if (!code.startsWith("NDJ-")) throw "Invalid Save Format (Must start with NDJ-)";
    var parts = code.split("-");
    if (parts.length !== 3) throw "Corrupted Data (Missing Code Parts)";
    var hexData = parts[1], crc = parts[2];
    var jsonStr = hexToString(hexData);
    
    if (simpleHash(jsonStr + SAVE_CHECKSUM_SALT) !== crc) throw "Checksum Mismatch (Data Modified or Incomplete)";
    
    var parsed = JSON.parse(jsonStr);
    if (parsed.v > GAME_VERSION) throw "Save file is from a newer, incompatible version.";
    
    unlocked = normalizeUnlocked(parsed.unlocked);
    bestScores = normalizeNumberMap(parsed.scores);
    bestTimes = normalizeNumberMap(parsed.times);
    bestChips = normalizeBestChips(parsed.chips);
    levelStats = normalizeLevelStats(parsed.stats);
    lastPlayed = (parsed.lastPlayed===null||parsed.lastPlayed===undefined) ? null : cleanNumber(parsed.lastPlayed,null);
    if(lastPlayed!==null){lastPlayed=Math.floor(lastPlayed);if(lastPlayed<0||lastPlayed>=LEVELS.length)lastPlayed=null;}
    silverWallet = Math.max(0,cleanNumber(parsed.silver,0));
    globalData = normalizeGlobalData(parsed.globalData);
    goldSpent = Math.max(0,cleanNumber(parsed.goldSpent,0));
    ownedSkills = Array.isArray(parsed.ownedSkills) ? parsed.ownedSkills : [];
    equippedSkills = Array.isArray(parsed.equippedSkills) ? parsed.equippedSkills.slice(0,3) : [];
    ownedCosmetics = Array.isArray(parsed.ownedCosmetics) ? parsed.ownedCosmetics : [];
    equippedCosmetics = parsed.equippedCosmetics && typeof parsed.equippedCosmetics==='object' ? parsed.equippedCosmetics : {trail:null,glow:null,death:null,jump:null,platform:null,hat:null,cape:null,body:null};
    consumableInv = parsed.consumableInv && typeof parsed.consumableInv==='object' ? parsed.consumableInv : {};
    
    if(parsed.playerName&&typeof parsed.playerName==='string'){playerName=parsed.playerName.replace(/[^a-zA-Z0-9]/g,'').slice(0,10).toUpperCase();save('playerName',playerName);}
    
    if(typeof parsed.lastChest==='number'){lastChestClaim=parsed.lastChest;save('lastChest',lastChestClaim);}
    if(typeof parsed.lastResurrect==='number'){lastResurrectTime=parsed.lastResurrect;save('lastResurrect',lastResurrectTime);}
    if(parsed.ghostData&&typeof parsed.ghostData==='object'){ghostData=parsed.ghostData;save('ghostData',ghostData);}
    if(typeof parsed.hintsSeen==='number'){hintsSeen=parsed.hintsSeen;save('hintsSeen',hintsSeen);}
    if(parsed.tutorialDone)save('tutorialDone',true);
    if(parsed.ctrlPicked)save('ctrlPicked',true);
    if(typeof parsed.sfx==='boolean'){sfxOn=parsed.sfx;save('sfx',sfxOn);}
    if(typeof parsed.mus==='boolean'){musOn=parsed.mus;save('mus',musOn);}
    if(typeof parsed.part==='number'){partMult=parsed.part;save('part',partMult);}
    if(typeof parsed.ctrl==='string'){ctrlMode=parsed.ctrl;save('ctrl',ctrlMode);}
    if(typeof parsed.vibrate==='boolean'){vibrateOn=parsed.vibrate;save('vibrate',vibrateOn);}
    if(typeof parsed.orient==='string'){orient=(parsed.orient==='portrait')?'portrait':'landscape';save('orient',orient);}
    if(parsed.championStatus&&typeof parsed.championStatus==='object'){championStatus={unlocked:!!parsed.championStatus.unlocked,ceremonyShown:!!parsed.championStatus.ceremonyShown,unlockedAt:cleanNumber(parsed.championStatus.unlockedAt,0)};save('championStatus',championStatus);}
    if(typeof parsed.visualQuality==='string'){applyQuality(parsed.visualQuality);save('visualQuality',visualQuality);}
    if(typeof parsed.ghostsEnabled==='boolean'){ghostsEnabled=parsed.ghostsEnabled;save('ghostsEnabled',ghostsEnabled);}
    if(typeof parsed.showFps==='boolean'){showFps=parsed.showFps;save('showFps',showFps);}
    
    save('unlocked', unlocked); save('scores', bestScores); save('times', bestTimes); save('chips', bestChips); save('stats', levelStats); save('lastPlayed', lastPlayed); save('silver', silverWallet); save('globalData', globalData);
    save('goldSpent', goldSpent); save('ownedSkills', ownedSkills); save('equippedSkills', equippedSkills); save('ownedCosmetics', ownedCosmetics); save('equippedCosmetics', equippedCosmetics); save('consumableInv', consumableInv);
    
    $('ovTitle').textContent = "IMPORT SUCCESSFUL";
    $('ovTitle').style.color = "#0f8";
    $('ovMsg').innerHTML = "Your progress has been completely restored!";
    
    $('ovBtn').style.display = 'none';
    $('ovBtnExtra').style.display = 'none';
    $('ovBtnReplay').style.display = 'none';
    $('ovBtnCancel').style.display = 'inline-block';
    $('ovBtnCancel').textContent = 'AWESOME';
    $('ovBtnCancel').style.background='linear-gradient(135deg,#0f8,#0a5)';
    $('ovBtnCancel').onclick = function() {
        ov.classList.remove('active');
        initLevelSelect();
    };
}
function showImportError(e){
    $('ovTitle').textContent = "IMPORT FAILED";
    $('ovTitle').style.color = "#f05";
    $('ovMsg').innerHTML = "<div style='color:#f05; margin:10px 0; font-weight:bold;'>" + String(e).replace(/</g,'&lt;').replace(/>/g,'&gt;') + "</div>Please check the file or code and try again.";
}

function showImport() {
    $('settings').classList.remove('active');
    var ov=$('overlay');
    $('ovTitle').textContent='IMPORT PROGRESS';
    $('ovTitle').style.color='#fa0';
    $('ovMsg').innerHTML=
        '<div style="margin-bottom:10px;font-size:0.85rem;"><b style="color:#f05">⚠ THIS WILL OVERWRITE CURRENT PROGRESS!</b></div>'+
        '<div style="font-size:0.8rem;margin-bottom:6px;color:#aaa;">Choose your save file:</div>'+
        '<input type="file" id="importFileInput" accept=".txt,.ndj,text/plain" style="width:100%;padding:10px;background:#111;color:#fa0;border:1px solid #fa0;border-radius:8px;font-family:monospace;font-size:0.75rem;cursor:pointer;">'+
        '<div style="font-size:0.7rem;color:#666;margin:12px 0 6px;text-align:center;">— or paste code below —</div>'+
        '<textarea id="importCodeArea" style="width:100%;height:80px;background:#111;color:#fa0;border:1px solid #fa0;padding:8px;font-family:monospace;font-size:0.7rem;border-radius:8px;resize:none;" placeholder="NDJ-..."></textarea>';
    
    setTimeout(function(){
        var f=$('importFileInput'); if(!f) return;
        f.onchange=function(){
            var file=f.files&&f.files[0]; if(!file) return;
            var rdr=new FileReader();
            rdr.onload=function(){
                try{ applyImportCode(String(rdr.result), ov); }
                catch(e){ showImportError(e); }
            };
            rdr.onerror=function(){ showImportError('Could not read file'); };
            rdr.readAsText(file);
        };
    },50);
    
    $('ovBtn').style.display='inline-block';
    $('ovBtn').textContent='RESTORE FROM CODE';
    $('ovBtn').style.background='linear-gradient(135deg,#fa0,#d80)';
    $('ovBtn').onclick=function(){
        try{ applyImportCode($('importCodeArea').value, ov); }
        catch(e){ showImportError(e); }
    };
    $('ovBtnExtra').style.display='none';
    $('ovBtnReplay').style.display='none';
    $('ovBtnCancel').style.display='inline-block';
    $('ovBtnCancel').textContent='CANCEL';
    $('ovBtnCancel').style.background='linear-gradient(135deg,#555,#333)';
    $('ovBtnCancel').onclick=function(){ ov.classList.remove('active'); $('settings').classList.add('active'); };
    ov.classList.add('active');
}

// === STATE ===
var W=window,gameRunning=false,animId=null, frameCount=0;

var reduceMotion = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches;
var bootFinished = false;
var isPaused = false, pauseTime = 0;
var lastFrameTime=0, dt=1, DT_MAX=3;
var canvas=document.getElementById('gameCanvas'),ctx=canvas.getContext('2d');
var wCanvas=document.getElementById('weatherCanvas'),wCtx=wCanvas.getContext('2d');
var curLvl=0,deaths=0,deathBonusThreshold=0;
var isDailyStage=false;
var dailyLevelObj=null;
var lastDeathType='fall';
var runGold=0, runSilver=0, earnedSilver=0, lastRunSilver=0;
var stylePoints=0,comboCount=0,comboTimer=0,floatTexts=[];
var shieldUsed=false,shieldHits=0,dblshieldActivated=false,dblshieldUsed=false,shieldInvuln=0,airDashUsed=false,lastPlatPos={x:150,y:400},activeConsumable=null,triplejumpActivated=false,tripleJumpCD=0,runScore=0,timeFrozen=0,freezeCD=0,consumableTimefreeze=false,timefreezeUsed=false,phaseDashUsed=false;
var sessionCollectedChips=[],sessionStage=-1;
var ghostFrames=[],ghostIdx=0,ghostVisible=true,currentGhost=null,runUsedResurrect=false,_ghostTeleportFlag=false,replayMode=false,_replayEnded=false,_isFreshStageEntry=false;
var startTime=0, runTime=0;
var camX=0,camY=0,stars=[],bgShapes=[],atmosParts=[],dayNightStart=0,lightningStrikes=[],nextLightningT=0;
var player={x:150,y:300,w:22,h:48,vx:0,vy:0,og:false,face:1,at:0,dead:false,won:false,djU:false,djCD:0,djMax:180};
var capeAng=Math.PI*0.5,capeVel=0;
var pTrail=[]; 
var platforms=[],spikes=[],chips=[],lasers=[],ziplines=[],particles=[];
var wParts=[],wTimer=0,flash=0,deathFlash=0,gemFlash=0;
var hudDistDisplay=0;
var joy={a:false,sx:0,sy:0,cx:0,cy:0,dx:0,dy:0,mr:48};
var jumpP=false,jumpWP=false,jumpBuf=0;
var arrLeftP=false,arrRightP=false;
var theme=THEMES[0];
var coyoteT=0,coyoteMax=6,jumpOriginX=0,bounceLockT=0,resurrectFlash=0;
var goalX=0, fallLimitY=780;
var activeIdx = 0; 
var thumbAnimRefs = [];

// === UTILS ===
function $(id){return document.getElementById(id);}
function r(a,b){return a+Math.random()*(b-a);}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function hash(n,s){var x=Math.sin(n*s)*10000;return x-Math.floor(x);}
function cancelThumbAnimations(){
    for(var i=0;i<thumbAnimRefs.length;i++){
        if(thumbAnimRefs[i].id) cancelAnimationFrame(thumbAnimRefs[i].id);
    }
    thumbAnimRefs=[];
}

// === TEXT SCRAMBLER EFFECT ===
var scrambleIds = {};
function scrambleText(id, finalTxt, color) {
    var el = $(id);
    if(!el) return;
    if(color) el.style.color = color;
    if(scrambleIds[id]) clearInterval(scrambleIds[id]);
    var chars = "01#$%&?/X*+";
    var iters = 0;
    var maxIters = 6;
    scrambleIds[id] = setInterval(function() {
        var str = "";
        for(var i=0; i<finalTxt.length; i++) {
            if(finalTxt[i] === ' ' || finalTxt[i] === '.') { str += finalTxt[i]; continue; }
            if(iters > maxIters - 3 && Math.random() > 0.5) str += finalTxt[i]; 
            else str += chars[Math.floor(Math.random() * chars.length)];
        }
        el.textContent = str;
        iters++;
        if(iters >= maxIters) {
            clearInterval(scrambleIds[id]);
            el.textContent = finalTxt;
        }
    }, 40);
}

// === ORIENTATION ===
function attemptFullscreenAndLock() {
    var el = document.documentElement;
    // Try lock without fullscreen first (works in standalone PWA on Android)
    if(orient !== 'off' && screen.orientation && screen.orientation.lock){
        try{
            screen.orientation.lock(orient).catch(function(){
                // If direct lock failed, try entering fullscreen first then lock
                var rfs = el.requestFullscreen || el.webkitRequestFullScreen || el.mozRequestFullScreen || el.msRequestFullscreen;
                if(rfs){
                    rfs.call(el).then(function(){
                        screen.orientation.lock(orient).catch(function(e){console.log('Orientation lock failed:',e);});
                    }).catch(function(err){console.log('Fullscreen failed:',err);});
                }
            });
        }catch(e){console.log('Lock threw:',e);}
    } else {
        // Fallback: just request fullscreen for visual
        var rfs = el.requestFullscreen || el.webkitRequestFullScreen || el.mozRequestFullScreen || el.msRequestFullscreen;
        if(rfs)rfs.call(el).catch(function(){});
    }
}
function checkOrient(){
    if(!bootFinished){
        bootFinished = true;
        initLevelSelect();
        // Backfill: if all stages already cleared but ceremony not shown
        if(checkChampionStatus() && !championStatus.ceremonyShown){
            setTimeout(showChampionCeremony, 800);
        }
        // Try lock orientation immediately (works in PWA standalone mode on Android Chrome)
        if(orient !== 'off' && screen.orientation && screen.orientation.lock){
            try{screen.orientation.lock(orient).catch(function(){});}catch(e){}
        }
        // Lock orientation on first user gesture (so menus stay locked too, browser tab fallback)
        if(orient !== 'off'){
            var lockOnce = function(){
                document.removeEventListener('pointerdown', lockOnce, true);
                document.removeEventListener('keydown', lockOnce, true);
                attemptFullscreenAndLock();
            };
            document.addEventListener('pointerdown', lockOnce, true);
            document.addEventListener('keydown', lockOnce, true);
        }
    }
}

var _lastLayoutKey = currentLayoutKey();
W.addEventListener('resize',function(){
    resize();
    if(bootFinished)checkOrient();
    var nk = currentLayoutKey();
    if(nk !== _lastLayoutKey){
        _lastLayoutKey = nk;
        loadCurrentCtrlLayout();
        applyJoySettings();
        if(typeof applyBtnSize==='function')applyBtnSize();
    }
});

// === LEVEL SELECT ===
function initLevelSelect(){
    if(!playerName||!load('ctrlPicked',false)||!load('tutorialDone',false)){showOnboard();}
    $('levelSelect').classList.add('active');
    if(musOn && audioInitialized) startMusic();
    updateLsChestBtn();
    updateLsDailyBtn();
    startPortrait();
    // Ghost Rival progress banner
    var gb=$('ghostBanner');
    if(gb){
        var c0=levelStats[0]&&levelStats[0].completions>0;
        var c1=levelStats[1]&&levelStats[1].completions>0;
        var done=(c0?1:0)+(c1?1:0);
        if(!ghostsEnabled){gb.style.display='block';gb.innerHTML='\ud83d\udc7b Ghost Replay <b style="color:#fa0;">DISABLED</b> in Settings (for performance)';}
        else if(done>=2){gb.style.display='none';}
        else{gb.style.display='block';gb.innerHTML='\ud83d\udc7b '+done+'/2 completed \u2014 clear Stage 1 & 2 to unlock <b style="color:#0ff;">Ghost Rival</b> for free!';}
    }
    if(hintsSeen<3){var bh=$('btnHints');if(bh){bh.classList.add('active');bh.classList.remove('fading');hintsSeen++;save('hintsSeen',hintsSeen);setTimeout(function(){bh.classList.add('fading');},5000);setTimeout(function(){bh.classList.remove('active');bh.classList.remove('fading');},6000);}}
    $('levelSelect').classList.add('entering');
    setTimeout(function(){ $('levelSelect').classList.remove('entering'); }, 500);
    cancelThumbAnimations();
    
    if(lastPlayed !== null && lastPlayed < LEVELS.length) activeIdx = lastPlayed;
    else activeIdx = 0;
    if(!unlocked.includes(activeIdx)) activeIdx = unlocked.reduce(function(a,b){return Math.max(a,b);},0);
    
    // Build dot nav
    var dotNav = $('dotNav');
    dotNav.innerHTML = '';
    var _todayKeyD = getDailyKey();
    var _dailyStageD = getDailyMasterStage(_todayKeyD);
    var _dailyDataD = load('dailyMaster',{day:'',collected:false});
    var _dailyClaimedD = (_dailyDataD.day === _todayKeyD && _dailyDataD.collected);
    for(var i=0; i<LEVELS.length; i++) {
        var dot = document.createElement('button');
        dot.className = 'dot' + (unlocked.includes(i) ? ' unlocked' : ' locked');
        if(i === _dailyStageD) dot.classList.add(_dailyClaimedD ? 'daily-claimed' : 'daily-active');
        dot.type = 'button';
        dot.style.setProperty('--dot-color', THEMES[LEVELS[i].theme].acc);
        if(i === _dailyStageD) dot.title = _dailyClaimedD ? "Today's Daily Master (claimed)" : "Today's Daily Master Chip!";
        dot.onclick = (function(idx){ return function(){ activeIdx=idx; updateCarousel(); }; })(i);
        dotNav.appendChild(dot);
    }
    
    // Init single thumbnail
    var c = $('activeThumb');
    c.width = 400; c.height = 200;
    initThumb(activeIdx, THEMES[LEVELS[activeIdx].theme]);
    updateCarousel();
    setupSwipe();
}

function updateCarousel() {
    var details = $('lsDetails');
    details.classList.remove('entering');
    void details.offsetWidth;
    details.classList.add('entering');
    var lv = LEVELS[activeIdx];
    var th = THEMES[lv.theme];
    var isUn = unlocked.includes(activeIdx);
    var bTime = bestTimes[activeIdx];
    var st = normalizeLevelStat(levelStats[activeIdx]);
    
    // Ambient glow
    var accHex = th.acc;
    if(accHex.length === 4) accHex = '#' + accHex[1]+accHex[1] + accHex[2]+accHex[2] + accHex[3]+accHex[3];
    $('ambientGlow').style.setProperty('--glow-color', accHex + '33');
    $('levelSelect').style.backgroundColor = th.skyB;
    
    // Card border color
    var wrap = $('cardWrap');
    wrap.style.borderColor = isUn ? th.acc : '#333';
    wrap.style.boxShadow = isUn ? '0 0 30px ' + accHex + '40' : 'none';
    var sw = wrap.classList.contains('switching') ? ' switching' : '';
    wrap.className = (isUn ? '' : 'locked') + sw;
    // Character portrait: match thumbnail border theme
    var port = $('lsCharPortrait');
    if(port){port.style.borderColor = isUn ? th.acc : '#333'; port.style.boxShadow = isUn ? '0 0 18px ' + accHex + '30' : 'none';}
    
    // Card number and lock
    $('cardNum').textContent = activeIdx + 1;
    $('cardLock').style.display = isUn ? 'none' : 'flex';
    
    // Card stats overlay
    var cMax = getMaxChips(activeIdx);
    var bChipsArr = bestChips[activeIdx] || [];
    var bChipsCount = 0;
    for(var j=0; j<bChipsArr.length; j++) if(bChipsArr[j]) bChipsCount++;
    
    var tMin = Math.floor((st.timePlayed || 0) / 60000);
    var hm = Math.floor(tMin / 60);
    var mm = tMin % 60;
    var timeStr = hm > 0 ? (hm + 'h ' + mm + 'm') : (mm + 'm');
    if((st.timePlayed || 0) > 0 && tMin === 0) timeStr = '<1m';
    if((st.timePlayed || 0) === 0) timeStr = '0m';
    
    var ghostIcon=isUn?(ghostData[activeIdx]&&ghostData[activeIdx].length>0?'  \ud83d\udc7b':'  \ud83d\udeab'):'';
    $('cardStatTR').textContent = isUn ? '\u23f1\ufe0f ' + timeStr + ghostIcon : '';
    $('cardStatBL').textContent = isUn ? '\ud83c\udfae ' + st.attempts + '  \ud83d\udea9 ' + st.completions : '';
    $('cardStatBR').textContent = isUn ? '\u2605 ' + bChipsCount + '/' + cMax + '  \u2666 ' + (st.silver||0) : '';
    
    // Dot nav update
    var dots = $('dotNav').children;
    for(var i=0; i<dots.length; i++) {
        dots[i].className = 'dot' + (unlocked.includes(i) ? ' unlocked' : ' locked') + (i === activeIdx ? ' active' : '');
    }
    
    // Reinit thumbnail for new level
    cancelThumbAnimations();
    initThumb(activeIdx, th);
    
    // Global totals
    var totalGold = 0, levelsCleared = 0;
    for(var i=0; i<LEVELS.length; i++) {
        var cArr = bestChips[i] || [];
        for(var j=0; j<cArr.length; j++) if(cArr[j]) totalGold++;
        if(levelStats[i] && levelStats[i].completions > 0) levelsCleared++;
    }
    var clearPct = Math.floor((levelsCleared / LEVELS.length) * 100);
    
    $('lsPlayerName').textContent = getDisplayName();
    $('lsTopGold').textContent = getGoldBalance();
    $('lsTopSilver').textContent = silverWallet;
    $('gMatches').textContent = globalData.matches;
    var totalMin = Math.floor(globalData.timePlayed / 60000);
    $('gTime').textContent = Math.floor(totalMin/60) > 0 ? Math.floor(totalMin/60) + 'h ' + (totalMin%60) + 'm' : (totalMin%60) + 'm';
    $('gClear').textContent = clearPct + '%';
    $('gDeaths').textContent = globalData.deadFall + globalData.deadSpike + globalData.deadLaser;
    $('gDeadFall').textContent = globalData.deadFall;
    $('gDeadSpike').textContent = globalData.deadSpike;
    $('gDeadLaser').textContent = globalData.deadLaser;
    
    var rankInfo = getPlayerRankInfo();
    var ltr=$('lsTopRank');
    if(ltr){ltr.textContent=rankInfo.current.name+' \u24d8';ltr.style.color=rankInfo.current.color;ltr.style.borderColor=rankInfo.current.color;}
    
    // Level info
    scrambleText('lsName', (activeIdx+1) + '. ' + lv.name, isUn ? th.acc : '#666');
    var diffClass = lv.diff === 'STARTER' ? 'diff-starter' : (lv.diff === 'SIMPLE' ? 'diff-simple' : (lv.diff === 'MODERATE' ? 'diff-moderate' : (lv.diff === 'HARD' ? 'diff-hard' : (lv.diff === 'EASY' ? 'diff-easy' : (lv.diff === 'MED' ? 'diff-med' : 'diff-hard')))));
    $('lsTags').className = 'tag ' + (isUn ? diffClass : '');
    var stCv=(st&&st.contentVersion)||0;
    var isUpdated=isUn&&st.completions>0&&activeIdx>=STAGE_CONTENT_AFFECTS_FROM_LVL&&stCv<STAGE_CONTENT_VERSION;
    // Daily master indicator
    var _todayKey = getDailyKey();
    var _dailyStage = getDailyMasterStage(_todayKey);
    var _dailyData = load('dailyMaster',{day:'',collected:false});
    var _isDailyToday = (activeIdx === _dailyStage);
    var _dailyClaimed = (_dailyData.day === _todayKey && _dailyData.collected);
    var _dailyTag = _isDailyToday ? (_dailyClaimed ? ' | \ud83d\udc8e DAILY (claimed)' : ' | \ud83d\udc8e DAILY GEM') : '';
    scrambleText('lsTags', lv.diff + ' | ' + th.name + (isUpdated?' | \ud83d\udd04 UPDATED':'') + _dailyTag, null);
    var pe=$('lsPhysics');if(pe){var th2=THEMES[lv.theme];var hasGhostReplay=ghostsEnabled&&isUn&&ghostData[activeIdx]&&ghostData[activeIdx].length>0;var baseTxt=gravLabel(th2.grav)+' \u2022 '+fricLabel(th2.fric)+' \u2022 '+(th2.weather!=='clear'?th2.weather.toUpperCase():'CLEAR');if(hasSkill('ghost')&&hasGhostReplay){pe.innerHTML=baseTxt+' \u2022 \ud83d\udc7b <span id="lsGhostWatch" style="cursor:pointer;text-decoration:underline;color:#a0f;" role="button" tabindex="0">watch replay \u25b6</span>';var gw=$('lsGhostWatch');if(gw)gw.onclick=function(e){e.stopPropagation();startReplay(activeIdx);};}else if(hasSkill('ghost')){pe.innerHTML=baseTxt+' \u2022 <span style="color:#888;">\ud83d\udc7b \ud83d\udeab</span>';}else{pe.textContent=baseTxt;}}
    scrambleText('lsTime', bTime ? (bTime/1000).toFixed(2)+'s' : '--', bTime ? '#0f8' : '#aaa');
    scrambleText('lsChips', st.completions > 0 ? bChipsCount+'/'+cMax : '0/'+cMax);
    scrambleText('lsAtt', st.attempts + '');
    scrambleText('lsScore', (bestScores[activeIdx]||0)+'');
    
    var btn = $('lsPlayBtn');
    if(isUn) {
        btn.disabled = false;
        btn.textContent = 'Play DashJ';
        btn.style.background = 'linear-gradient(90deg,' + th.grid + ',' + th.acc + ')';
    } else {
        btn.disabled = true;
        btn.textContent = 'LOCKED';
        btn.style.background = '#333';
    }
    var statBolds = document.querySelectorAll('.stat-box b');
    for(var i=0;i<statBolds.length;i++) statBolds[i].style.color = isUn ? th.acc : '#666';
}

function moveCar(dir) {
    vib(5);
    var next = activeIdx + dir;
    if(next >= 0 && next < LEVELS.length) {
        var wrap = $('cardWrap');
        wrap.classList.add('switching');
        setTimeout(function(){ wrap.classList.remove('switching'); }, 300);
        activeIdx = next;
        updateCarousel();
    }
}

function playSelected() {
sendMetric('ui_event',{action:'play_clicked',meta:String(activeIdx)});
    vib(10);
    if(unlocked.includes(activeIdx)) {
        initAudio();
        
        var th = THEMES[LEVELS[activeIdx].theme];
        var flash = $('transitionFlash');
        if(!flash) {
            flash = document.createElement('div');
            flash.id = 'transitionFlash';
            flash.style.cssText = 'position:fixed;inset:0;z-index:9999;opacity:0;pointer-events:none;transition:opacity 0.25s ease-out;';
            document.body.appendChild(flash);
        }
        
        flash.style.background = th.acc;
        void flash.offsetWidth;
        flash.style.opacity = '1';
        
        setTimeout(function() {
            if(orient !== 'off') attemptFullscreenAndLock();
            activeConsumable=null;consumableTimefreeze=false;dblshieldActivated=false;dblshieldUsed=false;timefreezeUsed=false;triplejumpActivated=false;shieldInvuln=0;
            if(consumableInv.dblshield>0){shieldHits=2;dblshieldActivated=true;}
            if(consumableInv.triplejump>0){activeConsumable='triplejump';triplejumpActivated=true;}
            if(consumableInv.timefreeze>0){consumableTimefreeze=true;}
            startGame(activeIdx);
            flash.style.opacity = '0';
        }, 250);
    }
}

var sStartX = 0;
function setupSwipe() {
    var wrap = $('cardWrap');
    wrap.ontouchstart = function(e){ sStartX = e.touches[0].clientX; };
    wrap.ontouchend = function(e){
        var diff = e.changedTouches[0].clientX - sStartX;
        if(diff > 50) moveCar(-1);
        else if(diff < -50) moveCar(1);
    };
}

W.addEventListener('keydown',function(e){
    if($('levelSelect').classList.contains('active')) {
        if($('onboard').classList.contains('active'))return;
        if(e.code==='ArrowLeft'||e.code==='KeyA') moveCar(-1);
        if(e.code==='ArrowRight'||e.code==='KeyD') moveCar(1);
        if(e.code==='Enter'||e.code==='Space') playSelected();
    }
});

function initThumb(idx,th){
var c=$('activeThumb');
if(!c) return;
var x=c.getContext('2d');
var w=c.width,h=c.height;
var lv=LEVELS[idx];
var t=0;
var animId=0;

// Generate platforms
var plats=[],spks=[];
var seed=lv.theme*997+lv.plats*31;
var lx=0,ly=h*0.7;
plats.push({x:0,y:ly,w:w*0.35,m:false});
lx=w*0.35;
for(var i=0;i<8;i++){
    seed=(seed*9301+49297)%233280;
    var gap=30+(seed/233280)*50;
    seed=(seed*9301+49297)%233280;
    ly=ly+((seed/233280)-0.5)*40;
    ly=Math.max(h*0.35,Math.min(h*0.8,ly));
    seed=(seed*9301+49297)%233280;
    var pw=30+(seed/233280)*50;
    var nx=lx+gap;
    plats.push({x:nx,y:ly,w:pw,m:i<lv.move});
    if(i>1&&i%2===0)spks.push({x:nx+pw/2,y:ly});
    lx=nx+pw;
}
var totalW=lx+60;

function frame(){
    t+=0.025;
    var w2=w,h2=h;
    // Sky
    var g=x.createLinearGradient(0,0,0,h2);
    g.addColorStop(0,th.skyT);g.addColorStop(0.5,th.skyM);g.addColorStop(1,th.skyB);
    x.fillStyle=g;x.fillRect(0,0,w2,h2);

    // Scroll offset (looping)
    var scroll=(t*60)%totalW;

    // Grid
    x.strokeStyle=th.grid;x.lineWidth=1;x.globalAlpha=0.08;
    var gOff=scroll%40;
    for(var gx2=-gOff;gx2<w2;gx2+=40){x.beginPath();x.moveTo(gx2,0);x.lineTo(gx2,h2);x.stroke();}
    for(var gy=0;gy<h2;gy+=40){x.beginPath();x.moveTo(0,gy);x.lineTo(w2,gy);x.stroke();}
    x.globalAlpha=1;

    // Platforms
    for(var i=0;i<plats.length;i++){
        var p=plats[i];
        var sx=((p.x-scroll)%totalW+totalW)%totalW-80;
        if(sx>w2+10||sx+p.w<-10)continue;
        var sy=p.m?p.y+Math.sin(t*3+i)*10:p.y;
        x.fillStyle='rgba(0,229,255,0.12)';
        x.fillRect(sx,sy,p.w,12);
        x.strokeStyle=th.acc;x.lineWidth=1.5;
        x.beginPath();x.moveTo(sx,sy);x.lineTo(sx+p.w,sy);x.stroke();
        if(p.m){x.strokeStyle=th.acc;x.lineWidth=1;x.setLineDash([3,3]);x.strokeRect(sx,sy,p.w,12);x.setLineDash([]);}
    }

    // Spikes
    for(var i=0;i<spks.length;i++){
        var s=spks[i];
        var sx=((s.x-scroll)%totalW+totalW)%totalW-80;
        if(sx>w2+10||sx<-10)continue;
        x.fillStyle='#f05';x.shadowBlur=6;x.shadowColor='#f05';
        x.beginPath();x.moveTo(sx-5,s.y);x.lineTo(sx,s.y-10);x.lineTo(sx+5,s.y);x.fill();
        x.shadowBlur=0;
    }

    // Lasers
    if(lv.move>=2){
        for(var i=3;i<plats.length;i+=3){
            var p=plats[i];
            var lsx=((p.x+p.w/2-scroll)%totalW+totalW)%totalW-80;
            if(lsx>w2+10||lsx<-10)continue;
            var on=(Math.floor(t*60)+i*20)%80<50;
            x.fillStyle='#333';x.fillRect(lsx-3,p.y-35,6,3);x.fillRect(lsx-3,p.y-3,6,3);
            if(on){x.fillStyle='#f00';x.shadowBlur=6;x.shadowColor='#f00';x.fillRect(lsx-1,p.y-32,2,29);x.shadowBlur=0;}
        }
    }

    // Weather
    if(th.weather!=='clear'){
        x.globalAlpha=0.4;
        for(var i=0;i<20;i++){
            var wx=(i*67+t*80*(th.weather==='dust'?1:0.3))%w2;
            var wy=(i*43+t*(th.weather==='snow'?30:100))%h2;
            if(th.weather==='rain'||th.weather==='storm'){
                x.strokeStyle='rgba(150,200,255,0.6)';x.lineWidth=1;
                x.beginPath();x.moveTo(wx,wy);x.lineTo(wx+1,wy+8);x.stroke();
            }else if(th.weather==='snow'){
                x.fillStyle='#fff';x.beginPath();x.arc(wx,wy,1.5,0,Math.PI*2);x.fill();
            }else if(th.weather==='dust'){
                x.fillStyle='rgba(200,170,120,0.5)';x.fillRect(wx,wy,2,2);
            }
        }
        x.globalAlpha=1;
    }

    // Player - scripted path (no physics, just smooth animation)
    var dotX=w2*0.35;
    var baseY=h2*0.55;
    var jump=Math.abs(Math.sin(t*2.5))*h2*0.25;
    var dotY=baseY-jump;
    // Trail
    x.globalAlpha=0.3;x.fillStyle=th.acc;
    for(var ti=1;ti<=3;ti++){
        var trailJump=Math.abs(Math.sin((t-ti*0.04)*2.5))*h2*0.25;
        x.beginPath();x.arc(dotX-ti*6,baseY-trailJump,5-ti,0,Math.PI*2);x.fill();
    }
    x.globalAlpha=1;
    // Dot
    x.shadowBlur=10;x.shadowColor=th.acc;x.fillStyle=th.acc;
    x.beginPath();x.arc(dotX,dotY,5,0,Math.PI*2);x.fill();
    x.shadowBlur=0;

    // Vignette
    var vg=x.createRadialGradient(w/2,h/2,w*0.3,w/2,h/2,w*0.7);
    vg.addColorStop(0,'transparent');vg.addColorStop(1,'rgba(0,0,0,0.4)');
    x.fillStyle=vg;x.fillRect(0,0,w,h);

    animId=requestAnimationFrame(frame);
    thumbAnimRef.id=animId;
}
var thumbAnimRef={id:0};
thumbAnimRefs.push(thumbAnimRef);
frame();
}

// === SETTINGS ===
function openSettings(){
vib(5);
sendMetric('ui_event',{action:'settings_clicked'});
$('settings').classList.add('active');
$('setSfx').value=sfxOn?'1':'0';
$('setMusic').value=musOn?'1':'0';
$('setVisual').value=visualQuality;
$('setGhost').value=ghostsEnabled?'1':'0';
$('setShowFps').value=showFps?'1':'0';
$('setCtrl').value=ctrlMode;
$('setVibrate').value=vibrateOn?'1':'0';
if($('setOrient'))$('setOrient').value=orient;
if($('setAutoRetry'))$('setAutoRetry').value=autoRetryDelay;
updateCtrlPreview($('ctrlPreview'),ctrlMode);
}

function openGameSettings(){
$('gameSettings').classList.add('active');
$('gSetOrient').value=orient;
$('gSetVibrate').value=vibrateOn?'1':'0';
$('gSetCtrl').value=ctrlMode;
if($('gSetVisual'))$('gSetVisual').value=visualQuality;
if($('gSetShowFps'))$('gSetShowFps').value=showFps?'1':'0';
if($('gSetAutoRetry'))$('gSetAutoRetry').value=autoRetryDelay;
updateGameSettingsDisplay();
renderPauseShop();
}
function retryFromPause(){
    if(!gameRunning)return;
    isPaused=false;
    if(_autoRetryTimer){clearTimeout(_autoRetryTimer);_autoRetryTimer=null;}
    if(ac && ac.state==='suspended') ac.resume();
    closeGameSettings();
    sendMetric('ui_event',{action:'retry_clicked'});
    startGame(curLvl);
}
function renderPauseShop(){
var el=$('pauseShopList');if(!el)return;
$('pauseSilver').textContent='\u2666 '+silverWallet;
var html='';
// Active skills/cooldowns section
var skillStatus=[];
if(hasSkill('ghost'))skillStatus.push('\ud83d\udc7b Ghost');
if(hasSkill('airdash'))skillStatus.push('\ud83d\udca8 Air Dash');
if(hasSkill('reflexdash'))skillStatus.push('\u26a1 Reflex Dash');
if(hasSkill('resurrect')){var rcd=120000-(Date.now()-lastResurrectTime);skillStatus.push('\u2764 Resurrect: '+(rcd<=0?'\u2713 Ready':Math.floor(rcd/60000)+'m'+Math.floor((rcd%60000)/1000)+'s'));}
if(skillStatus.length>0){
  html+='<div style="font-size:0.55rem;color:#aaa;margin-bottom:8px;padding:6px 10px;background:rgba(0,255,255,0.05);border-radius:6px;border:1px solid rgba(0,255,255,0.15);">'+skillStatus.join(' \u2022 ')+'</div>';
}
html+='<div style="font-size:0.55rem;color:#0f8;text-align:center;margin-bottom:6px;font-style:italic;">\u2728 Buying activates immediately if not already in use; otherwise stocks for next run</div>';
for(var i=0;i<CONSUMABLES.length;i++){var c=CONSUMABLES[i];if(c.id==='namechange')continue;
var qty=consumableInv[c.id]||0,canBuy=silverWallet>=c.cost;
var inUse='';
if(c.id==='triplejump'&&activeConsumable==='triplejump')inUse=' <span style="color:#0f8;font-size:0.55rem;">\u2022 active</span>';
else if(c.id==='dblshield'&&shieldHits>0)inUse=' <span style="color:#0f8;font-size:0.55rem;">\u2022 '+shieldHits+'x shield</span>';
else if(c.id==='timefreeze'&&consumableTimefreeze){var ft=freezeCD>0?' \u2022 CD '+(freezeCD/60).toFixed(0)+'s':' \u2022 ready';inUse=' <span style="color:#0f8;font-size:0.55rem;">\u2022 active'+ft+'</span>';}
html+='<div style="display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:6px;padding:6px 10px;"><div style="font-size:0.65rem;"><span>'+c.icon+' '+c.name+'</span>'+inUse+(qty>0?' <span style="color:#0aa;font-size:0.55rem;">\u2022 '+qty+' next run</span>':'')+'</div><button onclick="buyPauseCon(\''+c.id+'\')" style="padding:4px 10px;font-size:0.65rem;font-weight:700;border:none;border-radius:4px;background:'+(canBuy?'#0a6':'#333')+';color:#fff;cursor:pointer;">'+c.cost+' \u2666</button></div>';
}
el.innerHTML=html;
}
function buyPauseCon(id){var c=CONSUMABLES.find(function(x){return x.id===id;});if(!c||silverWallet<c.cost)return;silverWallet-=c.cost;save('silver',silverWallet);var activated=false;if(gameRunning&&!player.dead&&!player.won){if(id==='triplejump'&&activeConsumable!=='triplejump'){activeConsumable='triplejump';tripleJumpCD=0;activated=true;}else if(id==='dblshield'&&!dblshieldActivated){shieldHits=2;dblshieldActivated=true;dblshieldUsed=true;activated=true;}else if(id==='timefreeze'&&!consumableTimefreeze){consumableTimefreeze=true;timefreezeUsed=true;freezeCD=0;activated=true;}}if(activated){addFloat(player.x+player.w/2,player.y-20,'ACTIVATED!','#0f8');vib([10,20,30]);}else{consumableInv[id]=(consumableInv[id]||0)+1;save('consumableInv',consumableInv);vib(10);}renderPauseShop();}

function finalizeRunConsumables(){
    // dblshield: only consume from inventory if it was actually used
    if(dblshieldActivated&&dblshieldUsed&&consumableInv.dblshield>0){consumableInv.dblshield--;save('consumableInv',consumableInv);}
    // timefreeze: only consume if used
    if(consumableTimefreeze&&timefreezeUsed&&consumableInv.timefreeze>0){consumableInv.timefreeze--;save('consumableInv',consumableInv);}
    // triplejump: consume on finalize (was eagerly decremented before, now deferred for retry-friendly behavior)
    if(triplejumpActivated&&consumableInv.triplejump>0){consumableInv.triplejump--;save('consumableInv',consumableInv);}
    dblshieldActivated=false;dblshieldUsed=false;consumableTimefreeze=false;timefreezeUsed=false;triplejumpActivated=false;shieldHits=0;
}
function updateGameSettingsDisplay(){
updateCtrlPreview($('gCtrlPreview'),$('gSetCtrl').value);
}
$('gSetCtrl').addEventListener('change',updateGameSettingsDisplay);

function saveSettings(){
vib(5);
sfxOn=$('setSfx').value==='1';
musOn=$('setMusic').value==='1';
var _newQ=$('setVisual').value;
if(_newQ==='low'&&visualQuality!=='low'){
    if(!confirm('Set Visual to LOW?\n\nThis will also disable Ghost Replays for better performance.\n\nYou can re-enable ghosts manually later.')){
        $('setVisual').value=visualQuality;
        _newQ=visualQuality;
    }else{
        $('setGhost').value='0';
    }
}
setQuality(_newQ);
ghostsEnabled=$('setGhost').value==='1';save('ghostsEnabled',ghostsEnabled);
showFps=$('setShowFps').value==='1';save('showFps',showFps);
save('sfx',sfxOn);save('mus',musOn);
ctrlMode=$('setCtrl').value;
vibrateOn=$('setVibrate').value==='1';
if($('setOrient')){var _newOrient=$('setOrient').value;if(_newOrient!==orient){orient=_newOrient;save('orient',orient);if(screen.orientation&&screen.orientation.lock)screen.orientation.lock(orient).catch(function(){});}}
save('ctrl',ctrlMode);save('vibrate',vibrateOn);
if($('setAutoRetry')){autoRetryDelay=$('setAutoRetry').value;save('autoRetryDelay',autoRetryDelay);}

if(!musOn) stopMusic();
$('settings').classList.remove('active');
}

function openChangelog(){$('settings').classList.remove('active');$('changelog').classList.add('active');}
function restartGame(){
    if('serviceWorker' in navigator){
        navigator.serviceWorker.getRegistrations().then(function(regs){
            regs.forEach(function(r){try{r.update();}catch(e){}});
            location.reload();
        }).catch(function(){location.reload();});
    } else {
        location.reload();
    }
}
function closeChangelog(){$('changelog').classList.remove('active');$('settings').classList.add('active');}

function updateCtrlPreview(el,val){
el.textContent=val==='analog'?'Left: Joystick pad \u2014 Right: Jump button':'Left: \u25c0 \u25b6 buttons \u2014 Right: \u2b06 Jump button';
}
$('setCtrl').addEventListener('change',function(){updateCtrlPreview($('ctrlPreview'),this.value);});

function saveGameSettings(){
var _prevOrient=orient;
orient=$('gSetOrient').value;
vibrateOn=$('gSetVibrate').value==='1';
ctrlMode=$('gSetCtrl').value;
if($('gSetShowFps')){showFps=$('gSetShowFps').value==='1';save('showFps',showFps);}
if($('gSetAutoRetry')){autoRetryDelay=$('gSetAutoRetry').value;save('autoRetryDelay',autoRetryDelay);}
save('orient',orient);save('vibrate',vibrateOn);save('ctrl',ctrlMode);
if(orient!==_prevOrient && screen.orientation && screen.orientation.lock){screen.orientation.lock(orient).catch(function(){});}

if(ctrlMode==='analog'){$('jZone').classList.add('active');$('jBtn').classList.add('active');$('arrowControls').classList.remove('active');}
else{$('jZone').classList.remove('active');$('jBtn').classList.add('active');$('arrowControls').classList.add('active');}
applyJoySettings();applyBtnSize();
resumeGame();
}

function closeGameSettings(){
resumeGame();
}

var storeTab='consumables';
function openStore(){vib(5);sendMetric('ui_event',{action:'store_clicked'});$('store').classList.add('active');showStoreTab('consumables');updateChestBtn();updateShopkeeper();}
function buildShareTemplate(){
    var ri=getPlayerRankInfo();
    var cleared=0;for(var i=0;i<LEVELS.length;i++)if(levelStats[i]&&levelStats[i].completions>0)cleared++;
    return '\ud83c\udfae N3ON DashJ'+(playerName?' \u2014 '+getDisplayName():'')+'\n'+
           '\ud83c\udf1f Rank: '+ri.current.name+'\n'+
           '\ud83d\udea9 Cleared: '+cleared+'/'+LEVELS.length+' stages\n'+
           (championStatus.unlocked?'\u2605 MASTER OF N30N\n':'')+
           '\n\ud83d\udd17 '+location.href;
}
function refreshSharePreview(){
    var ta=$('shareCustomMsg'),pv=$('sharePreviewBody');
    if(!pv)return;
    var custom=ta?ta.value:'';
    var template=buildShareTemplate();
    var full=custom?(custom+'\n\n'+template):template;
    pv.textContent=full;
}
function shareGame(){
    vib(5);
    sendMetric('ui_event',{action:'share_clicked'});
    var ov=$('overlay');
    $('ovTitle').textContent='\ud83d\udce4 SHARE';
    $('ovTitle').style.color='#0ff';
    $('ovMsg').innerHTML=
        '<div style="font-size:0.7rem;color:#aaa;margin-bottom:8px;text-align:left;">Add a personal note. Stats and game link auto-include below.</div>'+
        '<textarea id="shareCustomMsg" oninput="refreshSharePreview()" style="width:100%;height:60px;background:#111;color:#0ff;border:1px solid #0ff;padding:8px;font-family:monospace;font-size:0.75rem;border-radius:8px;resize:none;box-sizing:border-box;">Hey! Try this game with me \u2014 it\'s wild.</textarea>'+
        '<div style="font-size:0.6rem;color:#666;margin-top:8px;text-align:left;">Preview:</div>'+
        '<div id="sharePreviewBody" style="background:#0a0a18;border:1px solid #333;border-radius:8px;padding:8px;font-family:monospace;font-size:0.65rem;color:#aaa;white-space:pre-wrap;text-align:left;max-height:120px;overflow-y:auto;margin-top:4px;"></div>';
    setTimeout(function(){
        refreshSharePreview();
        var ta=$('shareCustomMsg');
        if(ta){ta.focus();ta.select();}
    }, 30);
    $('ovBtn').style.display='inline-block';
    $('ovBtn').textContent='\ud83d\udce4 SHARE';
    $('ovBtn').style.background='linear-gradient(135deg,#0ff,#08f)';
    $('ovBtn').onclick=function(){
        var custom=$('shareCustomMsg')?$('shareCustomMsg').value.trim():'';
        var template=buildShareTemplate();
        var txt=custom?(custom+'\n\n'+template):template;
        // Build character + brand image to share alongside text
        var sc=document.createElement('canvas');sc.width=600;sc.height=400;
        var sx=sc.getContext('2d');
        // Background gradient
        var bg=sx.createLinearGradient(0,0,0,400);
        bg.addColorStop(0,'#020208');bg.addColorStop(0.5,'#0a0a1a');bg.addColorStop(1,'#1a0a2a');
        sx.fillStyle=bg;sx.fillRect(0,0,600,400);
        // Title
        sx.fillStyle='#fff';sx.font='bold 32px monospace';sx.textAlign='center';
        sx.shadowBlur=15;sx.shadowColor='#0ff';
        sx.fillText('N3ON DashJ',300,50);
        sx.shadowBlur=0;
        // Player name + rank
        if(playerName){var dn=getDisplayName();sx.fillStyle=championStatus.unlocked?'#ffd700':'#0ff';sx.font='bold 18px monospace';sx.fillText(dn,300,80);}
        // Stats row
        var stG=getGoldBalance(),stS=silverWallet||0,stCl=0;
        for(var sci=0;sci<LEVELS.length;sci++){if(bestTimes[sci])stCl++;}
        sx.fillStyle='#aaa';sx.font='14px monospace';
        sx.fillText('\u2605 '+stG+' \u2666 '+stS+'   \ud83d\udea9 '+stCl+'/'+LEVELS.length,300,108);
        // Character (centered)
        drawCharOnCtx(sx, 300, 250, 2.4, Date.now()*0.001);
        // URL
        sx.fillStyle='#0ff';sx.font='bold 13px monospace';
        sx.fillText(location.host+location.pathname,300,370);
        sc.toBlob(function(blob){
            var file=blob?new File([blob],'n3ondashj-share.png',{type:'image/png'}):null;
            if(navigator.share && file && navigator.canShare && navigator.canShare({files:[file]})){
                navigator.share({title:'N3ON DashJ',text:txt,files:[file]}).catch(function(){});
            }else if(navigator.share){
                navigator.share({title:'N3ON DashJ',text:txt}).catch(function(){});
            }else if(navigator.clipboard&&navigator.clipboard.writeText){
                navigator.clipboard.writeText(txt);addFloat&&addFloat(canvas.width/2,300,'COPIED!','#0f8');
            }
        },'image/png');
        ov.classList.remove('active');
    };
    $('ovBtnExtra').style.display='none';
    if($('ovBtnReplay'))$('ovBtnReplay').style.display='none';
    $('ovBtnCancel').style.display='inline-block';
    $('ovBtnCancel').textContent='CANCEL';
    $('ovBtnCancel').style.background='linear-gradient(135deg,#555,#333)';
    $('ovBtnCancel').onclick=function(){ov.classList.remove('active');};
    ov.classList.add('active');
}
function closeStore(){$('store').classList.remove('active');}
function canClaimChest(){return Date.now()-lastChestClaim>=86400000;}
function getDailyKey(){var d=new Date();return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();}
function getDailyMasterStage(key){
    // Deterministic stage from date string + player id for some variety
    var s=0;for(var i=0;i<key.length;i++)s=(s*31+key.charCodeAt(i))>>>0;
    s=(s*9301+49297)%233280;
    // Pick from levels the player has unlocked (so the daily is always reachable)
    var pool = (typeof unlocked!=='undefined' && unlocked.length>0) ? unlocked.length : LEVELS.length;
    return Math.floor((s/233280)*pool);
}
function claimDailyChest(){
if(!canClaimChest()){var ms=86400000-(Date.now()-lastChestClaim);var h=Math.floor(ms/3600000);var m=Math.floor((ms%3600000)/60000);addFloat(200,300,h+'h '+m+'m left','#f80');return;}
lastChestClaim=Date.now();save('lastChest',lastChestClaim);
var rewards=[];
var isGold=Math.random()<0.3;
if(isGold){var amt=Math.floor(Math.random()*4)+2;goldSpent-=amt;save('goldSpent',goldSpent);rewards.push('+'+amt+' \u2605 Gold');}
else{var amt=Math.floor(Math.random()*26)+15;silverWallet+=amt;save('silver',silverWallet);rewards.push('+'+amt+' \u2666 Silver');}
if(Math.random()<0.15){var cons=['triplejump','dblshield'];var cid=cons[Math.floor(Math.random()*cons.length)];consumableInv[cid]=(consumableInv[cid]||0)+1;save('consumableInv',consumableInv);rewards.push('+1 '+(cid==='triplejump'?'\u2b06\ufe0f Triple Jump':'\ud83d\udee1\ufe0f Dbl Shield'));}
vib(30);
var btn=$('dailyChestBtn');if(btn){btn.style.transform='scale(1.3)';btn.style.transition='transform 0.3s';setTimeout(function(){btn.style.transform='scale(1)';},300);}
var y=250;for(var ri=0;ri<rewards.length;ri++){setTimeout((function(txt,yy){return function(){addFloat(200,yy,txt,ri===0?(isGold?'#ffd700':'#ccc'):'#0f8');};})(rewards[ri],y),ri*400);y+=30;}
setTimeout(function(){renderStore();updateChestBtn();},rewards.length*400+200);
}
function updateChestBtn(){var btn=$('dailyChestBtn');if(!btn)return;if(canClaimChest()){btn.style.background='linear-gradient(135deg,#fa0,#f60)';btn.textContent='\uD83C\uDF81 DAILY';btn.style.opacity='1';}else{btn.style.background='#333';btn.textContent='\u2713 CLAIMED';btn.style.opacity='0.5';}}
function updateLsChestBtn(){
    var btn=$('lsChestBtn');
    if(!btn)return;
    if(canClaimChest()){
        btn.style.display='flex';
        btn.classList.add('chest-pulse');
        btn.style.opacity='1';
        btn.style.pointerEvents='auto';
        btn.textContent='\ud83c\udf81';
        btn.title='Daily Chest available';
    }else{
        // Show as claimed — different icon, half opacity, not clickable
        btn.style.display='flex';
        btn.classList.remove('chest-pulse');
        btn.style.opacity='0.4';
        btn.style.pointerEvents='none';
        btn.textContent='\u2705';
        btn.title='Daily chest already claimed today';
    }
}
function claimDailyChestFromHome(){
    if(!canClaimChest())return;
    var ov=$('overlay');
    $('ovTitle').textContent='\ud83c\udf81 DAILY CHEST';
    $('ovTitle').style.color='#fa0';
    var rewards=[];
    var isGold=Math.random()<0.3;
    if(isGold){var amt=Math.floor(Math.random()*4)+2;goldSpent-=amt;save('goldSpent',goldSpent);rewards.push('+'+amt+' \u2605 Gold');}
    else{var amt=Math.floor(Math.random()*26)+15;silverWallet+=amt;save('silver',silverWallet);rewards.push('+'+amt+' \u2666 Silver');}
    if(Math.random()<0.15){var cons=['triplejump','dblshield'];var cid=cons[Math.floor(Math.random()*cons.length)];consumableInv[cid]=(consumableInv[cid]||0)+1;save('consumableInv',consumableInv);rewards.push('+1 '+(cid==='triplejump'?'\u2b06\ufe0f Triple Jump':'\ud83d\udee1\ufe0f Double Shield'));}
    lastChestClaim=Date.now();save('lastChest',lastChestClaim);
    vib(30);
    $('ovMsg').innerHTML='<div style="font-size:0.9rem;margin-bottom:10px;">You claimed:</div>'+rewards.map(function(r){return '<div style="font-size:1.1rem;font-weight:700;margin:6px 0;">'+r+'</div>';}).join('');
    $('ovBtn').style.display='inline-block';
    $('ovBtn').textContent='AWESOME';
    $('ovBtn').style.background='linear-gradient(135deg,#fa0,#f60)';
    $('ovBtn').onclick=function(){ov.classList.remove('active');updateLsChestBtn();updateCarousel();};
    $('ovBtnExtra').style.display='none';
    if($('ovBtnReplay'))$('ovBtnReplay').style.display='none';
    $('ovBtnCancel').style.display='none';
    ov.classList.add('active');
}
function updateShopkeeper(){var el=$('shopkeeperMsg');if(!el)return;var i=Math.floor(Math.random()*TIPS.length);el.textContent=TIPS[i];var idx=$('shopkeeperIdx');if(idx)idx.textContent=(i+1)+' / '+TIPS.length;}

var ITEM_RULES={
ghost:{usage:'Always active when equipped',limit:'No usage limit',cooldown:'None',rules:'Records your fastest run on each level. The ghost replays alongside you on subsequent runs of the SAME level. Toggle visibility with the \ud83d\udc7b button bottom-left.'},
phasedash:{usage:'Automatic on first hazard collision per run',limit:'Once per run',cooldown:'Resets on every level start',rules:'Purchasable skill (22 gold). Equip a slot. The first time you would die from a hazard (spike or laser), you phase through it instead with a purple sparkle effect and 0.75s invuln. Falls still kill you. HUD shows \ud83c\udf00 when ready, \u26ab when used.'},
airdash:{usage:'Tap jump again AFTER your double jump',limit:'Once per air time (resets on landing)',cooldown:'None within an air time',rules:'Cannot dash without first using your double jump. Dash sends you horizontally forward 12 units. Stacks with consumables.'},
reflexdash:{usage:'Tap jump mid-air',limit:'Once per air time (resets on landing)',cooldown:'None',rules:'Champion-only reward (clear all 20 stages). Doesn\u2019t use a slot. Adds dash even when double-jump is on cooldown. Reflex Dash also grants the full Air Dash effect, so champions don\u2019t need a separate Air Dash slot. Toggle ENABLE/DISABLE in the store. Auto-disables when you equip or sell Air Dash (since AD covers the basic case). Re-enable manually after if you want it back.'},
resurrect:{usage:'Automatic on death',limit:'Once every 2 minutes (real-time)',cooldown:'2 minutes (persists across runs and sessions)',rules:'Respawns you at the last platform you stood on. Does NOT save you if you fall before touching any platform. Cooldown is global, not per-level.'},
coyote:{usage:'Always active when equipped',limit:'No usage limit',cooldown:'None',rules:'Doubles the coyote time (the moment after running off a ledge where you can still jump). Helps with edge mistakes.'},
magnet:{usage:'Always active when equipped',limit:'Affects all gems (silver arc gems and gold platform-top gems)',cooldown:'None',rules:'Any gem within ~100 pixels is pulled toward you. Stronger pull when closer.'},
wallslide:{usage:'Automatic when hitting a platform side mid-air',limit:'Active continuously when equipped',cooldown:'None (but rare situation)',rules:'When you fail a jump and hit the SIDE of a platform (instead of landing on top), you bounce away with upward velocity \u2014 a save mechanic for tough jumps. Direction is calculated from your jump origin. Resets double jump and air dash so you can recover.'},
triplejump:{usage:'Tap jump after using double jump',limit:'ONE consumable used per run \u2014 buying more during a run goes to inventory for NEXT run',cooldown:'15 seconds between triple jumps within the same run',rules:'Activates only at run start. Provides one extra mid-air jump per cooldown cycle. Cannot stack with Air Dash on the same press.'},
dblshield:{usage:'Automatic when hit by spike or laser',limit:'Grants 2 hit absorptions per run',cooldown:'0.33s grace period after each absorbed hit',rules:'Only consumed from inventory if AT LEAST ONE shield was actually used this run. If you never get hit, you keep it for next run. Buying mid-run when none active activates immediately (silver paid).'},
slowfall:{usage:'Hold the jump button while falling',limit:'Permanent skill — always active when equipped',cooldown:'None',rules:'Halves DOWNWARD velocity only. Does not affect upward jumps. The most expensive permanent skill since it makes most levels significantly easier.'},
timefreeze:{usage:'Tap the \u23f8 button during gameplay',limit:'ONE freeze per run; lasts 10 seconds',cooldown:'60 seconds between presses',rules:'Only consumed from inventory if you actually press the freeze button this run. If you never press it, you keep it for next run. Freezes lasers and moving platforms; does NOT stop spikes or gravity.'},
namechange:{usage:'Buy in store (instant action, not stored)',limit:'Per purchase',cooldown:'None',rules:'Lets you set a new player name (3-10 alphanumeric characters). The name shows on level select and in shared scores.'}
};

function showItemRules(id){
var r=ITEM_RULES[id];if(!r)return;
var src=SKILLS.find(function(x){return x.id===id;})||CONSUMABLES.find(function(x){return x.id===id;});
if(!src && id==='ghost')src={icon:'\ud83d\udc7b',name:'Ghost Rival',preview:'A translucent replay of your fastest clear races alongside you. Free skill, doesn\'t use slot.'};
if(!src && id==='reflexdash')src={icon:'\u26a1',name:'Reflex Dash',preview:'Champion reward (clear all 20 stages). Adds dash even when double-jump is on cooldown. Includes full Air Dash effect.'};
if(!src)return;
var ov=$('itemInfo');
$('iiTitle').innerHTML=src.icon+' '+src.name;
$('iiBody').innerHTML='<div style="font-size:0.75rem;color:#0ff;margin-bottom:10px;line-height:1.5;">'+src.preview+'</div>'+
'<div style="text-align:left;font-size:0.7rem;line-height:1.6;">'+
'<div style="margin-bottom:6px;"><b style="color:#0f8;">\u25b8 USAGE:</b> <span style="color:#ddd;">'+r.usage+'</span></div>'+
'<div style="margin-bottom:6px;"><b style="color:#fa0;">\u25b8 LIMIT:</b> <span style="color:#ddd;">'+r.limit+'</span></div>'+
'<div style="margin-bottom:6px;"><b style="color:#f80;">\u25b8 COOLDOWN:</b> <span style="color:#ddd;">'+r.cooldown+'</span></div>'+
'<div style="margin-bottom:6px;"><b style="color:#f0a;">\u25b8 RULES:</b> <span style="color:#ddd;">'+r.rules+'</span></div>'+
'</div>';
ov.classList.add('active');
}
function closeItemRules(){$('itemInfo').classList.remove('active');}
function showStoreTab(tab){
sendMetric('ui_event',{action:'store_tab',meta:tab});
storeTab=tab;
var tabs=document.querySelectorAll('.stab');
var names=['consumables','cosmetics','skills'];
for(var i=0;i<tabs.length;i++)tabs[i].className='stab'+(names[i]===tab?' active':'');
renderStore();
}
function renderStore(){
var goldBal=getGoldBalance();
$('storeBalance').innerHTML='<span style="color:#ffd700">\u2605 '+goldBal+'</span> &nbsp; <span style="color:#ccc">\u2666 '+silverWallet+'</span>'+(storeTab==='skills'?' &nbsp; <span style="color:#0ff">Slots: '+equippedSkills.length+'/3</span>':'');
var html='';
if(storeTab==='skills'){
// Show Ghost Rival as free unlockable skill
var ghostUnlocked=isGhostUnlocked();
var ghostStat=ghostUnlocked?'<span style="color:#0f8;font-size:0.65rem;font-weight:700;">\u2713 UNLOCKED</span>':'<span style="color:#fa0;font-size:0.65rem;">Clear Stage 1 & 2</span>';
var ghostCls=ghostUnlocked?'store-item equipped':'store-item';
html+='<div class="'+ghostCls+'"><div class="si-info"><div class="si-name">\ud83d\udc7b Ghost Rival <span onclick="showItemRules(\'ghost\')" style="color:#0ff;cursor:pointer;font-size:0.7rem;margin-left:4px;">\u2139\ufe0f</span></div><div class="si-desc">A translucent replay of your fastest clear races alongside you. <span style="color:#0aa;font-size:0.6rem;">Free \u2014 doesn\'t use slot</span></div></div><div class="si-cost" style="color:#0aa;font-size:0.7rem;">FREE</div><div>'+ghostStat+'</div></div>';
// Show Reflex Dash as Champion reward
var reflexUnlocked=championStatus.unlocked;
var reflexActive=reflexUnlocked && reflexDashEnabled;
var reflexStatusBadge;
if(!reflexUnlocked) reflexStatusBadge='<span style="color:#fa0;font-size:0.65rem;">Clear all 20 stages</span>';
else reflexStatusBadge=reflexActive?'<span style="color:#0f8;font-size:0.65rem;font-weight:700;">\u2605 ACTIVE</span>':'<span style="color:#888;font-size:0.65rem;font-weight:700;">DISABLED</span>';
var reflexCls=reflexActive?'store-item equipped':'store-item';
var reflexBorder=reflexActive?'border-color:#ffd700;':(reflexUnlocked?'border-color:rgba(255,215,0,0.25);':'');
var reflexToggleBtn = reflexUnlocked
    ? '<button onclick="toggleReflexDash()" style="padding:6px 12px;font-size:0.65rem;font-weight:700;border:none;border-radius:6px;cursor:pointer;color:#fff;background:'+(reflexActive?'#a04':'#0a6')+';letter-spacing:1px;">'+(reflexActive?'DISABLE':'ENABLE')+'</button>'
    : '<span style="color:#ffd700;font-size:0.7rem;">FREE</span>';
html+='<div class="'+reflexCls+'" style="'+reflexBorder+'"><div class="si-info"><div class="si-name">\u26a1 Reflex Dash <span onclick="showItemRules(\'reflexdash\')" style="color:#0ff;cursor:pointer;font-size:0.7rem;margin-left:4px;">\u2139\ufe0f</span></div><div class="si-desc">Air Dash + dash even when double-jump is on cooldown. <span style="color:#a0f;font-size:0.6rem;">Champion reward \u2014 doesn\'t use slot. Auto-disables if Air Dash is equipped or sold.</span></div></div><div class="si-cost">'+reflexToggleBtn+'</div><div>'+reflexStatusBadge+'</div></div>';
for(var i=0;i<SKILLS.length;i++){var s=SKILLS[i],owned=ownedSkills.indexOf(s.id)>=0,equipped=equippedSkills.indexOf(s.id)>=0;
var prereqMissing=false;
var canBuy=!owned&&!prereqMissing&&goldBal>=s.cost;
var cls=equipped?'store-item equipped':(owned?'store-item owned':'store-item');
var btn='';
if(!owned){
    if(prereqMissing)btn='<button class="si-btn" style="background:#444;color:#aaa;" disabled>🔒 needs Air Dash</button>';
    else btn='<button class="si-btn" style="background:'+(canBuy?'#0a6':'#333')+'" '+(canBuy?'onclick="buySkill(\''+s.id+'\')">BUY':'disabled>BUY')+'</button>';
}
else if(equipped)btn='<button class="si-btn" style="background:#a00" onclick="unequipSkill(\''+s.id+'\')">&times;</button><button class="si-btn" style="background:#800;margin-left:4px" onclick="sellSkill(\''+s.id+'\')">SELL</button>';
else btn='<button class="si-btn" style="background:#08a" onclick="equipSkill(\''+s.id+'\')">EQUIP</button><button class="si-btn" style="background:#800;margin-left:4px" onclick="sellSkill(\''+s.id+'\')">SELL</button>';
html+='<div class="'+cls+'"><div class="si-info"><div class="si-name">'+s.icon+' '+s.name+' <span onclick="showItemRules(\''+s.id+'\')" style="color:#0ff;cursor:pointer;font-size:0.7rem;margin-left:4px;">\u2139\ufe0f</span></div><div class="si-desc">'+s.preview+(s.id==='resurrect'&&owned?' <span style="color:#0ff;font-size:0.6rem;">'+(Date.now()-lastResurrectTime>=120000?'\u2713 Ready':'CD: '+Math.floor((120000-(Date.now()-lastResurrectTime))/60000)+'m'+Math.floor(((120000-(Date.now()-lastResurrectTime))%60000)/1000)+'s')+'</span>':'')+'</div></div><div class="si-cost" style="color:#ffd700">'+s.cost+'\u2605</div><div>'+btn+'</div></div>';}
}else if(storeTab==='cosmetics'){
var COS_CAT_ORDER={hat:0,cape:1,glow:2,trail:3,body:4,death:5,jump:6,platform:7};
var COS_TIER_ORDER={common:0,uncommon:1,rare:2,legendary:3,master:4};
var sortedCos=COSMETICS.slice().sort(function(a,b){
    var ai=(a.cat in COS_CAT_ORDER)?COS_CAT_ORDER[a.cat]:99;
    var bi=(b.cat in COS_CAT_ORDER)?COS_CAT_ORDER[b.cat]:99;
    if(ai!==bi)return ai-bi;
    var at=(a.tier in COS_TIER_ORDER)?COS_TIER_ORDER[a.tier]:0;
    var bt=(b.tier in COS_TIER_ORDER)?COS_TIER_ORDER[b.tier]:0;
    if(at!==bt)return at-bt;
    return (a.cost||0)-(b.cost||0);
});
for(var i=0;i<sortedCos.length;i++){var c=sortedCos[i],owned=ownedCosmetics.indexOf(c.id)>=0,equipped=equippedCosmetics[c.cat]===c.id,canBuy=!owned&&silverWallet>=c.cost;
var cls='store-item tier-'+c.tier+(equipped?' equipped':(owned?' owned':''));
var btn='';
var isChampionLocked=c.champion && !championStatus.unlocked;
if(isChampionLocked)btn='<button class="si-btn" style="background:#444;color:#aaa;" disabled>🔒 LOCKED</button>';
else if(!owned)btn='<button class="si-btn" style="background:'+(canBuy?'#0a6':'#333')+'" '+(canBuy?'onclick="buyCos(\''+c.id+'\')">BUY':'disabled>BUY')+'</button>';
else if(equipped)btn='<button class="si-btn" style="background:#a00" onclick="unequipCos(\''+c.id+'\',\''+c.cat+'\')">REMOVE</button>';
else btn='<button class="si-btn" style="background:#08a" onclick="equipCos(\''+c.id+'\',\''+c.cat+'\')">EQUIP</button>';
var costDisplay=isChampionLocked?'<span style="color:#fa0;font-size:0.65rem;">★ Master</span>':(c.champion?'<span style="color:#ffd700;font-size:0.65rem;">FREE</span>':c.cost+'\u2666');
html+='<div class="'+cls+'" onclick="showCosPreview(\''+c.id+'\')"><canvas class="si-preview" id="sp_'+c.id+'" width="50" height="50"></canvas><div class="si-info"><div class="si-name">'+c.icon+' '+c.name+'</div><div class="si-desc">'+c.preview+'</div></div><div class="si-cost" style="color:#ccc">'+costDisplay+'</div><div onclick="event.stopPropagation()">'+btn+'</div></div>';}
}else{
for(var i=0;i<CONSUMABLES.length;i++){var c=CONSUMABLES[i],qty=(c.id==='streakfreeze'?streakFreezes:(consumableInv[c.id]||0)),canBuy=silverWallet>=c.cost;
var maxed=(c.id==='streakfreeze'&&qty>=maxStreakFreezes);
html+='<div class="store-item"><div class="si-info"><div class="si-name">'+c.icon+' '+c.name+' <span onclick="showItemRules(\''+c.id+'\')" style="color:#0ff;cursor:pointer;font-size:0.7rem;margin-left:4px;">\u2139\ufe0f</span></div><div class="si-desc">'+c.preview+(qty>0?' <span style="color:#0f8">(Owned: '+qty+')</span>':'')+'</div></div><div class="si-cost" style="color:#ccc">'+c.cost+'\u2666</div><div><button class="si-btn" style="background:'+(canBuy&&!maxed?'#0a6':'#333')+'" '+(canBuy&&!maxed?'onclick="buyCon(\''+c.id+'\')">BUY':(maxed?'disabled>MAX':'disabled>BUY'))+'</button></div></div>';}
}
$('storeContent').innerHTML=html;
if(storeTab==='cosmetics')startCosPreview();
}
function buySkill(id){var s=SKILLS.find(function(x){return x.id===id;});if(!s||ownedSkills.indexOf(id)>=0||getGoldBalance()<s.cost)return;goldSpent+=s.cost;ownedSkills.push(id);save('goldSpent',goldSpent);save('ownedSkills',ownedSkills);if(equippedSkills.length<3){equippedSkills.push(id);save('equippedSkills',equippedSkills);}sendMetric('purchase',{kind:'skill',id:id,cost:s.cost,currency:'gold'});renderStore();}
function sellSkill(id){var s=SKILLS.find(function(x){return x.id===id;});if(!s||ownedSkills.indexOf(id)<0)return;goldSpent-=s.cost;ownedSkills.splice(ownedSkills.indexOf(id),1);var ei=equippedSkills.indexOf(id);if(ei>=0)equippedSkills.splice(ei,1);save('goldSpent',goldSpent);save('ownedSkills',ownedSkills);save('equippedSkills',equippedSkills);if(id==='airdash'&&reflexDashEnabled){reflexDashEnabled=false;save('reflexDashEnabled',reflexDashEnabled);}renderStore();}
function equipSkill(id){if(equippedSkills.length>=3||equippedSkills.indexOf(id)>=0)return;equippedSkills.push(id);save('equippedSkills',equippedSkills);if(id==='airdash'&&reflexDashEnabled){reflexDashEnabled=false;save('reflexDashEnabled',reflexDashEnabled);}renderStore();}
function unequipSkill(id){var ei=equippedSkills.indexOf(id);if(ei>=0)equippedSkills.splice(ei,1);save('equippedSkills',equippedSkills);renderStore();}
function toggleReflexDash(){
    if(!championStatus.unlocked)return;
    reflexDashEnabled = !reflexDashEnabled;
    save('reflexDashEnabled', reflexDashEnabled);
    // If turning ON, unequip Air Dash to prevent conflict (RD already provides AD effect)
    if(reflexDashEnabled){
        var ei = equippedSkills.indexOf('airdash');
        if(ei>=0){equippedSkills.splice(ei,1);save('equippedSkills',equippedSkills);}
    }
    renderStore();
}
function buyCos(id){var c=COSMETICS.find(function(x){return x.id===id;});if(!c||ownedCosmetics.indexOf(id)>=0||silverWallet<c.cost)return;if(c.champion&&!championStatus.unlocked)return;silverWallet-=c.cost;ownedCosmetics.push(id);equippedCosmetics[c.cat]=id;save('silver',silverWallet);save('ownedCosmetics',ownedCosmetics);save('equippedCosmetics',equippedCosmetics);sendMetric('purchase',{kind:'cosmetic',id:id,cat:c.cat,cost:c.cost,currency:'silver'});renderStore();}
function equipCos(id,cat){equippedCosmetics[cat]=id;save('equippedCosmetics',equippedCosmetics);renderStore();}
function unequipCos(id,cat){equippedCosmetics[cat]=null;save('equippedCosmetics',equippedCosmetics);renderStore();}
function buyCon(id){var c=CONSUMABLES.find(function(x){return x.id===id;});if(!c||silverWallet<c.cost)return;if(id==='namechange'){silverWallet-=c.cost;save('silver',silverWallet);showNamePrompt(function(){renderStore();});sendMetric('purchase',{kind:'consumable',id:id,cost:c.cost,currency:'silver'});return;}if(id==='streakfreeze'){if(streakFreezes>=maxStreakFreezes){addFloat(canvas.width/2,300,'MAX 2 FREEZES','#f80');return;}silverWallet-=c.cost;streakFreezes++;save('silver',silverWallet);save('streakFreezes',streakFreezes);sendMetric('purchase',{kind:'consumable',id:id,cost:c.cost,currency:'silver'});renderStore();return;}silverWallet-=c.cost;consumableInv[id]=(consumableInv[id]||0)+1;save('silver',silverWallet);save('consumableInv',consumableInv);sendMetric('purchase',{kind:'consumable',id:id,cost:c.cost,currency:'silver'});renderStore();}
function showNamePrompt(cb){
var ov=$('overlay');
$('ovTitle').textContent='ENTER NAME';
$('ovTitle').style.color='#0ff';
$('ovMsg').innerHTML='<input id="nameInput" type="text" maxlength="10" placeholder="5-10 chars" value="'+String(playerName||'').replace(/"/g,'&quot;')+'" style="width:200px;padding:10px;font-size:1.2rem;font-family:monospace;text-align:center;background:#111;color:#0ff;border:2px solid #0ff;border-radius:8px;text-transform:uppercase;letter-spacing:2px;">';
$('ovBtn').textContent='CONFIRM';$('ovBtn').style.display='inline-block';$('ovBtn').style.background='';
$('ovBtnCancel').style.display='none';
$('ovBtn').onclick=function(){
    var v=$('nameInput').value.replace(/[^a-zA-Z0-9]/g,'').slice(0,10);
    if(v.length<5){$('ovTitle').textContent='TOO SHORT (min 5)';$('ovTitle').style.color='#f05';return;}
    playerName=v.toUpperCase();save('playerName',playerName);
    if(!_sessionStartSent) sendSessionStart();
    sendMetric('name_set',{name:playerName,first:false});
    ov.classList.remove('active');if(cb)cb();
};
ov.classList.add('active');
}
function showCtrlPicker(cb){$('ctrlPicker').style.display='flex';W._ctrlPickerCb=cb;}
function pickCtrl(mode){ctrlMode=mode;save('ctrl',ctrlMode);$('ctrlPicker').style.display='none';if(W._ctrlPickerCb)W._ctrlPickerCb();}
var _onbCtrl='arrows';
function selectOnbCtrl(mode){_onbCtrl=mode;document.querySelectorAll('#onboard .onb-ctrl').forEach(function(b){b.classList.toggle('active',b.dataset.ctrl===mode);});}
function startDailyStage(){
    isDailyStage = true;
    dailyLevelObj = generateDailyLevel();
    curLvl = -1;
    deaths = 0;
    replayMode = false;
    _isFreshStageEntry = true;
    sessionStage = -2; // force reset on daily retry
    initLevelSelect();
    startLvl(-1);
}

function showOnboard(cb){
W._onbCb=cb;
_onbCtrl=ctrlMode||'arrows';
$('onbName').value=playerName||'';
$('onbWarn').textContent='';
selectOnbCtrl(_onbCtrl);
$('onboard').classList.add('active');
setTimeout(function(){$('onbName').focus();},200);
}
function finishOnboard(){
var v=$('onbName').value.replace(/[^a-zA-Z0-9]/g,'').slice(0,10);
if(v.length<5){$('onbWarn').textContent='Name must be 5-10 characters';return;}
playerName=v.toUpperCase();save('playerName',playerName);
ctrlMode=_onbCtrl;save('ctrl',ctrlMode);save('ctrlPicked',true);save('tutorialDone',true);
// Now that we have a name, fire deferred session_start (if not already) and a name_set event for funnel tracking
if(!_sessionStartSent) sendSessionStart();
sendMetric('name_set',{name:playerName,first:true});
$('onboard').classList.remove('active');
if(W._onbCb)W._onbCb();
}

function showPrivacyPolicy(){
var ov=$('overlay');
$('settings').classList.remove('active');
$('ovTitle').textContent='PRIVACY POLICY';
$('ovTitle').style.color='#0ff';
$('ovMsg').innerHTML=
  '<div style="font-size:0.75rem;color:#ccc;line-height:1.6;text-align:left;max-width:320px;">'+
  '<p style="margin-bottom:8px;"><b style="color:#0ff;">What we collect</b><br>'+
  'Anonymous gameplay events (levels started/completed, deaths, purchases) and optional player name. '+  'Device type, screen size, language, and country (from your connection) are collected automatically.</p>'+
  '<p style="margin-bottom:8px;"><b style="color:#0ff;">Why</b><br>'+
  'To understand how players interact with the game, identify balance issues, and improve the experience. No ads, no third-party trackers.</p>'+
  '<p style="margin-bottom:8px;"><b style="color:#0ff;">Where</b><br>'+
  'Data is stored on Cloudflare servers (United States) via D1 database and Workers.</p>'+
  '<p style="margin-bottom:8px;"><b style="color:#0ff;">How long</b><br>'+
  'Event data is retained for 90 days. Session tokens expire after 1 hour.</p>'+
  '<p style="margin-bottom:8px;"><b style="color:#0ff;">Opt out</b><br>'+
  'Metrics are anonymous and optional. To completely disable data collection, block network access to <code style="font-size:0.65rem;">ndj-metrics.jstylr.workers.dev</code> or play offline.</p>'+
  '<p style="margin-bottom:8px;"><b style="color:#0ff;">Your save data</b><br>'+
  'All game progress is stored locally in your browser (localStorage). We do not have access to it. Use Export/Import to back it up.</p>'+
  '<p><b style="color:#0ff;">Contact</b><br>'+
  'Questions? Reach out via the project repository.</p>'+
  '</div>';
$('ovBtn').textContent='CLOSE';
$('ovBtn').style.display='inline-block';
$('ovBtn').onclick=function(){ov.classList.remove('active');};
$('ovBtnExtra').style.display='none';
$('ovBtnReplay').style.display='none';
$('ovBtnCancel').style.display='none';
ov.classList.add('active');
}

function showDailyWin(){
    gameRunning=false; stopMusic();
    var ov=$('overlay');
    ov.onclick=null;
    $('homeTooltip').classList.remove('active');
    
    // Capture metrics before zeroing
    var _dg = runGold, _ds = runSilver, _dd = deaths, _dt = runTime, _dsp = stylePoints;
    // Save gems
    bonusGold += runGold; save('bonusGold', bonusGold);
    silverWallet += runSilver; save('silver', silverWallet);
    runGold = 0; runSilver = 0;
    
    // Roll reward
    var reward = rollDailyReward();
    var rewardText = applyDailyReward(reward);
    
    // Update daily stats
    var dstats = getDailyStats();
    dstats.played = true;
    dstats.completed = true;
    if(!dstats.bestTime || runTime < dstats.bestTime) dstats.bestTime = runTime;
    dstats.reward = reward;
    saveDailyStats(dstats);
    
    // Update streak
    var streak = updateStreak();
    
    // Metrics
    sendMetric('level_complete',{level:-1,name:'DAILY',time:_dt,deaths:_dd,gold:_dg,silver:_ds,style:_dsp,isDaily:true});
    
    $('ovTitle').textContent = '★ DAILY COMPLETE!';
    $('ovTitle').style.color = '#ffd700';
    $('ovMsg').innerHTML =
        '<div style="font-size:1.1rem;font-weight:700;color:#0ff;margin-bottom:8px;">DAILY STAGE CLEARED</div>'+
        '<div style="font-size:0.85rem;color:#ccc;line-height:1.6;">'+
        'Time: <b style="color:#0ff;">'+(runTime/1000).toFixed(2)+'s</b><br>'+
        'Deaths: '+deaths+'<br>'+
        'Style: '+stylePoints+'<br>'+
        (rewardText?'<div style="margin-top:8px;padding:6px 12px;background:rgba(255,215,0,0.1);border:1px solid rgba(255,215,0,0.3);border-radius:8px;color:#ffd700;font-weight:bold;">🎁 '+rewardText+'</div>':'')+
        (streak>1?'<div style="margin-top:6px;color:#fa0;font-size:0.8rem;">🔥 '+streak+'-day streak</div>':'')+
        '</div>';
    $('ovBtn').textContent = 'STAGE SELECT';
    $('ovBtn').style.display = 'inline-block';
    $('ovBtn').style.background = '';
    $('ovBtn').onclick = function(){ ov.classList.remove('active'); isDailyStage=false; dailyLevelObj=null; endGame(); };
    $('ovBtnExtra').style.display = 'inline-block';
    $('ovBtnExtra').textContent = '🔁 RETRY';
    $('ovBtnExtra').onclick = function(){ ov.classList.remove('active'); $('gameCanvas').classList.remove('grey'); $('gameCanvas').classList.remove('shake'); startDailyStage(); if(musOn) startMusic(); };
    $('ovBtnReplay').style.display = 'none';
    $('ovBtnCancel').style.display = 'inline-block';
    $('ovBtnCancel').textContent = '📤 SHARE';
    $('ovBtnCancel').style.background = 'linear-gradient(135deg,#25D366,#128C7E)';
    $('ovBtnCancel').onclick = function(){ shareDailyResult(); };
    ov.classList.add('active');
}

function showDailyDie(){
    gameRunning=false; stopMusic();
    $('homeTooltip').classList.remove('active');
    var ov=$('overlay');
    var tip = TIPS[Math.floor(Math.random() * TIPS.length)];
    var dstats = getDailyStats();
    var streak = dailyStreak;
    $('ovTitle').textContent = 'DAILY FAILED';
    $('ovTitle').style.color = '#f05';
    $('ovMsg').innerHTML =
        '<div style="font-size:0.85rem;color:#ccc;line-height:1.6;">'+
        'You collected some gems before falling.<br>'+
        (streak>1?'<div style="margin-top:6px;color:#fa0;font-size:0.8rem;">🔥 '+streak+'-day streak (play again to keep it!)</div>':'')+
        '<div style="margin-top:10px;font-size:0.7rem;color:#888;font-style:italic;">Tip: '+tip+'</div>'+
        '</div>';
    $('ovBtn').textContent = 'RETRY';
    $('ovBtn').style.display = 'inline-block';
    $('ovBtn').style.background = '';
    $('ovBtn').onclick = function(){ ov.classList.remove('active'); $('gameCanvas').classList.remove('grey'); $('gameCanvas').classList.remove('shake'); startDailyStage(); if(musOn) startMusic(); };
    $('ovBtnExtra').style.display = 'inline-block';
    $('ovBtnExtra').textContent = '🏠 STAGE SELECT';
    $('ovBtnExtra').onclick = function(){ ov.classList.remove('active'); isDailyStage=false; dailyLevelObj=null; endGame(); };
    $('ovBtnReplay').style.display = 'none';
    $('ovBtnCancel').style.display = 'none';
    ov.classList.add('active');
}

function shareDailyResult(){
    var dstats = getDailyStats();
    var txt = '🔥 N3ON DashJ Daily Stage — '+getGameDayShort()+'\n'+
              '⏱ Time: '+((dstats.bestTime||0)/1000).toFixed(2)+'s\n'+
              '🔥 Streak: '+dailyStreak+' days\n'+
              (dstats.reward?'🎁 Reward: '+formatDailyRewardText(dstats.reward)+'\n':'')+
              '\nCan you beat today\'s daily?\n'+
              '🔗 '+location.href;
    if(navigator.share){
        navigator.share({title:'N3ON DashJ Daily',text:txt}).catch(function(){});
    } else if(navigator.clipboard&&navigator.clipboard.writeText){
        navigator.clipboard.writeText(txt);
        addFloat(canvas.width/2,300,'COPIED!','#0f8');
    }
}
function formatDailyRewardText(reward){
    if(!reward) return '';
    if(reward.type==='gold') return 'Gold';
    if(reward.type==='silver') return 'Silver';
    if(reward.type==='consumable') return reward.id==='triplejump'?'Triple Jump':'Double Shield';
    if(reward.type==='streakFreeze') return 'Streak Freeze';
    return '';
}

var cosPreviewAnim=0;
var COS_COLORS={trail_cyan:'#0ff',trail_fire:'#f80',trail_ice:'#8ef',trail_rainbow:null,trail_glitch:null,jump_sparks:'#ff0',jump_lightning:'#4af',glow_gold:'#ffd700',glow_pink:'#f0a',glow_rainbow:null,glow_champion:'#ffd700',death_pixel:'#fff',death_dissolve:'#aaf',death_supernova:'#f80',death_logo:'#0ff',plat_holo:'#0ff'};
function animCosPreview(){
if(!$('store')||!$('store').classList.contains('active')||storeTab!=='cosmetics'){cosPreviewAnim=0;return;}
var t=Date.now()*0.003;
for(var i=0;i<COSMETICS.length;i++){
var c=COSMETICS[i],cv=document.getElementById('sp_'+c.id);
if(!cv)continue;
var x=cv.getContext('2d');
x.clearRect(0,0,50,50);
var cx=25,cy=28;
// Draw player dot (skip when previewing body/hat/cape — those draw their own stickman)
if(c.cat!=='body' && c.cat!=='hat' && c.cat!=='cape'){
    x.fillStyle='#0ff';x.shadowBlur=4;x.shadowColor='#0ff';
    if(c.cat==='glow'){
        var gc=COS_COLORS[c.id];
        if(c.id==='glow_rainbow')gc='hsl('+((t*60)%360)+',100%,60%)';
        x.shadowBlur=10;x.shadowColor=gc;x.fillStyle=gc;
    }
    x.beginPath();x.arc(cx,cy,5,0,Math.PI*2);x.fill();x.shadowBlur=0;
}
// Trail
if(c.cat==='trail'){
    var tc=COS_COLORS[c.id];
    for(var ti=1;ti<=4;ti++){
        if(c.id==='trail_rainbow')tc='hsl('+(((t*60)-ti*30)%360)+',100%,60%)';
        if(c.id==='trail_glitch')tc=Math.random()>0.5?'#0f0':'#f0f';
        x.globalAlpha=0.7-ti*0.15;x.fillStyle=tc;
        x.beginPath();x.arc(cx-ti*6,cy+Math.sin(t+ti)*2,4-ti*0.5,0,Math.PI*2);x.fill();
    }
    x.globalAlpha=1;
}
// Jump particles
if(c.cat==='jump'){
    var jc=COS_COLORS[c.id];
    var jt=(t*2)%2;
    if(jt<1){for(var ji=0;ji<5;ji++){
        x.globalAlpha=1-jt;x.fillStyle=jc;
        x.beginPath();x.arc(cx+Math.sin(ji*1.3)*8,cy+6+jt*12,2-jt,0,Math.PI*2);x.fill();
    }x.globalAlpha=1;}
}
// Death effect
if(c.cat==='death'){
    var dt2=(t*1.5)%3;
    if(dt2>2){var dp=dt2-2;
    x.globalAlpha=1-dp;
    if(c.id==='death_pixel'){for(var di=0;di<6;di++){x.fillStyle=COS_COLORS[c.id];x.fillRect(cx-8+di*4+Math.sin(di+t)*3,cy-6+Math.cos(di+t)*5,3,3);}}
    else if(c.id==='death_dissolve'){for(var di=0;di<6;di++){x.fillStyle=COS_COLORS[c.id];x.beginPath();x.arc(cx+Math.sin(di*2)*8,cy-dp*15+Math.cos(di)*5,2,0,Math.PI*2);x.fill();}}
    else if(c.id==='death_supernova'){x.strokeStyle='#f80';x.lineWidth=2;x.beginPath();x.arc(cx,cy,dp*15,0,Math.PI*2);x.stroke();}
    else if(c.id==='death_logo'){x.fillStyle='#0ff';x.font='bold 8px monospace';x.textAlign='center';x.fillText('N30N',cx,cy+3);}
    x.globalAlpha=1;}
}
// Platform
if(c.cat==='platform'){
    x.globalAlpha=0.5+Math.sin(t*4)*0.3;
    x.fillStyle='rgba(0,255,255,0.2)';x.fillRect(8,38,34,6);
    x.strokeStyle='#0ff';x.lineWidth=1;x.beginPath();x.moveTo(8,38);x.lineTo(42,38);x.stroke();
    x.globalAlpha=1;
}
if(c.cat==='hat'){
    x.strokeStyle='#0ff';x.lineWidth=1.5;x.beginPath();x.arc(cx,cy-2,5,0,Math.PI*2);x.stroke();
    if(c.id==='hat_tophat'){x.fillStyle='#222';x.fillRect(cx-4,cy-12,8,6);x.fillRect(cx-6,cy-7,12,2);}
    else if(c.id==='hat_horns'){x.strokeStyle='#f00';x.lineWidth=1.5;x.beginPath();x.moveTo(cx-4,cy-5);x.lineTo(cx-5,cy-13);x.moveTo(cx+4,cy-5);x.lineTo(cx+5,cy-13);x.stroke();}
    else if(c.id==='hat_catears'){x.fillStyle='#0ff';x.beginPath();x.moveTo(cx-5,cy-4);x.lineTo(cx-3,cy-11);x.lineTo(cx-1,cy-4);x.fill();x.beginPath();x.moveTo(cx+1,cy-4);x.lineTo(cx+3,cy-11);x.lineTo(cx+5,cy-4);x.fill();}
    else if(c.id==='hat_crown'){x.fillStyle='#ffd700';x.beginPath();x.moveTo(cx-5,cy-5);x.lineTo(cx-5,cy-11);x.lineTo(cx-2,cy-8);x.lineTo(cx,cy-12);x.lineTo(cx+2,cy-8);x.lineTo(cx+5,cy-11);x.lineTo(cx+5,cy-5);x.fill();}
    else if(c.id==='hat_halo'){x.strokeStyle='#ffd700';x.lineWidth=1.5;x.beginPath();x.ellipse(cx,cy-10,6,2,0,0,Math.PI*2);x.stroke();}
    else if(c.id==='hat_antenna'){x.strokeStyle='#888';x.lineWidth=1;x.beginPath();x.moveTo(cx,cy-7);x.lineTo(cx,cy-16);x.stroke();x.fillStyle='#0f0';x.beginPath();x.arc(cx,cy-16,2,0,Math.PI*2);x.fill();}
}
if(c.cat==='cape'){
    var capeCol=c.id==='cape_white'?'#ddd':c.id==='cape_red'?'#e22':c.id==='cape_rainbow'?'hsl('+((t*60)%360)+',100%,60%)':'#f80';
    // Cape behind body
    x.strokeStyle=capeCol;x.lineWidth=2;x.globalAlpha=0.7;
    x.beginPath();x.moveTo(cx-2,cy);x.quadraticCurveTo(cx-8,cy+8+Math.sin(t*3)*2,cx-6,cy+16);x.stroke();
    x.globalAlpha=1;
    // Stickman in front of cape
    x.strokeStyle='#0ff';x.lineWidth=2;
    x.beginPath();x.arc(cx,cy-2,5,0,Math.PI*2);x.stroke();
    x.beginPath();x.moveTo(cx,cy+3);x.lineTo(cx,cy+12);x.stroke();
    x.beginPath();x.moveTo(cx,cy+12);x.lineTo(cx-4,cy+18);x.moveTo(cx,cy+12);x.lineTo(cx+4,cy+18);x.stroke();
}
if(c.cat==='body'){
    var bCol=c.id==='body_gold'?'#ffd700':c.id==='body_pink'?'#f0a':c.id==='body_black'?'#222':'hsl('+((t*60)%360)+',100%,60%)';
    x.strokeStyle=bCol;x.lineWidth=2;
    x.beginPath();x.arc(cx,cy-2,5,0,Math.PI*2);x.stroke();
    x.beginPath();x.moveTo(cx,cy+3);x.lineTo(cx,cy+12);x.stroke();
    x.beginPath();x.moveTo(cx,cy+12);x.lineTo(cx-4,cy+18);x.moveTo(cx,cy+12);x.lineTo(cx+4,cy+18);x.stroke();
}
}
cosPreviewAnim=requestAnimationFrame(animCosPreview);
}
function startCosPreview(){if(!cosPreviewAnim)animCosPreview();}
var portraitAnim=0;
function animPortrait(){
    var cv=$('lsCharPortrait');
    if(!cv||!$('levelSelect')||!$('levelSelect').classList.contains('active')){portraitAnim=0;return;}
    // Skip rendering when an overlay is on top — saves CPU and avoids any bleed-through
    if(($('store')&&$('store').classList.contains('active'))||
       ($('settings')&&$('settings').classList.contains('active'))||
       ($('gameSettings')&&$('gameSettings').classList.contains('active'))||
       ($('overlay')&&$('overlay').classList.contains('active'))||
       ($('pause')&&$('pause').classList.contains('active'))){
        portraitAnim=requestAnimationFrame(animPortrait);
        return;
    }
    var cx=cv.getContext('2d');
    // Resize canvas to match displayed CSS size for sharp rendering
    var w=cv.clientWidth, h=cv.clientHeight;
    if(w>0 && h>0 && (cv.width!==w || cv.height!==h)){cv.width=w;cv.height=h;}
    cx.clearRect(0,0,cv.width,cv.height);
    var t=Date.now()*0.001;
    // Scale fits character in canvas: width is constrained by limbs (~18 units), height by total (~32 units)
    var scale=Math.min(cv.width/20, cv.height/34);
    var charY = cv.height*0.55;
    // Ground motion streaks scrolling left (suggests forward run)
    cx.strokeStyle='rgba(255,255,255,0.18)';cx.lineWidth=1;
    var groundY = charY + 11*scale;
    var streakOff = (t*100) % 12;
    for(var sk=-streakOff; sk<cv.width; sk+=12){
        cx.beginPath();cx.moveTo(sk,groundY);cx.lineTo(sk+5,groundY);cx.stroke();
    }
    drawCharOnCtx(cx, cv.width/2, charY, scale, t);
    portraitAnim=requestAnimationFrame(animPortrait);
}
function startPortrait(){if(!portraitAnim)animPortrait();}

var cosFullPreviewId=0,cosFullPreviewItem=null;
function showCosPreview(id){
var c=COSMETICS.find(function(x){return x.id===id;});
if(!c)return;
cosFullPreviewItem=c;
$('cosPreviewPanel').style.display='flex';
$('cosPreviewName').textContent=c.icon+' '+c.name;
$('cosPreviewName').style.color=c.tier==='master'?'#ffd700':c.tier==='legendary'?'#f0f':c.tier==='rare'?'#0af':c.tier==='uncommon'?'#0f8':'#fff';
if(!cosFullPreviewId)animCosFullPreview();
}
function closeCosPreview(){
$('cosPreviewPanel').style.display='none';
cosFullPreviewItem=null;
if(cosFullPreviewId){cancelAnimationFrame(cosFullPreviewId);cosFullPreviewId=0;}
}
// Reusable character renderer — draws the equipped-cosmetic character on any context.
// Used by stage-select portrait, share PNGs, and cosmetic preview.
function drawCharOnCtx(x, cx, cy, scale, t){
    var s=scale||1;
    // Resolve cosmetics from equippedCosmetics
    var glowCos=equippedCosmetics.glow, bodyCos=equippedCosmetics.body;
    var hatCos=equippedCosmetics.hat, capeCos=equippedCosmetics.cape, trailCos=equippedCosmetics.trail;
    // Body color
    var bodyCol='#0ff';
    if(bodyCos==='body_gold')bodyCol='#ffd700';
    else if(bodyCos==='body_pink')bodyCol='#f0a';
    else if(bodyCos==='body_black')bodyCol='#222';
    else if(bodyCos==='body_rainbow')bodyCol='hsl('+((t*90)%360)+',100%,60%)';
    // Glow color
    var glowCol=null;
    if(glowCos==='glow_gold'||glowCos==='glow_champion')glowCol='#ffd700';
    else if(glowCos==='glow_pink')glowCol='#f0a';
    else if(glowCos==='glow_rainbow')glowCol='hsl('+((t*90)%360)+',100%,60%)';
    var cycle=t*6;

    // Trail (behind body)
    if(trailCos){
        var tc='#0ff';
        if(trailCos==='trail_fire')tc='#f80';
        else if(trailCos==='trail_ice')tc='#8ef';
        for(var ti=1;ti<=5;ti++){
            if(trailCos==='trail_rainbow')tc='hsl('+(((t*90)-ti*20)%360)+',100%,60%)';
            else if(trailCos==='trail_glitch')tc=Math.random()>0.5?'#0f0':'#f0f';
            x.globalAlpha=0.7-ti*0.12;
            x.fillStyle=tc;
            x.beginPath();x.arc(cx-ti*8*s,cy+Math.sin(cycle-ti*0.4)*2,(5-ti*0.6)*s,0,Math.PI*2);x.fill();
        }
        x.globalAlpha=1;
    }

    // Cape (behind body)
    if(capeCos){
        var cCol=capeCos==='cape_white'?'#ddd':capeCos==='cape_red'?'#e22':capeCos==='cape_rainbow'?'hsl('+((t*90)%360)+',100%,60%)':'#f80';
        var cw=Math.sin(t*3)*3*s;
        x.strokeStyle=cCol;x.lineWidth=3*s;x.globalAlpha=0.7;
        x.beginPath();x.moveTo(cx-1*s,cy-4*s);x.quadraticCurveTo(cx-9*s-cw,cy+4*s,cx-7*s-cw*1.2,cy+14*s);x.stroke();
        x.beginPath();x.moveTo(cx,cy-4*s);x.quadraticCurveTo(cx-6*s-cw*.6,cy+4*s,cx-4*s-cw,cy+13*s);x.stroke();
        if(capeCos==='cape_fire'){x.strokeStyle='#ff0';x.lineWidth=2*s;x.beginPath();x.moveTo(cx-7*s-cw*1.2,cy+14*s);x.lineTo(cx-9*s-cw*1.6,cy+18*s+Math.sin(t*8)*2);x.stroke();}
        x.globalAlpha=1;
    }

    // Champion sparks (behind body for glow_champion)
    if(glowCos==='glow_champion'){
        var sp=(t*3)%1;
        for(var spi=0;spi<4;spi++){
            var spP=(sp+spi*0.25)%1;
            x.globalAlpha=1-spP;
            x.fillStyle=spi%2===0?'#ffd700':'#fff8a0';
            x.beginPath();x.arc(cx+Math.sin(t+spi*1.5)*7*s,cy+8*s-spP*22*s,2.5*s,0,Math.PI*2);x.fill();
        }
        x.globalAlpha=1;
    }

    // Glow shadow
    if(glowCol){
        var champPulse=glowCos==='glow_champion'?(Math.sin(Date.now()/180)*0.4+0.8):1;
        x.shadowBlur=(glowCos==='glow_champion'?22:18)*s*champPulse;
        x.shadowColor=glowCol;
    } else if(bodyCos==='body_black'){
        x.shadowBlur=0;
    } else {
        x.shadowBlur=10*s;x.shadowColor=bodyCol;
    }

    // Stickman with body color
    x.strokeStyle=bodyCol;x.lineWidth=2.5*s;x.lineCap='round';x.lineJoin='round';
    // Body bob — oscillates twice per leg cycle (impact at each footfall)
    var bob = Math.abs(Math.sin(cycle))*1.2*s;
    // Head
    x.beginPath();x.arc(cx,cy-12*s-bob,5*s,0,Math.PI*2);x.stroke();
    // Visor
    x.fillStyle=bodyCol;x.fillRect(cx+2*s,cy-14*s-bob,4*s,2*s);
    // Torso
    x.beginPath();x.moveTo(cx,cy-7*s-bob);x.lineTo(cx,cy+5*s-bob);x.stroke();
    // Legs — alternating swing, lift when forward
    var hipY = cy+5*s-bob;
    var lf=Math.sin(cycle)*1.2,lb=Math.sin(cycle+Math.PI)*1.2;
    var lfLift=Math.max(0,Math.cos(cycle))*3*s, lbLift=Math.max(0,Math.cos(cycle+Math.PI))*3*s;
    x.beginPath();x.moveTo(cx,hipY);x.lineTo(cx+Math.sin(lf)*10*s,hipY+Math.cos(lf)*10*s-lfLift);x.stroke();
    x.beginPath();x.moveTo(cx,hipY);x.lineTo(cx+Math.sin(lb)*10*s,hipY+Math.cos(lb)*10*s-lbLift);x.stroke();
    // Arms — opposite phase to legs
    var shoulderY = cy-4*s-bob;
    var af=Math.sin(cycle+Math.PI)*1.0,ab=Math.sin(cycle)*1.0;
    x.beginPath();x.moveTo(cx,shoulderY);x.lineTo(cx+Math.sin(af)*8*s,shoulderY+Math.cos(af)*8*s);x.stroke();
    x.beginPath();x.moveTo(cx,shoulderY);x.lineTo(cx+Math.sin(ab)*8*s,shoulderY+Math.cos(ab)*8*s);x.stroke();
    x.shadowBlur=0;

    // Hat
    if(hatCos){
        var hy=cy-12*s-bob;
        if(hatCos==='hat_tophat'){x.fillStyle='#222';x.fillRect(cx-6*s,hy-12*s,12*s,9*s);x.fillRect(cx-9*s,hy-4*s,18*s,4*s);}
        else if(hatCos==='hat_horns'){x.strokeStyle='#f00';x.lineWidth=2.5*s;x.beginPath();x.moveTo(cx-5*s,hy-3*s);x.lineTo(cx-8*s,hy-15*s);x.moveTo(cx+5*s,hy-3*s);x.lineTo(cx+8*s,hy-15*s);x.stroke();}
        else if(hatCos==='hat_catears'){x.fillStyle=bodyCol;x.beginPath();x.moveTo(cx-7*s,hy-3*s);x.lineTo(cx-4*s,hy-13*s);x.lineTo(cx-1*s,hy-3*s);x.fill();x.beginPath();x.moveTo(cx+1*s,hy-3*s);x.lineTo(cx+4*s,hy-13*s);x.lineTo(cx+7*s,hy-3*s);x.fill();}
        else if(hatCos==='hat_crown'){x.fillStyle='#ffd700';x.beginPath();x.moveTo(cx-7*s,hy-5*s);x.lineTo(cx-7*s,hy-13*s);x.lineTo(cx-3*s,hy-9*s);x.lineTo(cx,hy-15*s);x.lineTo(cx+3*s,hy-9*s);x.lineTo(cx+7*s,hy-13*s);x.lineTo(cx+7*s,hy-5*s);x.fill();}
        else if(hatCos==='hat_halo'){x.strokeStyle='#ffd700';x.lineWidth=2*s;x.beginPath();x.ellipse(cx,hy-12*s,9*s,3*s,0,0,Math.PI*2);x.stroke();}
        else if(hatCos==='hat_antenna'){x.strokeStyle='#888';x.lineWidth=2*s;x.beginPath();x.moveTo(cx,hy-5*s);x.lineTo(cx,hy-22*s);x.stroke();x.fillStyle='#0f0';x.beginPath();x.arc(cx,hy-22*s,3*s,0,Math.PI*2);x.fill();}
    }
}

function animCosFullPreview(){
var cv=$('cosPreviewCanvas');
if(!cv||!cosFullPreviewItem){cosFullPreviewId=0;return;}
var x=cv.getContext('2d'),w=280,h=160;
var t=Date.now()*0.001;
var c=cosFullPreviewItem;
x.clearRect(0,0,w,h);
// Dark bg
x.fillStyle='#0a0a18';x.fillRect(0,0,w,h);
// Floor
x.strokeStyle='rgba(0,229,255,0.3)';x.lineWidth=1;
x.beginPath();x.moveTo(0,h*0.75);x.lineTo(w,h*0.75);x.stroke();
// Grid
x.globalAlpha=0.05;x.strokeStyle='#0ff';
var gOff=(t*40)%30;
for(var gx=-gOff;gx<w;gx+=30){x.beginPath();x.moveTo(gx,0);x.lineTo(gx,h);x.stroke();}
x.globalAlpha=1;

var px=w*0.5,py=h*0.75-30;
var cycle=t*4;

// Compute body color (default cyan unless previewing a body cosmetic)
var bodyCol='#0ff';
if(c.cat==='body'){
    if(c.id==='body_gold')bodyCol='#ffd700';
    else if(c.id==='body_pink')bodyCol='#f0a';
    else if(c.id==='body_black')bodyCol='#222';
    else if(c.id==='body_rainbow')bodyCol='hsl('+((t*90)%360)+',100%,60%)';
}
// Compute glow color (default cyan unless previewing a glow)
var glowCol='#0ff';
if(c.cat==='glow'){
    if(c.id==='glow_gold')glowCol='#ffd700';
    else if(c.id==='glow_pink')glowCol='#f0a';
    else if(c.id==='glow_rainbow')glowCol='hsl('+((t*90)%360)+',100%,60%)';
    else if(c.id==='glow_champion')glowCol='#ffd700';
}

// Platform cosmetic — show enhanced floor
if(c.cat==='platform'){
    x.globalAlpha=0.4+Math.sin(t*5)*0.3;
    x.fillStyle='rgba(0,255,255,0.15)';x.fillRect(30,h*0.75,w-60,8);
    x.strokeStyle='#0ff';x.lineWidth=1;
    x.setLineDash([4,4]);x.beginPath();x.moveTo(30,h*0.75);x.lineTo(w-30,h*0.75);x.stroke();x.setLineDash([]);
    x.globalAlpha=0.15;
    for(var sl=0;sl<8;sl+=2){x.fillStyle='#0ff';x.fillRect(30,h*0.75+sl,w-60,1);}
    x.globalAlpha=1;
}

// Cape (drawn BEHIND the body)
if(c.cat==='cape'){
    var cCol=c.id==='cape_white'?'#ddd':c.id==='cape_red'?'#e22':c.id==='cape_rainbow'?'hsl('+((t*90)%360)+',100%,60%)':'#f80';
    var cw=Math.sin(t*3)*3;
    x.strokeStyle=cCol;x.lineWidth=3;x.globalAlpha=0.7;
    // Cape from neck (px, py-4) to a tip ~16px below — between in-game (~11) and original preview (~26)
    x.beginPath();x.moveTo(px-1,py-4);x.quadraticCurveTo(px-9-cw,py+4,px-7-cw*1.2,py+14);x.stroke();
    x.beginPath();x.moveTo(px,py-4);x.quadraticCurveTo(px-6-cw*.6,py+4,px-4-cw,py+13);x.stroke();
    if(c.id==='cape_fire'){x.strokeStyle='#ff0';x.lineWidth=2;x.beginPath();x.moveTo(px-7-cw*1.2,py+14);x.lineTo(px-9-cw*1.6,py+18+Math.sin(t*8)*2);x.stroke();}
    x.globalAlpha=1;
}

// Trail (drawn BEHIND the body)
if(c.cat==='trail'){
    var tc='#0ff';
    for(var ti=1;ti<=6;ti++){
        if(c.id==='trail_cyan')tc='#0ff';
        else if(c.id==='trail_fire')tc='#f80';
        else if(c.id==='trail_ice')tc='#8ef';
        else if(c.id==='trail_rainbow')tc='hsl('+(((t*90)-ti*20)%360)+',100%,60%)';
        else if(c.id==='trail_glitch')tc=Math.random()>0.5?'#0f0':'#f0f';
        x.globalAlpha=0.7-ti*0.1;
        x.fillStyle=tc;
        var tx=px-ti*10,tpy=py+Math.sin(cycle-ti*0.4)*2;
        x.beginPath();x.arc(tx,tpy,5-ti*0.5,0,Math.PI*2);x.fill();
    }
    x.globalAlpha=1;
}

// Champion's Aura ascending sparks (behind body)
if(c.cat==='glow' && c.id==='glow_champion'){
    var sparkT=(t*3)%1;
    for(var spi=0;spi<5;spi++){
        var spP=(sparkT+spi*0.2)%1;
        x.globalAlpha=1-spP;
        x.fillStyle=spi%2===0?'#ffd700':'#fff8a0';
        x.beginPath();x.arc(px+Math.sin(t+spi*1.5)*8,py+8-spP*24,2.5,0,Math.PI*2);x.fill();
    }
    x.globalAlpha=1;
}

// Apply glow shadow before drawing body
if(c.cat==='glow'){
    var champPulse=c.id==='glow_champion'?(Math.sin(Date.now()/180)*0.4+0.8):1;
    x.shadowBlur=(c.id==='glow_champion'?22:20)*champPulse;
    x.shadowColor=glowCol;
}else{
    x.shadowBlur=10;x.shadowColor=bodyCol;
}

// Stickman with body color
x.strokeStyle=bodyCol;x.lineWidth=2.5;x.lineCap='round';x.lineJoin='round';
// Head
x.beginPath();x.arc(px,py-12,5,0,Math.PI*2);x.stroke();
// Visor
x.fillStyle=bodyCol;x.fillRect(px+2,py-14,4,2);
// Torso
x.beginPath();x.moveTo(px,py-7);x.lineTo(px,py+5);x.stroke();
// Legs (running cycle)
var lf=Math.sin(cycle)*1.0,lb=Math.sin(cycle+Math.PI)*1.0;
x.beginPath();x.moveTo(px,py+5);x.lineTo(px+Math.sin(lf)*10,py+5+Math.cos(lf)*10);x.stroke();
x.beginPath();x.moveTo(px,py+5);x.lineTo(px+Math.sin(lb)*10,py+5+Math.cos(lb)*10);x.stroke();
// Arms
var af=Math.sin(cycle+Math.PI)*0.8,ab=Math.sin(cycle)*0.8;
x.beginPath();x.moveTo(px,py-4);x.lineTo(px+Math.sin(af)*8,py-4+Math.cos(af)*8);x.stroke();
x.beginPath();x.moveTo(px,py-4);x.lineTo(px+Math.sin(ab)*8,py-4+Math.cos(ab)*8);x.stroke();
x.shadowBlur=0;

// Hat (drawn ON TOP of head)
if(c.cat==='hat'){
    var hy=py-12;
    if(c.id==='hat_tophat'){x.fillStyle='#222';x.fillRect(px-6,hy-12,12,9);x.fillRect(px-9,hy-4,18,4);}
    else if(c.id==='hat_horns'){x.strokeStyle='#f00';x.lineWidth=2.5;x.beginPath();x.moveTo(px-5,hy-3);x.lineTo(px-8,hy-15);x.moveTo(px+5,hy-3);x.lineTo(px+8,hy-15);x.stroke();}
    else if(c.id==='hat_catears'){x.fillStyle=bodyCol;x.beginPath();x.moveTo(px-7,hy-3);x.lineTo(px-4,hy-13);x.lineTo(px-1,hy-3);x.fill();x.beginPath();x.moveTo(px+1,hy-3);x.lineTo(px+4,hy-13);x.lineTo(px+7,hy-3);x.fill();}
    else if(c.id==='hat_crown'){x.fillStyle='#ffd700';x.beginPath();x.moveTo(px-7,hy-5);x.lineTo(px-7,hy-13);x.lineTo(px-3,hy-9);x.lineTo(px,hy-15);x.lineTo(px+3,hy-9);x.lineTo(px+7,hy-13);x.lineTo(px+7,hy-5);x.fill();}
    else if(c.id==='hat_halo'){x.strokeStyle='#ffd700';x.lineWidth=2;x.beginPath();x.ellipse(px,hy-12,9,3,0,0,Math.PI*2);x.stroke();}
    else if(c.id==='hat_antenna'){x.strokeStyle='#888';x.lineWidth=2;x.beginPath();x.moveTo(px,hy-5);x.lineTo(px,hy-22);x.stroke();x.fillStyle='#0f0';x.beginPath();x.arc(px,hy-22,3,0,Math.PI*2);x.fill();}
}

// Jump particles cosmetic (puffs at feet)
if(c.cat==='jump'){
    var jc=c.id==='jump_sparks'?'#ff0':'#4af';
    var jt=(t*3)%2;
    if(jt<0.8){
        x.globalAlpha=1-jt/0.8;
        for(var ji=0;ji<8;ji++){
            var ja=ji/8*Math.PI*2;
            x.fillStyle=jc;
            x.beginPath();x.arc(px+Math.cos(ja)*(5+jt*20),py+15+Math.sin(ja)*(3+jt*10),c.id==='jump_lightning'?1.5:2,0,Math.PI*2);x.fill();
        }
        if(c.id==='jump_lightning'){
            x.strokeStyle=jc;x.lineWidth=1.5;
            for(var ji=0;ji<3;ji++){
                var bx=px-8+ji*8,by=py+15;
                x.beginPath();x.moveTo(bx,by);x.lineTo(bx+2,by+5+jt*8);x.lineTo(bx-1,by+10+jt*12);x.stroke();
            }
        }
        x.globalAlpha=1;
    }
}

// Death cosmetic (periodic death cycle)
if(c.cat==='death'){
    var dt2=(t*0.8)%3;
    if(dt2>2.2){
        var dp=(dt2-2.2)/0.8;
        x.globalAlpha=1-dp;
        if(c.id==='death_pixel'){for(var di=0;di<12;di++){x.fillStyle='#fff';x.fillRect(px-15+di*3+Math.sin(di+t*5)*5,py-15+Math.cos(di+t*3)*10,3,3);}}
        else if(c.id==='death_dissolve'){for(var di=0;di<10;di++){x.fillStyle='#aaf';x.beginPath();x.arc(px+Math.sin(di*1.5)*15,py-dp*30+Math.cos(di)*10,2,0,Math.PI*2);x.fill();}}
        else if(c.id==='death_supernova'){x.strokeStyle='#f80';x.lineWidth=3-dp*2;x.beginPath();x.arc(px,py,dp*40,0,Math.PI*2);x.stroke();for(var di=0;di<8;di++){x.fillStyle='#ff0';x.beginPath();x.arc(px+Math.cos(di+t)*dp*35,py+Math.sin(di+t)*dp*35,2,0,Math.PI*2);x.fill();}}
        else if(c.id==='death_logo'){x.fillStyle='#0ff';x.font='bold 14px monospace';x.textAlign='center';x.fillText('N30N',px,py);}
        x.globalAlpha=1;
    }
}

cosFullPreviewId=requestAnimationFrame(animCosFullPreview);
}

var adjusting=false;
var btnSize=80;
loadCurrentCtrlLayout();
function enterAdjustMode(){
$('gameSettings').classList.remove('active');
$('adjustOverlay').classList.add('active');
$('adjustDone').style.display='block';
$('adjustPanel').style.display='flex';
$('adjSize').value=btnSize;
$('adjSizeVal').textContent=btnSize+'px';
document.body.classList.add('adjust-mode');
adjusting=true;
if(ctrlMode==='analog'){$('jZone').classList.add('active');$('jBtn').classList.add('active');$('arrowControls').classList.remove('active');}
else{$('jZone').classList.remove('active');$('jBtn').classList.add('active');$('arrowControls').classList.add('active');}
applyJoySettings();
initAdjustDrag();
}
function exitAdjustMode(){
adjusting=false;
$('adjustOverlay').classList.remove('active');
$('adjustDone').style.display='none';
$('adjustPanel').style.display='none';
document.body.classList.remove('adjust-mode');
save('padX',padX);save('padY',padY);save('jSize',jSize);save('btnSize',btnSize);
saveCurrentCtrlLayout();
applyJoySettings();
if(!gameRunning){$('jZone').classList.remove('active');$('jBtn').classList.remove('active');$('arrowControls').classList.remove('active');}
$('gameSettings').classList.add('active');
}
function applyAdjustSize(v){
btnSize=parseInt(v);
$('adjSizeVal').textContent=btnSize+'px';
applyBtnSize();
}
function applyBtnSize(){
$('jBtn').style.width=btnSize+'px';$('jBtn').style.height=btnSize+'px';
var btns=document.querySelectorAll('.arr-btn');
for(var i=0;i<btns.length;i++){btns[i].style.width=btnSize+'px';btns[i].style.height=btnSize+'px';}
}
function resetAdjustDefaults(){
padX=20;padY=20;jSize=150;btnSize=80;
$('adjSize').value=80;$('adjSizeVal').textContent='80px';
applyJoySettings();applyBtnSize();
}
var adjustDragInit=false;
function initAdjustDrag(){
if(adjustDragInit)return;
adjustDragInit=true;
var overlay=$('adjustOverlay'),startX,startY,startPadX,startPadY;
function onStart(e){
if(!adjusting)return;
var t=e.touches?e.touches[0]:e;
startX=t.clientX;startY=t.clientY;startPadX=padX;startPadY=padY;
}
function onMove(e){
if(!adjusting)return;
e.preventDefault();
var t=e.touches?e.touches[0]:e;
var dx=t.clientX-startX,dy=t.clientY-startY;
padX=clamp(startPadX+dx,-W.innerWidth/3,W.innerWidth/3);
padY=clamp(startPadY-dy,0,W.innerHeight/2);
applyJoySettings();
}
overlay.addEventListener('touchstart',onStart,{passive:false});
overlay.addEventListener('touchmove',onMove,{passive:false});
overlay.addEventListener('mousedown',function(e){
if(!adjusting)return;
onStart(e);
function mm(ev){onMove(ev);}
function mu(){document.removeEventListener('mousemove',mm);document.removeEventListener('mouseup',mu);}
document.addEventListener('mousemove',mm);
document.addEventListener('mouseup',mu);
});
}

function resumeGame(){
    $('gameSettings').classList.remove('active');
    if(pauseTime){
        startTime += Date.now() - pauseTime;
        pauseTime = 0;
    }
    isPaused=false;
    lastFrameTime=0;
    if(ac&&ac.state==='suspended'&&musOn)ac.resume();
}

function applyJoySettings() {
    var size = Math.min(jSize, Math.max(60, Math.min(W.innerWidth, W.innerHeight) - 32));
    var knobSize = size * 0.36;
    var safePadX = clamp(Math.max(0, padX), 0, Math.max(0, W.innerWidth - size - 16));
    var safePadY = clamp(padY, 0, Math.max(0, W.innerHeight - size - 16));
    var buttonSize = btnSize || 80;
    var safeButtonX = clamp(Math.max(0, padX), 0, Math.max(0, W.innerWidth - buttonSize - 16));
    var safeButtonY = clamp(padY, 0, Math.max(0, W.innerHeight - buttonSize - 16));
    var safeArrowY = clamp(padY, 0, Math.max(0, W.innerHeight - buttonSize - 16));
    var z = $('jZone'), k = $('jKnob');
    z.style.width = size + 'px';
    z.style.height = size + 'px';
    z.style.left = safePadX + 'px';
    z.style.bottom = safePadY + 'px';
    z.querySelector('.jBase').style.inset = (size * 0.08) + 'px';
    k.style.width = knobSize + 'px';
    k.style.height = knobSize + 'px';
    k.style.top = (size/2 - knobSize/2) + 'px';
    k.style.left = (size/2 - knobSize/2) + 'px';
    joy.mr = size * 0.42;
    $('jBtn').style.right = safeButtonX + 'px';
    $('jBtn').style.bottom = (safePadY + (size - buttonSize) / 2) + 'px';
    $('arrowControls').style.left = safePadX + 'px';
    $('arrowControls').style.bottom = (safePadY + (size - buttonSize) / 2) + 'px';
}

function confirmReset() {
    $('settings').classList.remove('active');
    var ov=$('overlay');
    $('ovTitle').textContent='WARNING';
    $('ovTitle').style.color='#f05';
    $('ovMsg').innerHTML='Are you sure you want to reset all progress?<br>This cannot be undone.<br><br><span style="font-size:0.75rem; color:#aaa;">Type <b style="color:#f05">DELETEGAMEDATA</b> below to confirm:</span><br><input type="text" id="deleteConfirmInput" autocomplete="off" autocorrect="off" spellcheck="false" style="width:100%; margin-top:8px; padding:10px; background:#111; color:#fff; border:1px solid #f05; border-radius:6px; text-align:center; font-family:monospace; font-size:1rem; outline:none;" placeholder="Type here...">';
    
    $('ovBtn').style.display='inline-block';
    $('ovBtn').textContent='RESET';
    $('ovBtn').style.background='#333';
    $('ovBtn').style.color='#777';
    $('ovBtn').style.pointerEvents='none';
    
    setTimeout(function() {
        var inp = $('deleteConfirmInput');
        if(inp) {
            inp.focus();
            inp.oninput = function() {
                if(inp.value === 'DELETEGAMEDATA') {
                    $('ovBtn').style.background='linear-gradient(135deg,#f05,#a00)';
                    $('ovBtn').style.color='#fff';
                    $('ovBtn').style.pointerEvents='auto';
                } else {
                    $('ovBtn').style.background='#333';
                    $('ovBtn').style.color='#777';
                    $('ovBtn').style.pointerEvents='none';
                }
            };
        }
    }, 50);
    
    $('ovBtn').onclick=function(){
        var inp = $('deleteConfirmInput');
        if(!inp || inp.value !== 'DELETEGAMEDATA') return;
        
        if(LS) {
            LS.removeItem('ndj_unlocked');
            LS.removeItem('ndj_scores');
            LS.removeItem('ndj_times');
            LS.removeItem('ndj_chips');
            LS.removeItem('ndj_stats');
            LS.removeItem('ndj_lastPlayed');
            LS.removeItem('ndj_silver');
            LS.removeItem('ndj_globalData');
        }
        unlocked = [0,1]; bestScores = {}; bestTimes = {}; bestChips = {}; levelStats = {}; lastPlayed = null; silverWallet = 0;
        globalData = { timePlayed: 0, matches: 0, deadFall: 0, deadSpike: 0, deadLaser: 0 };
        goldSpent=0;ownedSkills=[];equippedSkills=[];ownedCosmetics=[];equippedCosmetics={trail:null,glow:null,death:null,jump:null,platform:null,hat:null,cape:null,body:null};consumableInv={};playerName='';
        save('goldSpent',goldSpent);save('ownedSkills',ownedSkills);save('equippedSkills',equippedSkills);save('ownedCosmetics',ownedCosmetics);save('equippedCosmetics',equippedCosmetics);save('consumableInv',consumableInv);save('playerName',playerName);
        
        $('ovTitle').textContent = "DATA RESET";
        $('ovTitle').style.color = "#0f8";
        $('ovMsg').innerHTML = "All progress has been wiped clean.";
        $('ovBtn').style.display = 'none';
        $('ovBtnCancel').textContent = 'OK';
        $('ovBtnCancel').onclick = function() {
            ov.classList.remove('active');
            initLevelSelect();
            $('settings').classList.add('active');
        };
    };
    
    $('ovBtnCancel').style.display='inline-block';
    $('ovBtnCancel').textContent='CANCEL';
    $('ovBtnCancel').onclick=function(){
        ov.classList.remove('active');
        $('settings').classList.add('active');
    };
    ov.classList.add('active');
}

// === HOME BUTTON HOLD ANIMATION ===
var homeHoldT=0, homeHoldId=null, isHoldingHome=false;
function startHomeHold(e){
    e.preventDefault();
    homeHoldT=0;
    isHoldingHome=true;
    $('homeBtnProg').style.setProperty('--p', '0%');
    homeHoldId=setInterval(function(){
        homeHoldT+=50;
        var pct = Math.min(100, (homeHoldT/800)*100);
        $('homeBtnProg').style.setProperty('--p', pct+'%');
        if(homeHoldT>=800){ clearInterval(homeHoldId); isHoldingHome=false; goHome(); }
    }, 50);
}
function endHomeHold(e){
    e.preventDefault();
    if(homeHoldId) clearInterval(homeHoldId);
    homeHoldId=null;
    $('homeBtnProg').style.setProperty('--p', '0%');
    if(isHoldingHome && homeHoldT < 400) {
        if(replayMode) exitReplay();
        else if(gameRunning && !player.dead && !player.won) togglePause();
        else if(player.dead || player.won) goHome();
    }
    isHoldingHome=false;
    homeHoldT = 0;
}

function activateFreeze(){
if(!gameRunning||player.dead||player.won||isPaused||!consumableTimefreeze||freezeCD>0||timeFrozen>0)return;
timeFrozen=600;freezeCD=3600;timefreezeUsed=true;addFloat(player.x+player.w/2,player.y-15,'FROZEN 10s!','#08f');vib(20);
$('freezeBtn').style.opacity='0.3';
}
function toggleGhost(){
    ghostVisible=!ghostVisible;
    var btn=$('ghostBtn');
    if(btn)btn.style.opacity=ghostVisible?'0.8':'0.3';
    if(ghostVisible){
        if(!currentGhost||currentGhost.length===0){
            addFloat(player.x+player.w/2,player.y-30,'No ghost yet \u2014 finish to record','#fa0');
        }else{
            var gIdx=Math.floor((Date.now()-startTime)/83.33);
            if(gIdx>=currentGhost.length)addFloat(player.x+player.w/2,player.y-30,'Ghost finished \u2014 ahead of you','#0ff');
            else addFloat(player.x+player.w/2,player.y-30,'\ud83d\udc7b Ghost ON','#0ff');
        }
    }else{
        addFloat(player.x+player.w/2,player.y-30,'\ud83d\udc7b Ghost OFF','#aaa');
    }
}
function togglePause() {
    if(!gameRunning || player.dead || player.won) return;
    if(isPaused) {
        closeGameSettings();
        return;
    }
    isPaused = true;
    pauseTime = Date.now();
    if(ac && ac.state === 'running') ac.suspend();
    openGameSettings();
}

// === GAME CORE ===
function startGame(lvl){

curLvl=lvl;deaths=0;replayMode=false;_isFreshStageEntry=true;
var st=normalizeLevelStat(levelStats[lvl]);
st.attempts++;
levelStats[lvl]=st;save('stats',levelStats);
$('levelSelect').classList.remove('active');
$('gameCanvas').classList.add('active');

$('gameTitleHUD').classList.add('active');
$('hudCenter').classList.add('active');
$('hudRight').classList.add('active');
$('hudLeft').style.display='flex';

if(ctrlMode==='analog'){$('jZone').classList.add('active');$('jBtn').classList.add('active');$('arrowControls').classList.remove('active');}
else{$('jZone').classList.remove('active');$('jBtn').classList.add('active');$('arrowControls').classList.add('active');}

applyJoySettings();applyBtnSize();

save('lastPlayed', lvl);
lastPlayed = lvl;

resize();initStars();startLvl(lvl);
if(musOn) startMusic();
}
function startReplay(lvl){
    if(!ghostData[lvl]||ghostData[lvl].length===0){
        addFloat&&addFloat(200,300,'No replay for this stage','#fa0');
        return;
    }
    replayMode=true;
    _replayEnded=false;
    curLvl=lvl;
    $('levelSelect').classList.remove('active');
    $('gameCanvas').classList.add('active');
    $('gameTitleHUD').classList.add('active');
    $('hudCenter').classList.add('active');
    $('hudRight').classList.remove('active');
    $('hudLeft').style.display='none';
    $('jZone').classList.remove('active');
    $('jBtn').classList.remove('active');
    $('arrowControls').classList.remove('active');
    $('freezeBtn').style.display='none';
    $('ghostBtn').style.display='none';
    resize();initStars();startLvl(lvl);
    $('hudLvl').textContent='\ud83c\udfac REPLAY: '+LEVELS[lvl].name;
}
function exitReplay(){
    replayMode=false;
    _replayEnded=false;
    gameRunning=false;
    if(animId)cancelAnimationFrame(animId);
    stopMusic();
    $('gameCanvas').classList.remove('active');
    $('gameTitleHUD').classList.remove('active');
    $('hudCenter').classList.remove('active');
    initLevelSelect();
}

function resize(){canvas.width=W.innerWidth;canvas.height=W.innerHeight;wCanvas.width=W.innerWidth;wCanvas.height=W.innerHeight;}

function initStars(){stars=[];var n=Math.max(10,Math.floor(120*qStarMult));for(var i=0;i<n;i++)stars.push({x:r(0,3000),y:r(0,1500),s:r(.5,2.5),sp:r(.1,.4),a:r(.2,1)});}

function initBG(){
bgShapes=[];
var th=theme.bg;
function pLayer() { return Math.floor(Math.random() * 3); }

if(th==='city'){
    for(var i=0;i<60;i++)bgShapes.push({t:'rect',x:r(-500,4000),y:0,w:r(40,120),h:r(100,400),c:theme.build,a:.6, layer:pLayer()});
}
else if(th==='mirror'){
    // Reflective glass buildings - taller and more vertical, with brighter alpha for "mirror" look
    for(var i=0;i<50;i++)bgShapes.push({t:'rect',x:r(-500,4000),y:0,w:r(30,80),h:r(150,500),c:theme.build,a:.5, layer:pLayer()});
    for(var i=0;i<25;i++)bgShapes.push({t:'rect',x:r(-500,4000),y:r(50,200),w:r(20,50),h:r(20,50),c:theme.acc,a:.15, layer:pLayer()});
}
else if(th==='spire'){
    for(var i=0;i<45;i++)bgShapes.push({t:'tri',x:r(-500,4000),y:r(200,600),s:r(30,80),c:theme.build,a:.5, layer:pLayer()});
}
else if(th==='star'){
    // Pure stars - small dot rects spread across the sky
    for(var i=0;i<80;i++)bgShapes.push({t:'rect',x:r(-500,4000),y:r(0,500),w:r(2,4),h:r(2,4),c:'#fff',a:r(.3,.9), layer:pLayer()});
    for(var i=0;i<20;i++)bgShapes.push({t:'rect',x:r(-500,4000),y:r(50,300),w:r(4,7),h:r(4,7),c:'#aaf',a:r(.4,.8), layer:pLayer()});
}
else if(th==='ocean'){
    for(var i=0;i<50;i++)bgShapes.push({t:'wave',x:r(-500,4000),y:r(100,600),w:r(80,200),h:r(20,50),c:theme.build,a:.4, layer:pLayer()});
}
else if(th==='aurora'){
    // Aurora ribbons up high in the sky - tall thin curved waves at top
    for(var i=0;i<35;i++)bgShapes.push({t:'wave',x:r(-500,4000),y:r(450,650),w:r(150,300),h:r(40,80),c:theme.acc,a:.15, layer:pLayer()});
    for(var i=0;i<20;i++)bgShapes.push({t:'wave',x:r(-500,4000),y:r(350,500),w:r(100,200),h:r(30,60),c:'#8af',a:.12, layer:pLayer()});
}
else if(th==='magma'){
    for(var i=0;i<30;i++)bgShapes.push({t:'rect',x:r(-500,4000),y:r(400,600),w:r(60,150),h:r(20,50),c:theme.build,a:.5, layer:pLayer()});
    for(var i=0;i<20;i++)bgShapes.push({t:'tri',x:r(-500,4000),y:r(200,500),s:r(20,60),c:theme.build,a:.4, layer:pLayer()});
}
else if(th==='swamp'){
    for(var i=0;i<40;i++)bgShapes.push({t:'wave',x:r(-500,4000),y:r(300,600),w:r(60,160),h:r(10,30),c:theme.build,a:.35, layer:pLayer()});
}
else if(th==='bio'){
    // Lab equipment - vertical cylinders/tubes (tall thin rects in pairs)
    for(var i=0;i<25;i++){var bx=r(-500,4000);bgShapes.push({t:'rect',x:bx,y:r(150,400),w:r(15,30),h:r(80,180),c:theme.build,a:.5, layer:pLayer()});bgShapes.push({t:'rect',x:bx-3,y:r(150,400),w:r(20,40),h:r(8,15),c:theme.acc,a:.3, layer:pLayer()});}
    for(var i=0;i<15;i++)bgShapes.push({t:'rect',x:r(-500,4000),y:r(200,400),w:r(40,80),h:r(40,80),c:theme.build,a:.3, layer:pLayer()});
}
else if(th==='void'){
    for(var i=0;i<15;i++)bgShapes.push({t:'rect',x:r(-500,4000),y:r(50,400),w:r(10,40),h:r(10,40),c:theme.build,a:r(.15,.35), layer:pLayer()});
}
else if(th==='obsidian'){
    // Jagged shards pointing down (use triangles inverted feel)
    for(var i=0;i<35;i++)bgShapes.push({t:'tri',x:r(-500,4000),y:r(50,400),s:r(40,100),c:theme.build,a:r(.4,.7), layer:pLayer()});
    for(var i=0;i<15;i++)bgShapes.push({t:'tri',x:r(-500,4000),y:r(150,500),s:r(20,50),c:theme.acc,a:.2, layer:pLayer()});
}
else if(th==='sun'){
    for(var i=0;i<35;i++)bgShapes.push({t:'rect',x:r(-500,4000),y:r(100,500),w:r(80,200),h:r(20,60),c:theme.build,a:r(.3,.5), layer:pLayer()});
}
else if(th==='rust'){
    // Industrial - tall thin smokestacks + wide machinery
    for(var i=0;i<25;i++)bgShapes.push({t:'rect',x:r(-500,4000),y:r(50,200),w:r(15,30),h:r(120,300),c:theme.build,a:.55, layer:pLayer()});
    for(var i=0;i<20;i++)bgShapes.push({t:'rect',x:r(-500,4000),y:r(50,150),w:r(60,140),h:r(40,80),c:theme.build,a:.5, layer:pLayer()});
    for(var i=0;i<15;i++)bgShapes.push({t:'rect',x:r(-500,4000),y:r(100,250),w:r(80,160),h:r(20,40),c:theme.build,a:.4, layer:pLayer()});
}
else if(th==='dust'){
    // Sand dunes - wide low waves
    for(var i=0;i<35;i++)bgShapes.push({t:'wave',x:r(-500,4000),y:r(50,300),w:r(150,300),h:r(30,80),c:theme.build,a:r(.3,.5), layer:pLayer()});
}
else if(th==='storm'){
    for(var i=0;i<70;i++)bgShapes.push({t:'rect',x:r(-500,4000),y:r(0,600),w:r(5,40),h:r(5,40),c:theme.build,a:r(.2,.5), layer:pLayer()});
}
else if(th==='glitch'){
    // Glitchy distorted bands - mix horizontal and vertical strips
    for(var i=0;i<50;i++)bgShapes.push({t:'rect',x:r(-500,4000),y:r(0,600),w:r(60,200),h:r(2,8),c:theme.build,a:r(.3,.6), layer:pLayer()});
    for(var i=0;i<30;i++)bgShapes.push({t:'rect',x:r(-500,4000),y:r(0,600),w:r(2,8),h:r(40,120),c:theme.acc,a:r(.2,.5), layer:pLayer()});
}
else if(th==='ice'){
    for(var i=0;i<40;i++)bgShapes.push({t:'tri',x:r(-500,4000),y:r(150,600),s:r(20,70),c:theme.build,a:.45, layer:pLayer()});
}
else if(th==='ghost'){
    for(var i=0;i<10;i++)bgShapes.push({t:'rect',x:r(-500,4000),y:r(50,500),w:r(5,15),h:r(40,150),c:theme.build,a:r(.1,.2), layer:pLayer()});
}
else if(th==='terminal'){
    for(var i=0;i<50;i++)bgShapes.push({t:'rect',x:i*80-200,y:r(50,500),w:40,h:40,c:theme.build,a:.3, layer:pLayer()});
}
else { 
    for(var i=0;i<60;i++)bgShapes.push({t:'rect',x:r(-500,4000),y:r(0,500),w:r(20,80),h:r(20,100),c:theme.build,a:r(0.2, 0.5), layer:pLayer()});
}
if(qBgMult<1){var keepN=Math.max(5,Math.floor(bgShapes.length*qBgMult));bgShapes=bgShapes.slice(0,keepN);}
}

function startLvl(lvl){
var lv=(lvl===-1&&typeof dailyLevelObj!=='undefined'&&dailyLevelObj)?dailyLevelObj:LEVELS[lvl];
theme=(lv.theme===-1&&lv.customTheme)?lv.customTheme:THEMES[lv.theme];
if(wCtx&&wCanvas)wCtx.clearRect(0,0,wCanvas.width,wCanvas.height);
player.x=150;player.y=300;player.vx=0;player.vy=0;player.og=false;
player.dead=false;player.won=false;player.face=1;player.at=0;
player.djU=false;player.djCD=0;
player.squash=1;
camX=0;camY=0;particles=[];platforms=[];spikes=[];chips=[];lasers=[];ziplines=[];wParts=[];pTrail=[];atmosParts=[];lightningStrikes=[];nextLightningT=Date.now()+r(15000,25000);
dayNightStart=Date.now()-Math.floor(Math.random()*60000);
wTimer=0;flash=0; deathFlash=0;gemFlash=0;hudDistDisplay=0;resurrectFlash=0;
fpsBuf=[];fpsBufI=0;curFps=0;lowFpsAccum=0;
coyoteT=0;jumpBuf=0; frameCount=0;bounceLockT=0;jumpOriginX=150;
var _carryRun=(sessionStage===lvl);
if(!_carryRun){runGold=0; runSilver=0;}
stylePoints=0;comboCount=0;comboTimer=0;floatTexts=[];
shieldUsed=false;shieldHits=shieldHits||0;airDashUsed=false;lastPlatPos={x:150,y:400};tripleJumpCD=0;runScore=0;timeFrozen=0;freezeCD=0;ghostFrames=[];ghostIdx=0;currentGhost=null;runUsedResurrect=false;
phaseDashUsed=false;
startTime=Date.now(); runTime=0;
isPaused=false;

initBG();
$('gameCanvas').classList.remove('grey');$('gameCanvas').classList.remove('shake');
$('hudLvl').textContent=lv.name;
$('hudLvl').style.color=theme.acc;
$('hudTime').textContent='0.00';
$('hudDist').textContent='0';
$('hudPct').textContent='0';
if($('progFill')) $('progFill').style.width='0%';
$('hudDeath').textContent=deaths;
$('hudChips').innerHTML='<span style="color:#ffd700">★ '+runGold+'</span> &nbsp; <span style="color:#ccc">♦ '+runSilver+'</span>';


var tt = $('homeTooltip');
if(tt) {
    var hasKeyboard = (W.matchMedia && W.matchMedia('(pointer: fine)').matches) || (navigator.maxTouchPoints===0);
    var kbExtra = hasKeyboard ? '<br><span style="color:#aaa;font-size:0.6rem;">⌨ ← → move • SPACE jump • ESC pause</span>' : '';
    tt.innerHTML = '<b style="color:#0ff; font-size:1rem; line-height:1;">\u21d6</b> HOLD to Exit to Stage Select / TAP to Pause' + kbExtra;
    tt.classList.add('active');
    if(W.tooltipTimeout) clearTimeout(W.tooltipTimeout);
    W.tooltipTimeout = setTimeout(function(){ tt.classList.remove('active'); }, hasKeyboard?4000:2500);
}

// NPC advice on fresh stage entry (first attempt this session — not retry, not replay)
if(_isFreshStageEntry && !replayMode){
    showNpcAdvice(theme, lv);
}
_isFreshStageEntry = false;

genLvl(lv);
// Session-persistent chips: mark already-collected as taken across retries on the SAME stage
if(sessionStage!==lvl){sessionCollectedChips=[];sessionStage=lvl;}
else{
    for(var _sci=0;_sci<sessionCollectedChips.length;_sci++){var _scIdx=sessionCollectedChips[_sci];if(chips[_scIdx])chips[_scIdx].col=true;}
}
currentGhost=ghostData[lvl]&&ghostData[lvl].length>0?ghostData[lvl]:null;
if(!replayMode)sendMetric('level_start',{level:lvl,name:lv.name,diff:lv.diff,skills:equippedSkills,cosmetics:equippedCosmetics,inv:consumableInv,isDaily:!!isDailyStage});
var tjReadyTxt='';if(activeConsumable==='triplejump'){var cdSec=(tripleJumpCD/60).toFixed(1);tjReadyTxt='\u2b06 TRIPLE JUMP '+(tripleJumpCD<=0?'\u2713 READY':'('+cdSec+'s)');}
$('hudConsumable').textContent=tjReadyTxt;
var shEl=$('hudShield');if(shEl){if(shieldHits>0){shEl.style.display='block';shEl.textContent='\ud83d\udee1 SHIELD x'+shieldHits;}else shEl.style.display='none';}
var resEl=$('hudResurrect');if(resEl&&hasSkill('resurrect')){resEl.style.display='block';var resCDms=120000-(Date.now()-lastResurrectTime);if(resCDms<=0)resEl.textContent='\u2764 RESURRECT \u2713 READY';else{var resMin=Math.floor(resCDms/60000),resSec=Math.floor((resCDms%60000)/1000);resEl.textContent='\u2764 RESURRECT '+resMin+'m'+resSec+'s';}}
else if(shieldHits>0)$('hudConsumable').textContent='\ud83d\udee1 DOUBLE SHIELD';
else $('hudConsumable').textContent='';
var skillIcons='';if(hasSkill('ghost'))skillIcons+='\ud83d\udc7b';if(hasSkill('phasedash'))skillIcons+=phaseDashUsed?'\u26ab':'\ud83c\udf00';if(hasSkill('airdash'))skillIcons+='\ud83d\udca8';if(hasSkill('reflexdash'))skillIcons+='\u26a1';if(hasSkill('resurrect'))skillIcons+='\u2764';if(hasSkill('coyote'))skillIcons+='\ud83d\udc3e';if(hasSkill('magnet'))skillIcons+='\ud83e\uddf2';if(hasSkill('wallslide'))skillIcons+='\ud83e\udea9';if(hasSkill('slowfall'))skillIcons+='\ud83e\ude82';if(consumableTimefreeze)skillIcons+='\u23f8';$('hudSkills').textContent=skillIcons;
$('freezeBtn').style.display=consumableTimefreeze?'flex':'none';
var gb=$('ghostBtn');if(gb)gb.style.display=(ghostsEnabled&&hasSkill('ghost'))?'flex':'none';
$('hudFx').innerHTML=(theme.weather!=='clear'?theme.weather.toUpperCase()+'<br>':'')+(theme.grav<=0.55?'LOW G':theme.grav>=0.65?'HEAVY G':'NORMAL G')+'<br>'+(theme.fric<=0.8?'SLIPPERY':theme.fric>=0.88?'GRIPPY':'NORMAL FRIC');
gameRunning=true;lastFrameTime=0;if(animId)cancelAnimationFrame(animId);loop();
}

function genLvl(lv){
var sc=lv.sc,px=0,py=450,cnt=lv.plats,seed=lv.theme*997+lv.plats*31;
if(lv.theme===-1) seed = hashString(getGameDayKey() + 'layout') % 233280;
platforms.push({x:0,y:450,w:400*sc,h:40,t:'s',ox:0,oy:0,sp:0,amp:0});
var lastX=400*sc;
var goldChipOrdinal=0; // ordinal index for gold chips, used for bestChips persistence
var rev = lv.reversed ? true : false;
for(var i=0;i<cnt;i++){
    seed=(seed*9301+49297)%233280;
    var progress = rev ? (1 - seed/233280) : (seed/233280);
    var gap=lv.gaps[0]+progress*(lv.gaps[1]-lv.gaps[0])*sc;
    seed=(seed*9301+49297)%233280;
    progress = rev ? (1 - seed/233280) : (seed/233280);
    var hc=(progress-0.5)*lv.hc*2;
    px=lastX+gap;py+=hc;py=clamp(py,250,520);
    seed=(seed*9301+49297)%233280;
    var pw=80+(seed/233280)*120*sc;
    if(lv.diff==='STARTER')pw=140+(seed/233280)*140*sc;
    
    if(px>lastX+20){
        var isMove=i<lv.move;
        if(isMove){
            seed=(seed*9301+49297)%233280;
            var mSp=.5+(seed/233280)*1.5;
            seed=(seed*9301+49297)%233280;
            var mAmp=20+(seed/233280)*40;
            platforms.push({x:px,y:py,w:pw,h:30,t:'m',ox:px,oy:py,sp:mSp,amp:mAmp,phase:i});
        }else{
            platforms.push({x:px,y:py,w:pw,h:30,t:'s',ox:0,oy:0,sp:0,amp:0});
        }
        // Pulse platforms (appear/disappear) — Moderate (~12%) and Hard (~22%) stages, never on first/last few
        if((lv.diff==='MODERATE'||lv.diff==='HARD')&&i>3&&i<cnt-2&&!isMove){
            seed=(seed*9301+49297)%233280;
            var pulseChance=lv.diff==='HARD'?0.22:0.12;
            if((seed/233280)<pulseChance){
                var p=platforms[platforms.length-1];
                p.pulse=true;
                p.pulseOff=Math.floor((seed*7)%180); // deterministic phase offset based on seed
                p.pulseT=p.pulseOff;
            }
        }
        
        lastX=px+pw;
        
        if(i>3 && i<cnt-2){
            seed=(seed*9301+49297)%233280;
            if(!platforms[platforms.length-1].pulse){
                if((seed/233280) < .25) {
                    spikes.push({x:px+pw*.3+hash(i,seed)*pw*.4,y:py-20,w:14,h:18});
                } else if ((seed/233280) > .85 && !isMove) {
                    lasers.push({x:px+pw/2, y:py-110, h:110, on:100, off:80, offset:Math.floor(r(0,180))});
                }
            }
        }
        
        if(i>2 && i%3===0 && !isMove) {
            chips.push({x: px+pw/2, y: py-60, col: false, goldIdx: goldChipOrdinal++});
            if(i>1 && i<cnt-1 && gap>80){
                var arcMid=px-gap/2,arcTop=py-80;
                for(var ci=0;ci<3;ci++){
                    var ct=(ci+1)/4;
                    var cx2=px-gap+gap*ct;
                    var cy2=py-Math.sin(ct*Math.PI)*80;
                    chips.push({x:cx2,y:cy2,col:false,isArc:true});
                }
            }
        }
        if(i>2 && i<cnt-3 && !isMove && (seed/233280)>.6 && (seed/233280)<.75 && !platforms[platforms.length-1].pulse){
            platforms[platforms.length-1].t='b';
        }
        if(lv.move>=2 && i>3 && i<cnt-4 && !isMove && (seed/233280)>.8){
            seed=(seed*9301+49297)%233280;
            var zLen=200+(seed/233280)*120;
            ziplines.push({x:px+pw+30,y:py-110,len:zLen});
        }
    }
}

px=lastX+100*sc;
platforms.push({x:px,y:400,w:300*sc,h:40,t:'f',ox:0,oy:0,sp:0,amp:0});
goalX=px+150*sc;

// Champion Master Gems — hidden gems only visible to champions, +2 gold each
if(championStatus.unlocked){
    var stCur=normalizeLevelStat(levelStats[curLvl]);
    var collectedMG=stCur.masterGems||[];
    var mgCount=lv.diff==='HARD'?3:lv.diff==='MODERATE'?2:1;
    // Pick deterministic platform indices for master gems
    var mgSeed=lv.theme*1009+lv.plats*43+curLvl*7;
    var staticPlats=[];
    for(var pi=2;pi<platforms.length-1;pi++){
        var pp=platforms[pi];
        if(pp.t==='s'&&!pp.pulse)staticPlats.push(pi);
    }
    var pickedIdx={};
    for(var mi=0;mi<mgCount&&staticPlats.length>0;mi++){
        mgSeed=(mgSeed*9301+49297)%233280;
        var pickPos=Math.floor((mgSeed/233280)*staticPlats.length);
        var pIdx=staticPlats[pickPos];
        if(pickedIdx[pIdx]){pickPos=(pickPos+1)%staticPlats.length;pIdx=staticPlats[pickPos];}
        pickedIdx[pIdx]=true;
        // Skip if this gem already collected
        if(collectedMG.indexOf(mi)>=0)continue;
        var pp=platforms[pIdx];
        // Place high above platform — needs double-jump or dash to reach
        chips.push({x:pp.x+pp.w/2, y:pp.y-110, col:false, kind:'master', mgIdx:mi});
    }
}

// Daily gem placement for daily stages
if(typeof isDailyStage!=='undefined'&&isDailyStage){
    var dailyData=load('dailyMaster',{day:'',collected:false});
    var todayKey=getGameDayShort();
    if(dailyData.day!==todayKey || !dailyData.collected){
        var midIdx=Math.max(2,Math.floor(platforms.length/2));
        if(platforms[midIdx]){
            var pp=platforms[midIdx];
            chips.push({x:pp.x+pp.w/2, y:pp.y-75, col:false, kind:'daily'});
        }
    }
}

fallLimitY=0;
for(var i=0;i<platforms.length;i++) fallLimitY=Math.max(fallLimitY, platforms[i].y);
fallLimitY+=260;
if($('hudMax')) $('hudMax').textContent = Math.floor(goalX/10);
}

function confirmExit(){
$('gameSettings').classList.remove('active');
var ov=$('overlay');
$('ovTitle').textContent='EXIT?';
$('ovTitle').style.color='#f80';
$('ovMsg').innerHTML='Progress on this run will be lost.';
$('ovBtn').textContent='EXIT';$('ovBtn').style.display='inline-block';
$('ovBtn').style.background='linear-gradient(135deg,#a00,#600)';
var _exitFired=false;
var doExit=function(e){if(_exitFired)return;_exitFired=true;if(e)e.preventDefault();ov.classList.remove('active');isPaused=false;goHome();};
$('ovBtn').onclick=doExit;
$('ovBtn').ontouchstart=doExit;
$('ovBtnCancel').textContent='CANCEL';$('ovBtnCancel').style.display='inline-block';
$('ovBtnCancel').style.background='linear-gradient(135deg,#555,#333)';
var doCancel=function(e){if(e)e.preventDefault();ov.classList.remove('active');openGameSettings();};
$('ovBtnCancel').onclick=doCancel;
$('ovBtnCancel').ontouchstart=doCancel;
ov.classList.add('active');
}
function goHome(){
if(typeof _autoRetryTimer!=='undefined'&&_autoRetryTimer){clearTimeout(_autoRetryTimer);_autoRetryTimer=null;}
isPaused=false;
isDailyStage=false; dailyLevelObj=null;
var _wasReplay=replayMode;
replayMode=false;
// Block all leaked touch/click events globally during the home transition
document.body.style.pointerEvents='none';
setTimeout(function(){document.body.style.pointerEvents='';},400);
$('overlay').classList.remove('active');
$('gameSettings').classList.remove('active');
// Always finalize consumables on exit (consumes inventory items that were used during play, resets state)
if(gameRunning && !_wasReplay) finalizeRunConsumables();
if(gameRunning && !_wasReplay && !player.dead && !player.won) {
    globalData.matches++;
    var st=normalizeLevelStat(levelStats[curLvl]);
    
    var elapsed = runTime || (Date.now() - startTime);
    if(elapsed > 0 && elapsed < 86400000) {
        globalData.timePlayed += elapsed;
        st.timePlayed = (st.timePlayed || 0) + elapsed;
    }
    levelStats[curLvl]=st; save('stats',levelStats);
    save('globalData', globalData);
}
runSilver = 0; runGold = 0;
sessionCollectedChips=[]; sessionStage=-1;

gameRunning=false;
stopMusic();
if(animId)cancelAnimationFrame(animId);
wCtx.clearRect(0,0,wCanvas.width,wCanvas.height);
ctx.clearRect(0,0,canvas.width,canvas.height);
$('gameCanvas').classList.remove('active');
$('gameCanvas').classList.remove('grey');$('gameCanvas').classList.remove('shake');
$('gameTitleHUD').classList.remove('active');
$('hudCenter').classList.remove('active');
$('hudRight').classList.remove('active');
$('hudLeft').style.display='none';$('freezeBtn').style.display='none';$('ghostBtn').style.display='none';
$('jZone').classList.remove('active');
$('jBtn').classList.remove('active');
$('arrowControls').classList.remove('active');
$('overlay').classList.remove('active');
$('homeTooltip').classList.remove('active');
var _na=$('npcAdvice');if(_na){_na.classList.remove('active');_na.style.display='none';if(W._npcAdviceTimer)clearTimeout(W._npcAdviceTimer);}
wParts=[];particles=[];
initLevelSelect();
// Block leaked touch/click events from leaking into level-select after exit
var _ls=$('levelSelect');if(_ls){_ls.style.pointerEvents='none';setTimeout(function(){_ls.style.pointerEvents='';},350);}
}

function updateWeather(){
wTimer++;
var maxP=theme.weather==='storm'?Math.floor(200*partMult):theme.weather==='rain'?Math.floor(120*partMult):theme.weather==='snow'?Math.floor(80*partMult):theme.weather==='dust'?Math.floor(60*partMult):0;
if(wParts.length<maxP){
var c=theme.weather==='storm'?Math.floor(4*partMult):Math.floor(2*partMult);
for(var i=0;i<c;i++){var p=createWPart();if(p)wParts.push(p);}
}
for(var i=wParts.length-1;i>=0;i--){
var p=wParts[i];p.x+=p.vx;p.y+=p.vy;p.life-=p.decay;
if(theme.weather==='snow')p.x+=Math.sin(wTimer*.02+p.off)*.5;
if(p.y>canvas.height+50||p.life<=0||p.x<-50||p.x>canvas.width+50)wParts.splice(i,1);
}
if(theme.weather==='storm'&&Math.random()<.008)flash=12;
if(flash>0)flash--;
}
function createWPart(){
var sw=canvas.width;
if(theme.weather==='rain'||theme.weather==='storm'){
return{x:r(-50,sw+50),y:r(-50,100),vx:theme.weather==='storm'?r(2,5):r(1,3),vy:r(8,14),life:1,decay:.008,len:r(8,18),wid:r(.5,2),alpha:r(.3,.7)};
}else if(theme.weather==='snow'){
return{x:r(-50,sw+50),y:r(-50,100),vx:r(-.5,.5),vy:r(1,3),life:1,decay:.003,size:r(2,4),off:r(0,Math.PI*2),alpha:r(.4,.9)};
}else if(theme.weather==='dust'){
return{x:r(-50,sw+50),y:r(0,canvas.height),vx:r(3,8),vy:r(-1,1),life:1,decay:.005,size:r(2,5),alpha:r(.2,.5)};
}
return null;
}
function drawWeather(){
if(theme.weather==='clear'){wCtx.clearRect(0,0,canvas.width,canvas.height);return;}
wCtx.clearRect(0,0,canvas.width,canvas.height);
if(flash>0){wCtx.fillStyle='rgba(255,255,255,'+(flash/30)+')';wCtx.fillRect(0,0,canvas.width,canvas.height);}
for(var i=0;i<wParts.length;i++){
var p=wParts[i];
if(theme.weather==='rain'||theme.weather==='storm'){
wCtx.strokeStyle='rgba(150,200,255,'+p.alpha+')';wCtx.lineWidth=p.wid;
wCtx.beginPath();wCtx.moveTo(p.x,p.y);wCtx.lineTo(p.x+p.vx*2,p.y+p.len);wCtx.stroke();
}else if(theme.weather==='snow'){
wCtx.fillStyle='rgba(255,255,255,'+p.alpha+')';wCtx.beginPath();wCtx.arc(p.x,p.y,p.size,0,Math.PI*2);wCtx.fill();
}else if(theme.weather==='dust'){
wCtx.fillStyle='rgba(200,170,136,'+p.alpha+')';wCtx.fillRect(p.x,p.y,p.size,p.size);
}
}
}

// === INPUT ===
var jZone=$('jZone'),jKnob=$('jKnob');
function jPos(e){var rect=jZone.getBoundingClientRect(),t=e.touches?e.touches[0]:e;return{x:t.clientX-rect.left,y:t.clientY-rect.top};}
jZone.addEventListener('touchstart',function(e){e.preventDefault();joy.a=true;var p=jPos(e);joy.sx=p.x;joy.sy=p.y;joy.cx=p.x;joy.cy=p.y;},{passive:false});
jZone.addEventListener('touchmove',function(e){e.preventDefault();if(!joy.a)return;var p=jPos(e);joy.cx=p.x;joy.cy=p.y;var dx=joy.cx-joy.sx,dy=joy.cy-joy.sy,d=Math.sqrt(dx*dx+dy*dy);if(d>joy.mr){var r=joy.mr/d;dx*=r;dy*=r;}joy.dx=dx;joy.dy=dy;jKnob.style.transform='translate('+dx+'px,'+dy+'px)';},{passive:false});
function endJ(){joy.a=false;joy.dx=0;joy.dy=0;jKnob.style.transform='translate(0,0)';}
jZone.addEventListener('touchend',endJ);jZone.addEventListener('touchcancel',endJ);
var mDown=false;
jZone.addEventListener('mousedown',function(e){mDown=true;joy.a=true;var rect=jZone.getBoundingClientRect();joy.sx=e.clientX-rect.left;joy.sy=e.clientY-rect.top;joy.cx=joy.sx;joy.cy=joy.sy;});
W.addEventListener('mousemove',function(e){if(!mDown)return;var rect=jZone.getBoundingClientRect();joy.cx=e.clientX-rect.left;joy.cy=e.clientY-rect.top;var dx=joy.cx-joy.sx,dy=joy.cy-joy.sy,d=Math.sqrt(dx*dx+dy*dy);if(d>joy.mr){var r=joy.mr/d;dx*=r;dy*=r;}joy.dx=dx;joy.dy=dy;jKnob.style.transform='translate('+dx+'px,'+dy+'px)';});
function releasePointerControls(){
    mDown=false;
    endJ();
    jumpP=false;
    arrLeftP=false;
    arrRightP=false;
}
W.addEventListener('mouseup',releasePointerControls);
W.addEventListener('blur',releasePointerControls);
W.addEventListener('touchend',function(e){if(!e.touches||e.touches.length===0)releasePointerControls();},{passive:true});
W.addEventListener('touchcancel',releasePointerControls,{passive:true});

var jBtn=$('jBtn');
jBtn.addEventListener('touchstart',function(e){e.preventDefault();jumpP=true;},{passive:false});
jBtn.addEventListener('touchend',function(e){e.preventDefault();jumpP=false;},{passive:false});
jBtn.addEventListener('mousedown',function(e){e.preventDefault();jumpP=true;});
jBtn.addEventListener('mouseup',function(e){e.preventDefault();jumpP=false;});

var arrL=$('arrLeft'),arrR=$('arrRight');
arrL.addEventListener('touchstart',function(e){e.preventDefault();arrLeftP=true;},{passive:false});
arrL.addEventListener('touchend',function(e){e.preventDefault();arrLeftP=false;},{passive:false});
arrL.addEventListener('mousedown',function(e){e.preventDefault();arrLeftP=true;});
arrL.addEventListener('mouseup',function(e){e.preventDefault();arrLeftP=false;});
arrR.addEventListener('touchstart',function(e){e.preventDefault();arrRightP=true;},{passive:false});
arrR.addEventListener('touchend',function(e){e.preventDefault();arrRightP=false;},{passive:false});
arrR.addEventListener('mousedown',function(e){e.preventDefault();arrRightP=true;});
arrR.addEventListener('mouseup',function(e){e.preventDefault();arrRightP=false;});
W.addEventListener('keydown',function(e){
    if($('levelSelect').classList.contains('active')) return; // handled separately
    if(e.code==='Escape'||e.code==='KeyP') { if(gameRunning && !player.dead && !player.won) togglePause(); }
    if(isPaused) return; // ignore input when paused
    if(e.code==='ArrowLeft'||e.code==='KeyA')joy.dx=-joy.mr;if(e.code==='ArrowRight'||e.code==='KeyD')joy.dx=joy.mr;if(e.code==='Space'||e.code==='ArrowUp'||e.code==='KeyW')jumpP=true;
});
W.addEventListener('keyup',function(e){
    if($('levelSelect').classList.contains('active')) return;
    if(e.code==='ArrowLeft'||e.code==='KeyA'||e.code==='ArrowRight'||e.code==='KeyD'){if(!joy.a)joy.dx=0;}if(e.code==='Space'||e.code==='ArrowUp'||e.code==='KeyW')jumpP=false;
});

// Tap/Key to retry logic
function onTapRetry(e){
    if(!player.dead || !$('overlay').classList.contains('active')) return;
    var t=e.target;
    if(t && (t.closest('#gameTitleHUD') || t.closest('#jBtn') || t.closest('#jZone') || t.closest('#ovBtn') || t.closest('#arrowControls'))) return;
    $('overlay').classList.remove('active');
    $('gameCanvas').classList.remove('grey');
    $('gameCanvas').classList.remove('shake');
    startLvl(curLvl);
    if(musOn) startMusic();
}
document.addEventListener('touchstart', onTapRetry, {passive:false});
document.addEventListener('mousedown', onTapRetry);
document.addEventListener('keydown', function(e) {
    if(['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;
    onTapRetry({target: document.body}); 
});


// === PHYSICS & DRAW ===
function updateCameraAndHud(){
    var maxCamX=Math.max(0,goalX-canvas.width+220);
    var targetCamX=clamp(player.x-canvas.width*0.35,0,maxCamX);
    var maxCamY=Math.max(0,fallLimitY-canvas.height-120);
    var targetCamY=clamp(player.y-canvas.height*0.58,0,maxCamY);
    var xEase=1-Math.pow(0.92,dt);
    var yEase=1-Math.pow(0.90,dt);
    camX+=(targetCamX-camX)*xEase;
    camY+=(targetCamY-camY)*yEase;

    var maxDist=Math.max(1,Math.floor(goalX/10));
    var dist=clamp(Math.floor(player.x/10),0,maxDist);
    hudDistDisplay+=(dist-hudDistDisplay)*0.15*dt;
    $('hudDist').textContent=Math.floor(hudDistDisplay);
    var pct=clamp(Math.floor((player.x/Math.max(goalX,1))*100),0,100);
    $('hudPct').textContent=pct;
    $('progFill').style.width=pct+'%';
}

function update(){
frameCount++;

if(replayMode){
    var rg=ghostData[curLvl];
    if(rg && rg.length>0){
        var rIdx=Math.floor(((isPaused?pauseTime:Date.now())-startTime)/83.33);
        if(rIdx>=rg.length){
            // Replay finished — show banner and exit; keep replayMode=true so showWin (if triggered by goal) bails out
            if(!_replayEnded){
                _replayEnded=true;
                addFloat(player.x+player.w/2,player.y-30,'\u2728 REPLAY ENDED','#0ff');
                setTimeout(exitReplay,1500);
            }
            return;
        }
        var rf=rg[rIdx];
        player.x=rf.x;player.y=rf.y;player.face=rf.f||1;player.og=rf.og!==false;player.djU=!!rf.dj;
        if(rf.tp){
            // Show teleport sparkles
            for(var ti=0;ti<8;ti++){var ang=ti/8*Math.PI*2;particles.push({x:player.x+player.w/2+Math.cos(ang)*15,y:player.y+player.h/2+Math.sin(ang)*15,vx:Math.cos(ang)*1,vy:Math.sin(ang)*1,life:1,decay:0.05,color:'#0f8',size:3,type:'dot'});}
        }
    }else{
        exitReplay();return;
    }
    updateCameraAndHud();
    return;
}

for(var i=particles.length-1;i>=0;i--){
    var pt=particles[i];
    pt.x+=pt.vx*dt; pt.y+=pt.vy*dt;
    if(pt.type === 'glass') {
        pt.rot += pt.rv*dt;
        pt.vy += 0.4*dt;
        pt.vx *= Math.pow(0.96,dt);
    } else if(pt.type === 'pixel') {
        pt.vy += 0.3*dt;
    } else if (pt.type === 'ring') {
    } else {
        pt.vy += 0.1*dt;
    }
    pt.life -= (pt.decay || 0.03)*dt;
    if(pt.life<=0) particles.splice(i,1);
}

if(player.dead||player.won)return;
player.squash+=(1-player.squash)*0.2*dt;
var capeTarget=Math.PI*0.5+Math.sin(Date.now()*.002)*0.1;
var spd=Math.abs(player.vx);
if(spd>1)capeTarget=Math.PI-Math.sin(Date.now()*.008)*0.15*(spd/6);
if(!player.og){
    // In-air: cape drags opposite to velocity
    // Strong vy weight so jumping up clearly points cape DOWN, falling clearly points UP
    var localVx=Math.abs(player.vx);
    capeTarget=Math.atan2(-player.vy*1.2, -localVx*0.4-0.6);
}
// Simple lerp toward target with shortest-angle path; clamp to behind hemisphere so cape never points forward
var capeDiff=capeTarget-capeAng;
while(capeDiff>Math.PI)capeDiff-=2*Math.PI;
while(capeDiff<-Math.PI)capeDiff+=2*Math.PI;
capeAng+=capeDiff*0.18*dt;
// Normalize and clamp behind: if capeAng falls in front-half (cos > 0), pull back to nearest boundary
if(Math.cos(capeAng)>0){
    capeAng=Math.sin(capeAng)>=0?Math.PI/2:-Math.PI/2;
}
if(player.djCD>0)player.djCD-=dt;
var cdPct=player.djCD>0?player.djCD/player.djMax:0;
$('jCd').style.background=cdPct>0?'conic-gradient(rgba(0,0,0,0.7) '+(cdPct*360)+'deg, transparent '+(cdPct*360)+'deg)':'none';
$('jRing').style.borderColor=player.djCD<=0?'rgba(170,136,255,0.9)':'rgba(170,136,255,0.2)';
$('jRing').style.borderWidth=player.djCD<=0?'3px':'2px';
if(activeConsumable==='triplejump'){
    var tjReady=tripleJumpCD<=0;
    $('jBtn').style.boxShadow=tjReady?'0 0 25px #0ff, 0 0 50px rgba(0,255,255,0.6), inset 0 0 15px rgba(0,255,255,0.3)':'0 0 10px rgba(0,255,255,0.4)';
    $('jBtn').style.borderColor=tjReady?'#0ff':'rgba(0,255,255,0.5)';
    $('jBtn').style.borderWidth='3px';
}else{$('jBtn').style.boxShadow='';$('jBtn').style.borderWidth='';}
if(jumpBuf>0)jumpBuf-=dt;

runTime = Date.now() - startTime;
$('hudTime').textContent = (runTime/1000).toFixed(2);
if(ghostsEnabled&&!replayMode&&!player.dead&&!player.won&&frameCount%5===0&&ghostFrames.length<4000){var _gf={x:Math.round(player.x),y:Math.round(player.y),f:player.face,og:player.og,ph:player.at};if(player.djU)_gf.dj=1;if(_ghostTeleportFlag){_gf.tp=true;_ghostTeleportFlag=false;}ghostFrames.push(_gf);}
var bt=bestTimes[curLvl];
if(bt){
    var pct=Math.min(1,player.x/goalX);
    var expectedTime=bt*pct;
    var diff=runTime-expectedTime;
    var splitEl=$('hudSplit');
    if(splitEl){
        if(diff<0){splitEl.style.color='#0f8';splitEl.textContent=(diff/1000).toFixed(1)+'s';}
        else{splitEl.style.color='#f05';splitEl.textContent='+'+(diff/1000).toFixed(1)+'s';}
    }
}else{var splitEl=$('hudSplit');if(splitEl)splitEl.textContent='';}

for(var i=0;i<platforms.length;i++){
var p=platforms[i];
if(p.t==='m'&&timeFrozen<=0){p.y=p.oy+Math.sin(Date.now()*.001*p.sp+p.phase)*p.amp;}
}

if(player.og)coyoteT=hasSkill('coyote')?15:coyoteMax;else if(coyoteT>0)coyoteT-=dt;
if(jumpP&&!jumpWP)jumpBuf=6;

var mi=0;
if(joy.a)mi=joy.dx/joy.mr;
else if(joy.dx<0)mi=-1;else if(joy.dx>0)mi=1;
if(ctrlMode==='arrows'){if(arrLeftP)mi=-1;if(arrRightP)mi=1;}
if(bounceLockT>0){bounceLockT-=dt;}
else{player.vx+=mi*.8*dt;}
player.vx*=Math.pow((curLvl>=6&&(theme.weather==='rain'||theme.weather==='snow'))?theme.fric-0.05:theme.fric,dt);
var maxVx=airDashUsed&&Math.abs(player.vx)>5?12:5;
player.vx=clamp(player.vx,-maxVx,maxVx);

if(Math.abs(player.vx)>.3){player.face=player.vx>0?1:-1;player.at+=dt;}
else if(!player.og) { player.at+=dt; }

if(frameCount % 3 === 0) {
    var hasTrailEquipped=equippedCosmetics.trail&&equippedCosmetics.trail.indexOf('trail_')===0;
    if(Math.abs(player.vx) > 0.5 || !player.og || hasTrailEquipped) {
        pTrail.push({x: player.x, y: player.y, face: player.face, at: player.at, djU: player.djU});
        var maxTrail=player.djU?10:hasTrailEquipped?7:5;
        if(pTrail.length > maxTrail) pTrail.shift();
    } else if(pTrail.length > 0) {
        pTrail.shift();
    }
}

var canJump=player.og||coyoteT>0;
var wantsJump=jumpP||jumpBuf>0;
if(wantsJump&&!jumpWP){
if(canJump&&!player.djU){
player.vy=theme.jmp;player.og=false;coyoteT=0;jumpBuf=0;player.djU=false;jumpOriginX=player.x;
spawnJumpFx(player.x+player.w/2,player.y+player.h,6);playSfx('jump');vib(15);
}else if(!player.djU&&player.djCD<=0){
player.vy=theme.jmp+2;player.djU=true;player.djCD=player.djMax;jumpBuf=0;
spawnJumpFx(player.x+player.w/2,player.y+player.h,10);playSfx('jump');vib(10);
}else if(hasSkill('reflexdash')&&!player.djU&&player.djCD>0&&!airDashUsed){
    // Reflex Dash: dash when DJ is on cooldown (skips DJ prerequisite)
    airDashUsed=true;player.vx=player.face*12;player.vy=-2;spawnP(player.x+player.w/2,player.y+player.h/2,'#ff0',10);addFloat(player.x+player.w/2,player.y-10,'\u26a1 REFLEX!','#ff0');playSfx('jump');vib(15);
}else if(hasSkill('airdash')&&player.djU&&!airDashUsed){
    airDashUsed=true;player.vx=player.face*12;player.vy=-2;spawnP(player.x+player.w/2,player.y+player.h/2,theme.acc,10);addFloat(player.x+player.w/2,player.y-10,'DASH!','#f0f');playSfx('jump');vib(15);
}else if(activeConsumable==='triplejump'&&player.djU&&tripleJumpCD<=0){
    tripleJumpCD=900;player.vy=theme.jmp;spawnP(player.x+player.w/2,player.y+player.h,'#0f8',12);addFloat(player.x+player.w/2,player.y-10,'TRIPLE!','#0f8');playSfx('jump');vib(20);
}
}
jumpWP=jumpP;

if(!jumpP&&player.vy<0&&player.vy>theme.jmp*0.5)player.vy*=Math.pow(0.85,dt);

if(hasSkill('slowfall')&&jumpP&&player.vy>0)player.vy+=theme.grav*dt*0.4;else player.vy+=theme.grav*dt;player.vy=Math.min(player.vy,15);
player.x+=player.vx*dt;player.y+=player.vy*dt;

var wasOnGround=player.og;
player.og=false;
var onMove=null;
for(var i=0;i<platforms.length;i++){
var p=platforms[i];
// Pulse platforms: advance time, determine state
// Cycle: 240 visible (4s) + 60 warn (1s) + 120 invisible (2s) = 420 total
if(p.pulse){
    p.pulseT=(p.pulseT||p.pulseOff||0)+dt;
    var cycle=p.pulseT%420;
    p.pulseInvis=(cycle>=300);
    p.pulseWarn=(cycle>=240&&cycle<300);
    if(p.pulseInvis)continue;
}
if(player.vy>=0&&player.x+player.w>p.x&&player.x<p.x+p.w&&player.y+player.h>=p.y&&player.y+player.h<=p.y+p.h+player.vy+2){
player.y=p.y-player.h;player.vy=0;player.og=true;player.djU=false;
if(p.t==='b'){player.vy=theme.jmp*1.5;player.og=false;player.djU=false;player.djCD=0;spawnP(player.x+player.w/2,player.y+player.h,'#f80',8);playSfx('jump');vib(20);$('gameCanvas').classList.add('shake');setTimeout(function(){$('gameCanvas').classList.remove('shake');},200);}
if(p.t==='m'){onMove=p;}
if(p.t==='f'){player.won=true;finalizeRunConsumables();playSfx('win');vib([50,50,50,50,100]);stopMusic();
    var cx=player.x+player.w/2,cy=player.y+player.h/2;
    for(var imp=0;imp<30;imp++){
        var ang=imp/30*Math.PI*2,dist=r(80,160);
        particles.push({x:cx+Math.cos(ang)*dist,y:cy+Math.sin(ang)*dist,vx:-Math.cos(ang)*r(3,8),vy:-Math.sin(ang)*r(3,8),life:1,decay:0.015,color:theme.acc,size:r(3,6),type:'dot'});
    }
    particles.push({x:cx,y:cy,vx:0,vy:0,life:1,decay:0.02,color:theme.acc,type:'ring',size:80,grow:-3});
    setTimeout(showWin,1000);
}
}
}
// Platform Bounce skill: hit side of a platform mid-air → launch back
if(hasSkill('wallslide') && !player.og && !player.dead){
    for(var pbi=0;pbi<platforms.length;pbi++){
        var pbp=platforms[pbi];
        if(pbp.t==='f')continue;
        if(player.x+player.w>pbp.x+1 && player.x<pbp.x+pbp.w-1 &&
           player.y+player.h>pbp.y+4 && player.y<pbp.y+pbp.h-1){
            // Side hit - bounce back away from platform toward jump origin
            var fromLeft=(player.x+player.w/2 < pbp.x+pbp.w/2);
            var ox=jumpOriginX-player.x;
            var bouncePower=Math.min(8, Math.max(4, Math.abs(ox)*0.04));
            player.vx=(fromLeft?-bouncePower:bouncePower);
            player.vy=-9;
            player.djU=false;airDashUsed=false;
            bounceLockT=10;
            // Push out of platform
            if(fromLeft)player.x=pbp.x-player.w-1;
            else player.x=pbp.x+pbp.w+1;
            addFloat(player.x+player.w/2,player.y-10,'BOUNCE!','#0ff');
            spawnP(player.x+player.w/2,player.y+player.h/2,'#0ff',12);
            playSfx('jump');vib(20);
            $('gameCanvas').classList.add('shake');
            setTimeout(function(){$('gameCanvas').classList.remove('shake');},150);
            break;
        }
    }
}
if(onMove){player.x+=Math.cos(Date.now()*.001*onMove.sp+onMove.phase)*onMove.amp*.02;}
if(!wasOnGround&&player.og){
    airDashUsed=false;lastPlatPos={x:player.x,y:player.y};
    playSfx('land');player.squash=0.7;
    var sx=player.x+player.w/2,sy=player.y+player.h,tb=theme.bg;
    for(var si=0;si<5;si++){
        var sc,svx,svy,ssl,sdc;
        if(tb==='magma'){sc=Math.random()>.5?'#f60':'#f30';svx=r(-2,2);svy=r(-3,-1);ssl=r(2,4);sdc=0.04;}
        else if(tb==='swamp'||tb==='bio'){sc='#4f4';svx=r(-1,1);svy=r(-1.5,-0.5);ssl=r(4,6);sdc=0.02;}
        else if(tb==='void'||tb==='obsidian'){sc=Math.random()>.5?'#555':'#aaa';svx=r(-4,4);svy=r(-2,0);ssl=r(2,3);sdc=0.06;}
        else if(tb==='ocean'||tb==='ice'||tb==='aurora'){sc=Math.random()>.5?'#0af':'#0ff';svx=r(-3,3);svy=r(-3,-1);ssl=r(2,4);sdc=0.04;}
        else if(tb==='sun'||tb==='rust'||tb==='dust'){sc=Math.random()>.5?'#f80':'#a60';svx=r(-2,2);svy=r(-1,0);ssl=r(2,4);sdc=0.04;}
        else if(tb==='storm'||tb==='glitch'){sc=Math.random()>.5?'#ff0':'#0f0';svx=r(-4,4);svy=r(-4,-1);ssl=r(1,3);sdc=0.06;}
        else if(tb==='ghost'||tb==='mirror'||tb==='star'){sc='#fff';svx=r(-1,1);svy=r(-2,-0.5);ssl=r(2,3);sdc=0.02;}
        else if(tb==='city'||tb==='spire'||tb==='terminal'){sc=Math.random()>.5?'#0ff':'#f0f';svx=r(-3,3);svy=r(-3,-1);ssl=r(2,3);sdc=0.05;}
        else{sc=theme.acc;svx=r(-2,2);svy=r(-2,-1);ssl=r(2,3);sdc=0.04;}
        particles.push({x:sx,y:sy,vx:svx,vy:svy,life:1,decay:sdc,color:sc,size:ssl,type:'dot'});
    }
    for(var pi=0;pi<platforms.length;pi++){
        var pp=platforms[pi];
        if(player.y+player.h>=pp.y&&player.y+player.h<=pp.y+4){
            var edgeL=Math.abs(player.x-pp.x),edgeR=Math.abs(player.x+player.w-(pp.x+pp.w));
            if(edgeL<8||edgeR<8){stylePoints++;addFloat(player.x+player.w/2,player.y-15,'EDGE!','#ffd700');}
            break;
        }
    }
}

for(var i=0;i<ziplines.length;i++){
    var z=ziplines[i];
    if(!player.og&&player.vy>=0&&player.x+player.w>z.x&&player.x<z.x+z.len&&Math.abs(player.y-z.y)<12){
        if(jumpP){player.vy=theme.jmp;player.djU=false;player.djCD=0;spawnP(player.x+player.w/2,player.y,'#0ff',6);playSfx('jump');break;}
        player.y=z.y;player.vy=0;player.vx=6;player.og=false;
        if(player.x>z.x+z.len-10){player.vy=2;}
    }
}

for(var i=0;i<spikes.length;i++){
    var s=spikes[i];
    if(player.x+player.w>s.x+4&&player.x<s.x+s.w-4&&player.y+player.h>s.y+6&&player.y<s.y+s.h){
        handleDeath('spike'); return;
    }
}
for(var i=0;i<spikes.length;i++){
    var s=spikes[i];
    if(!s.nearMissed&&player.x+player.w>s.x-8&&player.x<s.x+s.w+8&&player.y+player.h>s.y-8&&player.y<s.y+s.h+8){
        s.nearMissed=true;stylePoints++;addFloat(player.x+player.w/2,player.y-10,'CLOSE!','#f80');
    }
}

for(var i=0;i<lasers.length;i++){
    var l=lasers[i];
    var phase = timeFrozen>0 ? l.on+1 : (frameCount + l.offset) % (l.on + l.off);
    l.active = phase < l.on;
    l.phaseRatio = phase / l.on;
    
    if(phase === l.off - 1 && !l.warned && sfxOn && ac) {
        var o=ac.createOscillator(),g=ac.createGain(),now=ac.currentTime;
        o.type='sine';o.frequency.setValueAtTime(800,now);o.frequency.exponentialRampToValueAtTime(200,now+0.08);
        o.connect(g);g.connect(ac.destination);g.gain.setValueAtTime(0.04,now);g.gain.exponentialRampToValueAtTime(0.001,now+0.08);
        o.start(now);o.stop(now+0.08);
        l.warned=true;
    }
    if(l.active) l.warned=false;
    
    if(l.active && player.x+player.w>l.x-4 && player.x<l.x+4 && player.y+player.h>l.y && player.y<l.y+l.h){
        handleDeath('laser'); return;
    }
}
for(var i=0;i<lasers.length;i++){
    var l=lasers[i];
    if(l.active&&!l.nearMissed&&player.x+player.w>l.x-12&&player.x<l.x+12&&player.y+player.h>l.y-8&&player.y<l.y+l.h+8){
        if(!(player.x+player.w>l.x-4&&player.x<l.x+4&&player.y+player.h>l.y&&player.y<l.y+l.h)){
            l.nearMissed=true;stylePoints++;addFloat(player.x+player.w/2,player.y-10,'CLOSE!','#f00');
        }
    }
}

for(var i=0;i<chips.length;i++){
    var c=chips[i];
    if(!c.col && hasSkill('magnet')){
        // Magnet: pull all gems toward player (silver arc + gold platform-top)
        var mdx=(player.x+player.w/2)-c.x, mdy=(player.y+player.h/2)-c.y;
        var mdist=Math.sqrt(mdx*mdx+mdy*mdy);
        if(mdist<100 && mdist>0){
            var pullStrength=Math.min(0.25, (1-mdist/100)*0.4);
            c.x+=mdx*pullStrength;
            c.y+=mdy*pullStrength;
        }
    }
    if(!c.col && player.x+player.w>c.x-12 && player.x<c.x+12 && player.y+player.h>c.y-12 && player.y<c.y+12){
        c.col=true;
        if(sessionCollectedChips.indexOf(i)<0)sessionCollectedChips.push(i);
        
        var cArr = bestChips[curLvl] || [];
        var isGold = !c.isArc && !c.kind && c.goldIdx!=null && !cArr[c.goldIdx];
        
        if(c.kind==='master'){
            // Champion master gem: +2 gold, mark as collected persistently
            var stm=normalizeLevelStat(levelStats[curLvl]);
            var mgArr=stm.masterGems||[];
            if(mgArr.indexOf(c.mgIdx)<0){
                mgArr.push(c.mgIdx);stm.masterGems=mgArr;levelStats[curLvl]=stm;save('stats',levelStats);
                bonusGold += 2; save('bonusGold', bonusGold);
            }
            playSfx('coin');vib(40);
            for(var mp=0;mp<24;mp++){var ma=mp/24*Math.PI*2;particles.push({x:c.x,y:c.y,vx:Math.cos(ma)*r(2,5),vy:Math.sin(ma)*r(2,5),life:1,decay:r(0.015,0.03),color:'hsl('+(mp*15)+',100%,60%)',size:r(3,5),type:'dot'});}
            addFloat(c.x,c.y-20,'\u2728 +2 \u2605 MASTER GEM','#ffd700');
            gemFlash=0.5;
        } else if(c.kind==='daily'){
            // Daily Master chip: gold for champion, silver for non-champion
            var dailyData=load('dailyMaster',{day:'',collected:false});
            dailyData={day:getDailyKey(),collected:true};
            save('dailyMaster',dailyData);
            playSfx('coin');vib(40);
            if(championStatus.unlocked){
                bonusGold+=5;save('bonusGold',bonusGold);
                addFloat(c.x,c.y-20,'\ud83d\udc8e +5 \u2605 DAILY GEM','#ffd700');
                for(var dp=0;dp<20;dp++){var da=dp/20*Math.PI*2;particles.push({x:c.x,y:c.y,vx:Math.cos(da)*r(2,4),vy:Math.sin(da)*r(2,4),life:1,decay:r(0.02,0.04),color:'#ffd700',size:r(3,5),type:'dot'});}
            }else{
                silverWallet+=5;save('silver',silverWallet);
                addFloat(c.x,c.y-20,'\ud83d\udc8e +5 \u2666 DAILY','#0ff');
                for(var dp=0;dp<20;dp++){var da=dp/20*Math.PI*2;particles.push({x:c.x,y:c.y,vx:Math.cos(da)*r(2,4),vy:Math.sin(da)*r(2,4),life:1,decay:r(0.02,0.04),color:'#0ff',size:r(3,5),type:'dot'});}
            }
            gemFlash=0.4;
        } else if (isGold) {
            runGold++;
            playSfx('coin');vib(20);
            spawnP(c.x, c.y, '#ffd700', 14);
            comboTimer=Date.now()+2000;comboCount++;
            if(comboCount>1){stylePoints+=comboCount;addFloat(c.x,c.y-20,'x'+comboCount,'#0ff');}
            gemFlash=0.3;
        } else {
            var _sgain=silverGainAmt();
            runSilver+=_sgain;
            playSfx('coin');vib(10);
            spawnP(c.x, c.y, '#cccccc', 8);
            comboTimer=Date.now()+2000;comboCount++;
            if(comboCount>1){stylePoints+=comboCount;addFloat(c.x,c.y-20,'x'+comboCount,'#0ff');}
        }
        
        $('hudChips').innerHTML='<span style="color:#ffd700">★ '+runGold+'</span> &nbsp; <span style="color:#ccc">♦ '+runSilver+'</span>';
    }
}
if(comboTimer>0&&Date.now()>comboTimer){comboTimer=0;comboCount=0;}
if(tripleJumpCD>0)tripleJumpCD-=dt;
if(shieldInvuln>0)shieldInvuln-=dt;
if(timeFrozen>0){timeFrozen-=dt;if(timeFrozen<=0)addFloat(player.x+player.w/2,player.y-20,'UNFREEZE','#08f');}
if(freezeCD>0)freezeCD-=dt;
if(consumableTimefreeze)$('freezeBtn').style.opacity=freezeCD<=0&&timeFrozen<=0?'1':'0.3';

// Live HUD cooldown updates
if(frameCount%5===0){
    var hudParts=[];
    if(activeConsumable==='triplejump'){var tjs=(tripleJumpCD/60).toFixed(1);hudParts.push('\u2b06 TRIPLE '+(tripleJumpCD<=0?'\u2713':'('+tjs+'s)'));}
    if(consumableTimefreeze){var fcs=(freezeCD/60).toFixed(0);if(timeFrozen>0)hudParts.push('\u23f8 FROZEN '+(timeFrozen/60).toFixed(0)+'s');else hudParts.push('\u23f8 FREEZE '+(freezeCD<=0?'\u2713':'('+fcs+'s)'));}
    if(hasSkill('slowfall'))hudParts.push('\ud83e\ude82 SLOWFALL');
    $('hudConsumable').textContent=hudParts.join(' \u2022 ');
    var shEl=$('hudShield');if(shEl){if(shieldHits>0){shEl.style.display='block';shEl.textContent='\ud83d\udee1 SHIELD x'+shieldHits;}else shEl.style.display='none';}
    var resEl=$('hudResurrect');if(resEl&&hasSkill('resurrect')){resEl.style.display='block';var resCDms=120000-(Date.now()-lastResurrectTime);if(resCDms<=0)resEl.textContent='\u2764 RESURRECT \u2713 READY';else{var resMin=Math.floor(resCDms/60000),resSec=Math.floor((resCDms%60000)/1000);resEl.textContent='\u2764 RESURRECT '+resMin+'m'+resSec+'s';}}
}

updateCameraAndHud();
if(player.y>fallLimitY){
    handleDeath('fall'); return;
}
}

function loop(){
    if(!gameRunning)return;
    var now=performance.now();
    if(lastFrameTime===0) lastFrameTime=now;
    dt=Math.min((now-lastFrameTime)/16.667, DT_MAX);
    var frameMs=now-lastFrameTime;
    lastFrameTime=now;
    fpsTrack(frameMs);
    if(!isPaused){update();updateWeather();}
    draw();drawWeather();
    if(showFps && curFps>0){ctx.save();ctx.fillStyle=curFps>=50?'#0f8':curFps>=35?'#fa0':'#f05';ctx.font='bold 12px monospace';ctx.textAlign='right';ctx.fillText(curFps+' FPS',canvas.width-8,canvas.height-8);ctx.restore();}
    if(isPaused&&!$('gameSettings').classList.contains('active')){ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle=theme.acc;ctx.font='bold 2.5rem monospace';ctx.textAlign='center';ctx.fillText('PAUSED',canvas.width/2,canvas.height/2-10);ctx.fillStyle='#fff';ctx.font='1rem monospace';ctx.fillText('Tap Logo or ESC to Resume',canvas.width/2,canvas.height/2+30);}
    animId=requestAnimationFrame(loop);
}
var fpsBuf=[],fpsBufI=0,curFps=0,lastFpsCheck=0,lowFpsAccum=0,qualityHinted=false;
function fpsTrack(ms){
    if(!ms||ms<=0||ms>1000)return;
    fpsBuf[fpsBufI++%30]=ms;
    if(fpsBufI%30!==0)return;
    var sum=0,n=Math.min(fpsBuf.length,30);
    for(var i=0;i<n;i++)sum+=fpsBuf[i];
    var avg=sum/n;
    curFps=Math.round(1000/avg);
    if(curFps<35 && visualQuality!=='low' && !isPaused && gameRunning && !replayMode){
        lowFpsAccum++;
        if(lowFpsAccum>=4 && !qualityHinted){suggestLowerQuality();qualityHinted=true;}
    }else lowFpsAccum=0;
}
function suggestLowerQuality(){
    var nextQ = visualQuality==='high'?'med':'low';
    addFloat(camX+canvas.width/2,camY+100,'\u26a1 Low FPS \u2014 Pause \u2192 Visual: '+nextQ.toUpperCase(),'#fa0');
}

// === FLOW ===
function showWin(){
gameRunning=false;
// In replay/rewatch mode: skip win banner, stats, and rewards. Go straight back to stage select.
if(replayMode){
    exitReplay();
    return;
}
if(typeof isDailyStage!=='undefined'&&isDailyStage){
    showDailyWin();
    return;
}
var dist=Math.floor(player.x/10);
sendMetric('level_complete',{level:curLvl,time:runTime,deaths:deaths,gold:runGold,silver:runSilver,style:stylePoints,resurrected:runUsedResurrect});
var st=normalizeLevelStat(levelStats[curLvl]);
var _ghostJustUnlocked=false;
if(curLvl===0||curLvl===1){
    var _prev0=levelStats[0]&&levelStats[0].completions>0;
    var _prev1=levelStats[1]&&levelStats[1].completions>0;
    var _wasLocked=!(_prev0&&_prev1);
    st.completions++;
    if(!st.first&&deaths===0)st.first=true;
    st.silver = (st.silver || 0) + runSilver;
    st.contentVersion = STAGE_CONTENT_VERSION;
    levelStats[curLvl]=st;save('stats',levelStats);
    if(_wasLocked && isGhostUnlocked())_ghostJustUnlocked=true;
}else{
    st.completions++;
    if(!st.first&&deaths===0)st.first=true;
    st.silver = (st.silver || 0) + runSilver;
    st.contentVersion = STAGE_CONTENT_VERSION;
    levelStats[curLvl]=st;save('stats',levelStats);
}

globalData.matches++;
var elapsed = runTime || (Date.now() - startTime);
if(elapsed > 0 && elapsed < 86400000) {
    globalData.timePlayed += elapsed;

    st.timePlayed = (st.timePlayed || 0) + elapsed;
}
levelStats[curLvl]=st;save('stats',levelStats);
save('globalData', globalData);
earnedSilver = runSilver;
silverWallet += runSilver;
save('silver', silverWallet);
runSilver = 0;
sessionCollectedChips=[];sessionStage=-1;
runScore = Math.floor(player.x/10) + (runGold*50) + (earnedSilver*10) + (stylePoints*5) - (deaths*10) + Math.max(0, Math.floor(300 - runTime/100));
if(runScore<0)runScore=0;
var bestScore = bestScores[curLvl] || 0;
if(runScore > bestScore){bestScores[curLvl]=runScore;save('scores',bestScores);}

var cArr = bestChips[curLvl] || [];
// Pack by gold-chip ordinal (0..maxGems-1) instead of sparse chips-array index
for(var i=0; i<chips.length; i++) {
    var c=chips[i];
    if(c.col && !c.isArc && !c.kind && c.goldIdx!=null) cArr[c.goldIdx] = true;
}
bestChips[curLvl] = cArr;
save('chips', bestChips);
var _newBest = !bestTimes[curLvl] || runTime < bestTimes[curLvl];
if(_newBest) {
    bestTimes[curLvl] = runTime;
    save('times', bestTimes);
}
// Save ghost if new best OR no ghost data yet (first capture after migration/wipe)
if(_newBest || !ghostData[curLvl] || ghostData[curLvl].length === 0) {
    ghostData[curLvl]=ghostFrames;
    save('ghostData',ghostData);
}

var newUnlockNames = [];
var nextLvl = curLvl + 1;
for(var ui=1;ui<=2;ui++){
    var uLvl=curLvl+ui;
    if(uLvl<LEVELS.length&&!unlocked.includes(uLvl)){unlocked.push(uLvl);newUnlockNames.push(LEVELS[uLvl].name);}
}
if(newUnlockNames.length > 0) save('unlocked', unlocked);

if (curLvl + 1 < LEVELS.length) {
    lastPlayed = curLvl + 1;
    save('lastPlayed', lastPlayed);
}

var ov=$('overlay');
ov.onclick=null;
$('ovTitle').textContent='SECTOR CLEARED!';
$('ovTitle').style.color=theme.acc;
var unlockHtml = newUnlockNames.length > 0 ? '<br><div style="margin-top:10px;padding:8px 16px;border-radius:8px;background:rgba(0,255,136,0.1);border:1px solid rgba(0,255,136,0.3);color:#0f8;font-weight:bold;">🔓 Unlocked: ' + newUnlockNames.join(', ') + '</div>' : '';
if(_ghostJustUnlocked)unlockHtml += '<br><div style="margin-top:10px;padding:10px 16px;border-radius:8px;background:rgba(0,255,255,0.15);border:1px solid rgba(0,255,255,0.5);color:#0ff;font-weight:bold;font-size:0.95rem;">\ud83d\udc7b Ghost Rival unlocked! <span style="font-size:0.7rem;color:#aaa;display:block;font-weight:normal;margin-top:4px;">Free skill \u2014 always equipped, doesn\'t use slots</span></div>';
$('ovMsg').innerHTML='Sector '+LEVELS[curLvl].name+' complete!<br>Score: <b style="color:#ffd700">'+runScore+'</b><br>Gold: '+runGold+' | Silver: '+earnedSilver+' | Style: '+stylePoints+'<br>Time: '+(runTime/1000).toFixed(2)+'s<br>Best: '+(bestTimes[curLvl]/1000).toFixed(2)+'s'+(st.first?' <br><b style="color:#0f8">FIRST TRY!</b>':'')+unlockHtml;
$('ovBtn').textContent='NEXT LEVEL';
$('ovBtn').style.background='';
$('ovBtn').style.display='inline-block';
$('homeTooltip').classList.remove('active');
$('ovBtn').onclick=function(){ ov.classList.remove('active'); activeIdx=nextLvl<LEVELS.length?nextLvl:curLvl; endGame(); };
$('ovBtnExtra').style.display='inline-block';
$('ovBtnExtra').textContent='\ud83d\udd01 RETRY';
$('ovBtnExtra').onclick=function(){ ov.classList.remove('active'); $('gameCanvas').classList.remove('grey'); $('gameCanvas').classList.remove('shake'); startLvl(curLvl); if(musOn) startMusic(); };
var hasReplay=ghostsEnabled&&ghostData[curLvl]&&ghostData[curLvl].length>0;
$('ovBtnReplay').style.display=hasReplay?'inline-block':'none';
$('ovBtnReplay').textContent='\ud83c\udfac WATCH';
$('ovBtnReplay').onclick=function(){ ov.classList.remove('active'); $('gameCanvas').classList.remove('grey'); startReplay(curLvl); };
$('ovBtnCancel').style.display='inline-block';
$('ovBtnCancel').textContent='\ud83d\udcf7 SHARE';
$('ovBtnCancel').style.background='linear-gradient(135deg,#25D366,#128C7E)';
$('ovBtnCancel').onclick=function(){ shareResult(); };
if(checkChampionStatus()){ov.classList.remove('active');setTimeout(showChampionCeremony,400);return;}
ov.classList.add('active');
}

function showChampionCeremony(){
    championStatus.ceremonyShown=true;save('championStatus',championStatus);
    var ov=$('overlay');
    var totalCompletions=0,totalAttempts=0,totalDeaths=globalData.deadFall+globalData.deadSpike+globalData.deadLaser,totalTime=globalData.timePlayed;
    for(var i=0;i<LEVELS.length;i++){if(levelStats[i]){totalCompletions+=levelStats[i].completions||0;totalAttempts+=levelStats[i].attempts||0;}}
    var totalChips=0,maxChips=0;
    for(var i=0;i<LEVELS.length;i++){var carr=bestChips[i]||[];for(var j=0;j<carr.length;j++){if(carr[j])totalChips++;maxChips++;}}
    var hours=Math.floor(totalTime/3600000),mins=Math.floor((totalTime%3600000)/60000);
    var timeStr=hours>0?hours+'h '+mins+'m':mins+'m';
    $('ovTitle').innerHTML='\u2605 MASTER OF N30N \u2605';
    $('ovTitle').style.color='#ffd700';
    $('ovTitle').style.textShadow='0 0 20px #ffd700, 0 0 40px #ff8';
    $('ovMsg').innerHTML=
        '<div style="font-size:0.9rem;margin-bottom:14px;color:#fff;">All 20 stages conquered. You earned this.</div>'+
        '<div style="background:linear-gradient(135deg,rgba(255,215,0,0.15),rgba(255,140,0,0.1));border:1px solid #ffd700;border-radius:12px;padding:12px;margin:10px 0;font-size:0.75rem;line-height:1.7;">'+
            '<div style="color:#ffd700;font-weight:700;margin-bottom:6px;">\u2728 REWARDS UNLOCKED</div>'+
            '<div>\u2605 <b>MASTER</b> badge \u2014 prefixed to your name</div>'+
            '<div>\u2728 <b>Champion\'s Aura</b> cosmetic (Glow slot)</div>'+
            '<div>\ud83c\udf00 <b>Clipping</b> skill \u2014 once per run, ignore one hazard</div>'+
            '<div>\ud83d\udc8e <b>1.5\u00d7 Silver</b> on all gem pickups (passive)</div>'+
        '</div>'+
        '<div style="background:rgba(0,255,255,0.05);border:1px solid rgba(0,255,255,0.2);border-radius:10px;padding:10px;margin-top:8px;font-size:0.7rem;line-height:1.6;color:#ccc;">'+
            '<div style="color:#0ff;font-weight:700;margin-bottom:4px;">\ud83d\udcca CAREER STATS</div>'+
            '<div>Player: <b style="color:#ffd700;">'+getDisplayName()+'</b></div>'+
            '<div>Total clears: '+totalCompletions+' / Attempts: '+totalAttempts+'</div>'+
            '<div>Deaths: '+totalDeaths+' / Time played: '+timeStr+'</div>'+
            '<div>Gold chips collected: '+totalChips+' / '+maxChips+'</div>'+
        '</div>';
    $('ovBtn').style.display='inline-block';
    $('ovBtn').textContent='\u2728 CONTINUE';
    $('ovBtn').style.background='linear-gradient(135deg,#ffd700,#ff8c00)';
    $('ovBtn').onclick=function(){ov.classList.remove('active');$('ovTitle').style.textShadow='';goHome();};
    $('ovBtnExtra').style.display='none';
    $('ovBtnReplay').style.display='none';
    $('ovBtnCancel').style.display='inline-block';
    $('ovBtnCancel').textContent='SHARE';
    $('ovBtnCancel').style.background='linear-gradient(135deg,#25D366,#128C7E)';
    $('ovBtnCancel').onclick=function(){shareChampionResult();};
    ov.classList.add('active');
    spawnConfetti();
}
function spawnConfetti(){
    var colors=['#ffd700','#ff8c00','#ff0','#fff','#0ff','#f0a','#0f8'];
    for(var i=0;i<70;i++){
        (function(idx){
            setTimeout(function(){
                var p=document.createElement('div');
                p.className='confetti-piece';
                p.style.left=(Math.random()*100)+'vw';
                p.style.background=colors[Math.floor(Math.random()*colors.length)];
                p.style.animationDuration=(2+Math.random()*2.5)+'s';
                p.style.transform='rotate('+(Math.random()*360)+'deg)';
                p.style.width=(6+Math.random()*8)+'px';
                p.style.height=(10+Math.random()*8)+'px';
                p.style.opacity=String(0.7+Math.random()*0.3);
                document.body.appendChild(p);
                setTimeout(function(){if(p.parentNode)p.parentNode.removeChild(p);},5000);
            },idx*30);
        })(i);
    }
}

function shareChampionResult(){
    var sc=document.createElement('canvas');sc.width=600;sc.height=380;
    var sx=sc.getContext('2d');
    // Gold gradient bg
    var g=sx.createLinearGradient(0,0,0,380);
    g.addColorStop(0,'#1a0a00');g.addColorStop(0.5,'#3a1f00');g.addColorStop(1,'#0a0500');
    sx.fillStyle=g;sx.fillRect(0,0,600,380);
    // Gold grid
    sx.strokeStyle='#ffd700';sx.lineWidth=1;sx.globalAlpha=0.1;
    for(var gx=0;gx<600;gx+=40){sx.beginPath();sx.moveTo(gx,0);sx.lineTo(gx,380);sx.stroke();}
    for(var gy=0;gy<380;gy+=40){sx.beginPath();sx.moveTo(0,gy);sx.lineTo(600,gy);sx.stroke();}
    sx.globalAlpha=1;
    // Title
    sx.fillStyle='#fff';sx.font='bold 26px monospace';sx.textAlign='center';
    sx.fillText('N3ON DashJ',300,42);
    sx.shadowColor='#ffd700';sx.shadowBlur=20;
    sx.fillStyle='#ffd700';sx.font='bold 30px monospace';
    sx.fillText('\u2605 MASTER OF N3ON \u2605',300,90);
    sx.shadowBlur=0;
    // Character portrait (right side)
    drawCharOnCtx(sx, 540, 230, 1.8, Date.now()*0.001);
    // Subtitle
    sx.fillStyle='#fff';sx.font='bold 18px monospace';
    sx.fillText('All 20 stages conquered',300,130);
    // Stats
    var totalCompletions=0,totalAttempts=0,totalDeaths=globalData.deadFall+globalData.deadSpike+globalData.deadLaser,totalTime=globalData.timePlayed;
    for(var i=0;i<LEVELS.length;i++){if(levelStats[i]){totalCompletions+=levelStats[i].completions||0;totalAttempts+=levelStats[i].attempts||0;}}
    var totalChips=0,maxChips=0;
    for(var i=0;i<LEVELS.length;i++){var carr=bestChips[i]||[];for(var j=0;j<carr.length;j++){if(carr[j])totalChips++;maxChips++;}}
    var hours=Math.floor(totalTime/3600000),mins=Math.floor((totalTime%3600000)/60000);
    var timeStr=hours>0?hours+'h '+mins+'m':mins+'m';
    sx.font='17px monospace';sx.textAlign='left';sx.fillStyle='#fff';
    var sy=180;
    sx.fillText('\ud83d\udc64 '+getDisplayName(),60,sy);
    sx.fillText('\u23f1 '+timeStr,350,sy);sy+=32;
    sx.fillText('\u2705 Clears: '+totalCompletions,60,sy);
    sx.fillText('\u270c Attempts: '+totalAttempts,350,sy);sy+=32;
    sx.fillText('\u2605 '+totalChips+' / '+maxChips+' gold',60,sy);
    sx.fillText('\ud83d\udc80 '+totalDeaths+' deaths',350,sy);sy+=46;
    // Rank
    var ri=getPlayerRankInfo();
    sx.fillStyle=ri.current.color;sx.font='bold 19px monospace';sx.textAlign='center';
    sx.fillText('\ud83c\udf1f '+ri.current.name,300,sy);
    // Footer
    sx.fillStyle='#888';sx.font='12px monospace';
    sx.fillText('jstylr.pages.dev',300,360);
    // Gold border
    sx.strokeStyle='#ffd700';sx.lineWidth=3;sx.strokeRect(2,2,596,376);
    sc.toBlob(function(blob){
        var file=new File([blob],'n3ondashj-master.png',{type:'image/png'});
        var txt='\u2605 N3ON DashJ \u2605\nMASTER OF N30N \u2014 all 20 stages conquered!\n\ud83d\udc64 '+getDisplayName()+' \u2022 \u23f1 '+timeStr+' \u2022 \u2605 '+totalChips+'/'+maxChips+' gold\n\ud83d\udd17 '+location.href;
        if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){
            navigator.share({text:txt,files:[file]}).catch(function(){});
        }else{
            var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='n3ondashj-master.png';a.click();
            if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(txt).catch(function(){});
        }
    },'image/png');
}

function shareResult(){
    // Generate share card on canvas
    var sc=document.createElement('canvas');sc.width=600;sc.height=340;
    var sx=sc.getContext('2d');
    // Background gradient from theme
    var g=sx.createLinearGradient(0,0,0,340);
    g.addColorStop(0,theme.skyT);g.addColorStop(0.5,theme.skyM);g.addColorStop(1,theme.skyB);
    sx.fillStyle=g;sx.fillRect(0,0,600,340);
    // Grid overlay
    sx.strokeStyle=theme.grid;sx.lineWidth=1;sx.globalAlpha=0.08;
    for(var gx=0;gx<600;gx+=40){sx.beginPath();sx.moveTo(gx,0);sx.lineTo(gx,340);sx.stroke();}
    for(var gy=0;gy<340;gy+=40){sx.beginPath();sx.moveTo(0,gy);sx.lineTo(600,gy);sx.stroke();}
    sx.globalAlpha=1;
    // Title
    sx.fillStyle='#fff';sx.font='bold 28px monospace';sx.textAlign='center';
    sx.fillText('N3ON DashJ',300,40);
    // Player name with MASTER badge
    if(playerName){var dn=getDisplayName();sx.fillStyle=championStatus.unlocked?'#ffd700':'#ccc';sx.font='14px monospace';sx.fillText(dn,300,58);}
    // Character portrait (right side)
    drawCharOnCtx(sx, 540, 220, 1.6, Date.now()*0.001);
    // Level name
    sx.fillStyle=theme.acc;sx.font='bold 22px monospace';
    sx.fillText('\u2705 '+LEVELS[curLvl].name+' CLEARED!',300,80);
    // Stats
    sx.fillStyle='#fff';sx.font='18px monospace';sx.textAlign='left';
    var sy=120;
    sx.fillText('\u23f1 Time: '+(runTime/1000).toFixed(2)+'s',60,sy);
    sx.fillText('\ud83c\udfc6 Best: '+(bestTimes[curLvl]/1000).toFixed(2)+'s',350,sy);
    sy+=35;
    sx.fillText('\u2b50 Style: '+stylePoints,60,sy);
    sx.fillText('\ud83d\udc80 Deaths: '+deaths,350,sy);
    sy+=35;
    sx.fillText('\u2605 Gold: '+runGold,60,sy);
    sx.fillText('\u2666 Silver: '+earnedSilver,350,sy);
    sy+=50;
    // Rank
    var ri=getPlayerRankInfo();
    sx.fillStyle=ri.current.color;sx.font='bold 20px monospace';sx.textAlign='center';
    sx.fillText('\ud83c\udf1f '+ri.current.name,300,sy);
    // Footer
    sx.fillStyle='#666';sx.font='12px monospace';
    sx.fillText('jstylr.pages.dev',300,320);
    // Border
    sx.strokeStyle=theme.acc;sx.lineWidth=3;sx.strokeRect(2,2,596,336);

    sc.toBlob(function(blob){
        var file=new File([blob],'n3ondashj-clear.png',{type:'image/png'});
        var txt='\ud83c\udfae N3ON DashJ\n\u2705 '+LEVELS[curLvl].name+' CLEARED!\n\u23f1 '+(runTime/1000).toFixed(2)+'s | \u2b50 Style: '+stylePoints+' | \ud83d\udc80 Deaths: '+deaths+'\n\ud83d\udd17 '+location.href;
        if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){
            navigator.share({text:txt,files:[file]}).catch(function(){});
        }else{
            // Fallback: download image + copy text to clipboard
            var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='n3ondashj-clear.png';a.click();
            if(navigator.clipboard&&navigator.clipboard.writeText){
                navigator.clipboard.writeText(txt).then(function(){addFloat(player.x+player.w/2,player.y-20,'COPIED + SAVED!','#0f8');});
            }else{
                addFloat(player.x+player.w/2,player.y-20,'IMAGE SAVED!','#0f8');
            }
        }
    },'image/png');
}

function handleDeath(cause) {
    if(shieldInvuln>0&&cause!=='fall')return;
    if(cause!=='fall'&&hasSkill('phasedash')&&!phaseDashUsed){
        phaseDashUsed=true;
        shieldInvuln=45;
        var pcx=player.x+player.w/2, pcy=player.y+player.h/2;
        for(var pi=0;pi<24;pi++){var pang=pi/24*Math.PI*2;particles.push({x:pcx,y:pcy,vx:Math.cos(pang)*r(2,5),vy:Math.sin(pang)*r(2,5),life:1,decay:r(0.02,0.04),color:Math.random()<0.5?'#a0f':'#fff',size:r(2,4),type:'dot'});}
        particles.push({x:pcx,y:pcy,vx:0,vy:0,life:1,decay:0.025,color:'#a0f',type:'ring',size:5,grow:14});
        addFloat(pcx,player.y-10,'\u2728 CLIP!','#a0f');
        playSfx('jump');vib(15);
        return;
    }
    if(cause!=='fall'&&shieldHits>0){shieldHits--;dblshieldUsed=true;shieldInvuln=60;spawnP(player.x+player.w/2,player.y+player.h/2,'#0ff',15);addFloat(player.x+player.w/2,player.y-10,'SHIELD!','#0ff');playSfx('land');vib(20);player.vy=theme.jmp*0.7;return;}
    // Shield removed as skill - dblshield consumable handles this case via shieldHits
    if(hasSkill('resurrect')&&Date.now()-lastResurrectTime>120000){
        lastResurrectTime=Date.now();save('lastResurrect',lastResurrectTime);
        var cx=player.x+player.w/2, cy=player.y+player.h/2;
        // Expanding rings (3 layers)
        particles.push({x:cx,y:cy,vx:0,vy:0,life:1,decay:0.015,color:'#0f8',type:'ring',size:5,grow:18});
        particles.push({x:cx,y:cy,vx:0,vy:0,life:1,decay:0.022,color:'#0ff',type:'ring',size:5,grow:14});
        particles.push({x:cx,y:cy,vx:0,vy:0,life:1,decay:0.03,color:'#fff',type:'ring',size:5,grow:10});
        // Burst of particles
        for(var ri=0;ri<50;ri++){var rang=ri/50*Math.PI*2,rspd=r(2,8);particles.push({x:cx,y:cy,vx:Math.cos(rang)*rspd,vy:Math.sin(rang)*rspd,life:1,decay:r(0.015,0.04),color:Math.random()>0.5?'#0f8':'#0ff',size:r(3,5),type:'dot'});}
        // Upward floating sparkles
        for(var si=0;si<25;si++)particles.push({x:cx+r(-30,30),y:cy+r(-10,30),vx:r(-0.5,0.5),vy:r(-3,-1),life:1,decay:0.01,color:'#0f8',size:r(2,4),type:'dot'});
        resurrectFlash=1.0;
        runUsedResurrect=true;
        _ghostTeleportFlag=true;
        player.x=lastPlatPos.x;player.y=lastPlatPos.y;player.vx=0;player.vy=0;player.og=true;
        addFloat(player.x+player.w/2,player.y-30,'\u2728 REVIVED \u2728','#0f8');
        playSfx('land');vib([30,30,60,30,30]);
        return;
    }
    player.dead=true;
    if(typeof isDailyStage!=='undefined'&&isDailyStage){
        bonusGold += runGold; save('bonusGold', bonusGold);
        silverWallet += runSilver; save('silver', silverWallet);
        runGold = 0; runSilver = 0;
        var dstats = getDailyStats();
        dstats.played = true; dstats.deaths = (dstats.deaths||0)+1;
        saveDailyStats(dstats);
        sendMetric('level_death',{level:-1,cause:cause,time:runTime||(Date.now()-startTime),deaths:deaths+1,gold:runGold,silver:runSilver,isDaily:true});
    } else {
        sendMetric('level_death',{level:curLvl,cause:cause,time:runTime||(Date.now()-startTime),deaths:deaths+1,gold:runGold,silver:runSilver});
    }
    // NOTE: do NOT finalizeRunConsumables() here — preserve consumable state across retries.
    // It will be finalized only on win (showWin) or exit (goHome via confirmExit).
    lastDeathType=cause;
    deaths++;
    if(!deathBonusThreshold)deathBonusThreshold=Math.floor(Math.random()*11)+15;
    if(deaths>=deathBonusThreshold){var dcons=['triplejump','dblshield'];var dcid=dcons[Math.floor(Math.random()*dcons.length)];consumableInv[dcid]=(consumableInv[dcid]||0)+1;save('consumableInv',consumableInv);addFloat(player.x+player.w/2,player.y-30,'FREE '+(dcid==='triplejump'?'\u2b06\ufe0f':'\ud83d\udee1\ufe0f')+'!','#0f8');deathBonusThreshold=Math.floor(Math.random()*11)+15;deaths=0;}
    
    if(!(typeof isDailyStage!=='undefined'&&isDailyStage)){
        var st=normalizeLevelStat(levelStats[curLvl]);
        st.hazards = (st.hazards || 0) + 1;
        levelStats[curLvl]=st; save('stats',levelStats);
    }
    globalData.matches++;
    if(cause === 'fall') globalData.deadFall++;
    else if(cause === 'spike') globalData.deadSpike++;
    else if(cause === 'laser' || cause === 'lightning') globalData.deadLaser++;
    var elapsed = runTime || (Date.now() - startTime);
    if(elapsed > 0 && elapsed < 86400000) {
        globalData.timePlayed += elapsed;
        if(!(typeof isDailyStage!=='undefined'&&isDailyStage)){
            var st=normalizeLevelStat(levelStats[curLvl]);
            st.timePlayed = (st.timePlayed || 0) + elapsed;
            levelStats[curLvl]=st; save('stats',levelStats);
        }
    }
    save('globalData', globalData);
    lastRunSilver=runSilver;
    
    $('hudDeath').textContent=deaths;
    shatterPlayer(); 
    playSfx('die');vib([30,30,60]);
    $('gameCanvas').classList.add('shake');
    setTimeout(function(){if(!gameRunning)return;$('gameCanvas').classList.add('grey');}, 800);
    setTimeout(showDie, 1400); 
}

function shatterPlayer() {
    var deathCos=equippedCosmetics.death;
    var cx = player.x + player.w/2;
    var cy = player.y + player.h/2;
    deathFlash = 1.0; 
    
    if(deathCos==='death_pixel'){
        // Chunky pixel blocks
        for(var i=0;i<60;i++){if(particles.length>=300)break;var sz=r(4,9);particles.push({x:cx+r(-15,15),y:cy+r(-20,20),vx:r(-6,6)+player.vx*0.4,vy:r(-8,4)+player.vy*0.4,life:1,decay:r(0.01,0.025),color:Math.random()>0.5?'#fff':'#0ff',type:'pixel',size:sz});}
    } else if(deathCos==='death_dissolve'){
        // Particles drift gently upward and fade
        for(var i=0;i<80;i++){if(particles.length>=300)break;particles.push({x:cx+r(-12,12),y:cy+r(-20,20),vx:r(-1,1),vy:r(-3,-1),life:1,decay:r(0.008,0.018),color:'#aaf',type:'dissolve',size:r(2,5)});}
    } else if(deathCos==='death_logo'){
        // Particles arrange briefly to form N30N then disperse
        var letters=[[-30,-5,-30,5,-30,-5,-22,-5,-22,5],[-15,-5,-15,5,-15,-5,-7,5,-7,-5,-7,5],[3,-5,11,-5,11,5,3,5,3,-5],[19,-5,19,5,19,-5,27,-5,27,5]];
        for(var li=0;li<letters.length;li++){var pts=letters[li];for(var pi=0;pi<pts.length;pi+=2){var tx=cx+pts[pi],ty=cy+pts[pi+1];for(var k=0;k<3;k++){if(particles.length>=300)break;particles.push({x:tx+r(-2,2),y:ty+r(-2,2),vx:r(-0.5,0.5),vy:r(-1,0.5),life:1.5,decay:0.01,color:'#0ff',type:'dot',size:r(2,4)});}}}
        particles.push({x:cx,y:cy,vx:0,vy:0,life:1,decay:0.02,color:'#0ff',type:'ring',size:5,grow:12});
    } else if(deathCos==='death_supernova'){
        // Massive burst with rings and stars
        for(var i=0;i<200;i++){if(particles.length>=300)break;var ang=r(0,Math.PI*2),spd=r(8,30);particles.push({x:cx,y:cy,vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd,life:1,decay:r(0.01,0.025),color:Math.random()>0.5?'#f80':'#ff0',type:'glass',size:r(3,8),rot:r(0,Math.PI*2),rv:r(-1,1)});}
        particles.push({x:cx,y:cy,vx:0,vy:0,life:1,decay:0.01,color:'#f80',type:'ring',size:5,grow:18});
        particles.push({x:cx,y:cy,vx:0,vy:0,life:1,decay:0.015,color:'#ff0',type:'ring',size:5,grow:12});
    } else {
        // Default glass shatter
        for(var i=0;i<250;i++){if(particles.length>=300)break;var speed=r(4,25),angle=r(0,Math.PI*2);particles.push({x:cx+r(-10,10),y:cy+r(-20,20),vx:Math.cos(angle)*speed+player.vx*0.6,vy:Math.sin(angle)*speed+player.vy*0.6-r(2,6),life:1,decay:r(0.005,0.02),color:Math.random()>0.4?theme.acc:'#fff',type:'glass',size:r(3,10),rot:r(0,Math.PI*2),rv:r(-0.8,0.8)});}
    }

    // Shockwave ring
    particles.push({x: cx, y: cy, vx: 0, vy: 0, life: 1, decay: 0.03, color: '#f05', type: 'ring', size: 10, grow: 25});
}

function dayFactor(){
    var elapsed=Date.now()-dayNightStart;
    var t=(elapsed%60000)/60000;
    if(t<0.4)return 1;
    if(t<0.5){var u=(t-0.4)/0.1;return 0.5+0.5*Math.cos(u*Math.PI);}
    if(t<0.9)return 0;
    var u2=(t-0.9)/0.1;return 0.5-0.5*Math.cos(u2*Math.PI);
}
function adjustHex(hex,add){
    // Expand 3-char hex (#abc → #aabbcc) for safety
    if(hex&&hex.length===4)hex='#'+hex[1]+hex[1]+hex[2]+hex[2]+hex[3]+hex[3];
    if(!hex||hex.length<7)return '#000000';
    var r=Math.min(255,Math.max(0,parseInt(hex.slice(1,3),16)+add));
    var g=Math.min(255,Math.max(0,parseInt(hex.slice(3,5),16)+add));
    var b=Math.min(255,Math.max(0,parseInt(hex.slice(5,7),16)+add));
    var h=function(n){var s=n.toString(16);return s.length<2?'0'+s:s;};
    return '#'+h(r)+h(g)+h(b);
}
function adjustedSky(hex){var df=dayFactor();var add=Math.floor(-15+df*55);return adjustHex(hex,add);}

function updateAtmos(){
    if(!theme||!theme.bg)return;
    if(qAtmosMult<=0.05)return;
    var bg=theme.bg, df=dayFactor();
    var maxParts=Math.max(2,Math.floor(30*qAtmosMult));
    var spawnEvery=qAtmosMult<0.4?6:(qAtmosMult<0.8?4:3);
    if(atmosParts.length<maxParts && frameCount%spawnEvery===0){
        if(bg==='magma'){atmosParts.push({t:'ember',x:r(camX-50,camX+canvas.width+50),y:camY+canvas.height+10,vy:-r(0.5,1.5),vx:r(-0.3,0.3),life:1,decay:0.005,size:r(2,4)});}
        else if(bg==='ocean'){atmosParts.push({t:'bubble',x:r(camX-50,camX+canvas.width+50),y:camY+canvas.height+10,vy:-r(0.4,1.0),vx:r(-0.2,0.2),life:1,decay:0.004,size:r(3,7)});}
        else if(bg==='swamp'||bg==='bio'){atmosParts.push({t:'fog',x:r(camX-50,camX+canvas.width+50),y:r(camY+100,camY+canvas.height-50),vx:r(0.2,0.6),vy:r(-0.05,0.05),life:1,decay:0.003,size:r(20,50)});}
        else if(bg==='void'||bg==='obsidian'){if(Math.random()<0.05)atmosParts.push({t:'shoot',x:camX-30,y:r(camY+30,camY+200),vx:r(8,14),vy:r(2,5),life:1,decay:0.015,size:2});}
        else if(bg==='ice'){atmosParts.push({t:'snow',x:r(camX-50,camX+canvas.width+50),y:camY-10,vy:r(0.5,1.2),vx:r(-0.3,0.3),life:1,decay:0.003,size:r(1,3),phase:Math.random()*Math.PI*2});}
        else if(bg==='dust'||bg==='rust'){atmosParts.push({t:'dust',x:r(camX-50,camX+canvas.width+50),y:r(camY+150,camY+canvas.height-30),vx:r(0.5,1.5),vy:r(-0.2,0.2),life:1,decay:0.005,size:r(1,2)});}
        else if(bg==='sun'){atmosParts.push({t:'haze',x:r(camX-50,camX+canvas.width+50),y:r(camY+50,camY+canvas.height-50),vx:r(0.1,0.4),vy:0,life:1,decay:0.004,size:r(15,30)});}
        else if(bg==='aurora'){atmosParts.push({t:'aurora',x:r(camX-100,camX+canvas.width+100),y:r(camY+10,camY+80),vx:r(-0.3,0.3),vy:0,life:1,decay:0.002,size:r(40,80),phase:Math.random()*Math.PI*2});}
        else if(bg==='terminal'){atmosParts.push({t:'code',x:r(camX-30,camX+canvas.width+30),y:camY-20,vy:r(2,4),vx:0,life:1,decay:0.005,size:10,ch:String.fromCharCode(33+Math.floor(Math.random()*94))});}
        else if(bg==='glitch'){if(Math.random()<0.1)atmosParts.push({t:'glitch',x:r(camX,camX+canvas.width),y:r(camY,camY+canvas.height),vx:0,vy:0,life:0.5,decay:0.05,size:r(20,80)});}
        else if(bg==='storm'){if(Math.random()<0.008){atmosParts.push({t:'lightning',x:r(camX,camX+canvas.width),y:camY+30,life:0.3,decay:0.06,size:0});flash=15;}}
        else if(bg==='ghost'){atmosParts.push({t:'wisp',x:r(camX-50,camX+canvas.width+50),y:r(camY+50,camY+canvas.height-50),vx:r(-0.4,0.4),vy:r(-0.3,0.3),life:1,decay:0.004,size:r(8,16),phase:Math.random()*Math.PI*2});}
        else if(bg==='city'||bg==='mirror'){if(Math.random()<0.1)atmosParts.push({t:'wnd',x:r(camX-200,camX+canvas.width+200),y:r(camY+canvas.height*0.4,camY+canvas.height*0.85),life:r(0.5,1.5),decay:0.003,size:r(2,4),phase:Math.random()*Math.PI*2});}
        else if(bg==='spire'||bg==='star'){if(Math.random()<0.15)atmosParts.push({t:'twinkle',x:r(camX-50,camX+canvas.width+50),y:r(camY,camY+canvas.height*0.6),life:r(0.5,1.5),decay:0.005,size:r(1,3),phase:Math.random()*Math.PI*2});}
    }
    for(var i=atmosParts.length-1;i>=0;i--){
        var p=atmosParts[i];
        if(p.vx)p.x+=p.vx;if(p.vy)p.y+=p.vy;
        p.life-=p.decay;
        if(p.life<=0)atmosParts.splice(i,1);
    }
}
function drawAtmos(){
    var df=dayFactor();
    for(var i=0;i<atmosParts.length;i++){
        var p=atmosParts[i];
        var sx=p.x-camX,sy=p.y-camY;
        ctx.globalAlpha=Math.max(0,p.life);
        if(p.t==='ember'){ctx.shadowBlur=8;ctx.shadowColor='#f60';ctx.fillStyle=Math.random()>0.5?'#f80':'#f30';ctx.beginPath();ctx.arc(sx,sy,p.size,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;}
        else if(p.t==='bubble'){ctx.strokeStyle='rgba(170,220,255,0.6)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(sx,sy,p.size,0,Math.PI*2);ctx.stroke();ctx.fillStyle='rgba(170,220,255,0.15)';ctx.fill();}
        else if(p.t==='fog'){ctx.fillStyle='rgba(80,180,80,0.06)';ctx.beginPath();ctx.arc(sx,sy,p.size,0,Math.PI*2);ctx.fill();}
        else if(p.t==='shoot'){ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.shadowBlur=12;ctx.shadowColor='#fff';ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(sx-p.vx*3,sy-p.vy*3);ctx.stroke();ctx.shadowBlur=0;}
        else if(p.t==='snow'){p.x+=Math.sin(Date.now()*.002+p.phase)*0.3;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(sx,sy,p.size,0,Math.PI*2);ctx.fill();}
        else if(p.t==='dust'){ctx.fillStyle='rgba(204,170,136,0.5)';ctx.fillRect(sx,sy,p.size,p.size);}
        else if(p.t==='haze'){ctx.fillStyle='rgba(255,200,100,0.04)';ctx.beginPath();ctx.arc(sx,sy,p.size,0,Math.PI*2);ctx.fill();}
        else if(p.t==='aurora'){var hue=180+Math.sin(Date.now()*.001+p.phase)*60;ctx.strokeStyle='hsla('+hue+',80%,60%,0.3)';ctx.lineWidth=p.size*0.3;ctx.beginPath();ctx.moveTo(sx-p.size,sy);ctx.quadraticCurveTo(sx,sy+Math.sin(Date.now()*.002+p.phase)*15,sx+p.size,sy);ctx.stroke();}
        else if(p.t==='code'){ctx.fillStyle='#0f0';ctx.font='bold 12px monospace';ctx.shadowBlur=6;ctx.shadowColor='#0f0';ctx.fillText(p.ch,sx,sy);ctx.shadowBlur=0;}
        else if(p.t==='glitch'){ctx.fillStyle=Math.random()>0.5?'rgba(255,0,255,0.3)':'rgba(0,255,0,0.3)';ctx.fillRect(sx,sy,p.size,3);}
        else if(p.t==='lightning'){ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.shadowBlur=20;ctx.shadowColor='#aaf';var lx=sx,ly=sy;ctx.beginPath();ctx.moveTo(lx,0);for(var k=0;k<6;k++){lx+=r(-15,15);ly+=30;ctx.lineTo(lx,ly);}ctx.stroke();ctx.shadowBlur=0;}
        else if(p.t==='wisp'){p.x+=Math.sin(Date.now()*.001+p.phase)*0.2;ctx.fillStyle='rgba(255,255,255,0.08)';ctx.beginPath();ctx.arc(sx,sy,p.size,0,Math.PI*2);ctx.fill();}
        else if(p.t==='wnd'){var glow=0.5+Math.sin(Date.now()*.003+p.phase)*0.5;ctx.fillStyle='rgba(255,220,100,'+(0.4*glow)+')';ctx.fillRect(sx,sy,p.size,p.size);}
        else if(p.t==='twinkle'){var sp=0.5+Math.sin(Date.now()*.005+p.phase)*0.5;ctx.fillStyle='rgba(255,255,255,'+sp+')';ctx.beginPath();ctx.arc(sx,sy,p.size,0,Math.PI*2);ctx.fill();}
    }
    ctx.globalAlpha=1;
    // Day/night moon/sun overlay
    if(df>0.7){
        ctx.globalAlpha=(df-0.7)/0.3*0.6;
        ctx.fillStyle='#ffd';ctx.shadowBlur=20;ctx.shadowColor='#ff8';
        ctx.beginPath();ctx.arc(canvas.width-80,80,25,0,Math.PI*2);ctx.fill();
        ctx.shadowBlur=0;ctx.globalAlpha=1;
    } else if(df<0.3){
        ctx.globalAlpha=(0.3-df)/0.3*0.6;
        ctx.fillStyle='#ddf';ctx.shadowBlur=15;ctx.shadowColor='#aaf';
        ctx.beginPath();ctx.arc(canvas.width-80,80,18,0,Math.PI*2);ctx.fill();
        ctx.shadowBlur=0;ctx.globalAlpha=1;
    }
}

function updateLightning(){
    if(theme.weather!=='storm'||player.dead||player.won||curLvl<6)return;
    if(Date.now()>=nextLightningT && platforms.length>0){
        // Pick a platform near the player
        var near=[];
        for(var i=0;i<platforms.length;i++){
            var p=platforms[i];
            if(p.t==='f')continue;
            if(p.x>camX-100 && p.x<camX+canvas.width+200) near.push(p);
        }
        if(near.length>0){
            var tp=near[Math.floor(Math.random()*near.length)];
            lightningStrikes.push({x:tp.x+tp.w/2, y:tp.y, plat:tp, warnT:Date.now()+1000, hitT:0});
        }
        nextLightningT=Date.now()+r(15000,25000);
    }
    // Update strikes
    for(var i=lightningStrikes.length-1;i>=0;i--){
        var s=lightningStrikes[i];
        if(!s.hitT && Date.now()>=s.warnT){
            // Strike happens now
            s.hitT=Date.now();
            flash=20;
            // Damage if player on this platform
            var p=s.plat;
            if(player.og && player.x+player.w>p.x && player.x<p.x+p.w && Math.abs(player.y+player.h-p.y)<5){
                handleDeath('lightning');
            }
        }
        if(s.hitT && Date.now()-s.hitT>800)lightningStrikes.splice(i,1);
    }
}
function drawLightning(){
    for(var i=0;i<lightningStrikes.length;i++){
        var s=lightningStrikes[i];
        var sx=s.x-camX,sy=s.y-camY;
        if(!s.hitT){
            // Warning telegraph - red flash on platform
            var pulse=Math.sin(Date.now()*0.025)*0.5+0.5;
            ctx.fillStyle='rgba(255,0,50,'+(0.3+pulse*0.4)+')';
            ctx.fillRect(s.plat.x-camX,s.plat.y-camY,s.plat.w,4);
            ctx.strokeStyle='#f00';ctx.lineWidth=2;ctx.setLineDash([6,6]);
            ctx.beginPath();ctx.moveTo(sx,0);ctx.lineTo(sx,sy);ctx.stroke();
            ctx.setLineDash([]);
        }else{
            // Strike effect
            var age=(Date.now()-s.hitT)/800;
            ctx.globalAlpha=Math.max(0,1-age);
            ctx.strokeStyle='#fff';ctx.lineWidth=4;ctx.shadowBlur=20;ctx.shadowColor='#aaf';
            var lx=sx,ly=0;
            ctx.beginPath();ctx.moveTo(lx,ly);
            for(var k=0;k<8;k++){lx+=r(-12,12);ly+=sy/8;ctx.lineTo(lx,ly);}
            ctx.stroke();
            ctx.shadowBlur=0;ctx.globalAlpha=1;
        }
    }
}
function drawWeatherOverlay(){
    if(theme.weather==='dust'){
        ctx.fillStyle='rgba(204,170,136,0.15)';
        ctx.fillRect(0,0,canvas.width,canvas.height);
    }
}

function getSyntheticGhost(){return null;}

function spawnP(x,y,c,n){n=Math.floor((n||8)*partMult);for(var i=0;i<n;i++)particles.push({x:x,y:y,vx:r(-3,3),vy:r(-3,3),life:1,decay:r(0.02,0.05),color:c,size:r(2,5),type:'dot'});}
function spawnJumpFx(x,y,n){var jc=equippedCosmetics.jump;n=Math.floor((n||8)*partMult);
if(jc==='jump_lightning'){
// Lightning bolts: jagged streaks downward + bright flash
for(var lb=0;lb<4;lb++){var bx=x+r(-12,12),by=y;for(var seg=0;seg<5;seg++){bx+=r(-4,4);by+=r(4,8);particles.push({x:bx,y:by,vx:r(-0.3,0.3),vy:r(1,3),life:0.5,decay:0.06,color:Math.random()>0.5?'#fff':'#4af',size:r(2,3),type:'pixel'});}}
for(var i=0;i<n;i++){var ang=r(Math.PI*0.7,Math.PI*1.3);particles.push({x:x,y:y,vx:Math.cos(ang)*r(3,6),vy:Math.sin(ang)*r(2,4)+r(0,2),life:1,decay:0.05,color:'#4af',size:r(2,4),type:'dot'});}
// Bright flash ring
particles.push({x:x,y:y,vx:0,vy:0,life:0.4,decay:0.05,color:'#fff',type:'ring',size:5,grow:6});
}else if(jc==='jump_sparks'){
// Electric sparks burst with bright outward arcs
for(var i=0;i<n+8;i++){var ang2=r(Math.PI*0.5,Math.PI*1.5);particles.push({x:x,y:y,vx:Math.cos(ang2)*r(4,9),vy:Math.sin(ang2)*r(3,6),life:1,decay:r(0.04,0.08),color:Math.random()>0.6?'#fff':(Math.random()>0.5?'#ff0':'#ff8'),size:r(1,3),type:'dot'});}
// Quick bright flash ring
particles.push({x:x,y:y,vx:0,vy:0,life:0.5,decay:0.05,color:'#ff8',type:'ring',size:3,grow:5});
}else{
for(var i=0;i<n;i++)particles.push({x:x,y:y,vx:r(-3,3),vy:r(-3,3),life:1,decay:r(0.02,0.05),color:theme.part,size:r(2,5),type:'dot'});
}}
function addFloat(x,y,text,color){floatTexts.push({x:x,y:y,text:text,color:color,life:1});}

function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    updateAtmos();
    updateLightning();
    var g=ctx.createLinearGradient(0,0,0,canvas.height);g.addColorStop(0,adjustedSky(theme.skyT));g.addColorStop(.5,adjustedSky(theme.skyM));g.addColorStop(1,adjustedSky(theme.skyB));
    ctx.fillStyle=g;ctx.fillRect(0,0,canvas.width,canvas.height);
    drawAtmos();

    ctx.save();
    var pFactors = [0.1, 0.25, 0.45]; 
    for(var i=0;i<bgShapes.length;i++){
        var s=bgShapes[i], sx=((s.x - camX * pFactors[s.layer]) % 4000 + 4000) % 4000 - 500;
        var pScale=0.6+s.layer*0.25;
        if(sx>canvas.width+200)continue;
        ctx.globalAlpha=s.a;ctx.fillStyle=s.c;
        if(s.t==='rect'){ctx.fillRect(sx,canvas.height-s.h*pScale-s.y,s.w*pScale,s.h*pScale);}
        else if(s.t==='tri'){ctx.beginPath();ctx.moveTo(sx,canvas.height-s.y);ctx.lineTo(sx-s.s*pScale/2,canvas.height-s.y-s.s*pScale);ctx.lineTo(sx+s.s*pScale/2,canvas.height-s.y-s.s*pScale);ctx.closePath();ctx.fill();}
        else if(s.t==='wave'){ctx.beginPath();ctx.moveTo(sx,canvas.height-s.y);ctx.quadraticCurveTo(sx+s.w*pScale/2,canvas.height-s.y-s.h*pScale,sx+s.w*pScale,canvas.height-s.y);ctx.lineTo(sx+s.w*pScale,canvas.height);ctx.lineTo(sx,canvas.height);ctx.fill();}
    }
    ctx.restore();

    var bgT=theme.bg;
    var starThemes={city:1,mirror:1,spire:1,star:1,void:1,obsidian:1,ghost:1,aurora:1,terminal:1};
    var starVis = starThemes[bgT] ? (1 - dayFactor()) : 0;
    if(starVis > 0.05){
        ctx.fillStyle='#fff';
        for(var i=0;i<stars.length;i++){
            var s=stars[i],sx=(s.x-camX*s.sp*.3)%(canvas.width+200),dx=sx<-50?sx+canvas.width+200:sx;
            ctx.globalAlpha=s.a*starVis*(theme.weather==='storm'?.3:1);ctx.beginPath();ctx.arc(dx,s.y-camY*.05,s.s,0,Math.PI*2);ctx.fill();
        }
        ctx.globalAlpha=1;
    }

    ctx.strokeStyle=theme.grid;ctx.lineWidth=1;ctx.globalAlpha=.08;
    var go=-(camX*.5)%60;
    for(var gx=go;gx<canvas.width;gx+=60){ctx.beginPath();ctx.moveTo(gx,0);ctx.lineTo(gx,canvas.height);ctx.stroke();}
    for(var gy=0;gy<canvas.height;gy+=60){ctx.beginPath();ctx.moveTo(0,gy);ctx.lineTo(canvas.width,gy);ctx.stroke();}
    ctx.globalAlpha=1;

    for(var i=0;i<platforms.length;i++)drawPlat(platforms[i]);
    drawLightning();
    for(var i=0;i<ziplines.length;i++){
        var z=ziplines[i],zx=z.x-camX,zy=z.y-camY;
        if(zx+z.len<-50||zx>canvas.width+50)continue;
        ctx.strokeStyle=theme.acc;ctx.lineWidth=2;ctx.globalAlpha=0.6;
        ctx.beginPath();ctx.moveTo(zx,zy);ctx.lineTo(zx+z.len,zy);ctx.stroke();
        ctx.beginPath();ctx.moveTo(zx,zy-6);ctx.lineTo(zx,zy+6);ctx.stroke();
        ctx.beginPath();ctx.moveTo(zx+z.len,zy-6);ctx.lineTo(zx+z.len,zy+6);ctx.stroke();
        ctx.globalAlpha=1;
        var dotPos=(Date.now()*.002)%1;
        ctx.fillStyle=theme.acc;ctx.beginPath();ctx.arc(zx+z.len*dotPos,zy,3,0,Math.PI*2);ctx.fill();
    }
    for(var i=0;i<spikes.length;i++)drawSpike(spikes[i]);

    var nextOffscreen=null;
    for(var i=0;i<platforms.length;i++){
        if(platforms[i].x>camX+canvas.width+20){nextOffscreen=platforms[i];break;}
    }
    if(nextOffscreen){
        var iy=Math.max(20,Math.min(nextOffscreen.y-camY,canvas.height-20));
        ctx.fillStyle=theme.acc;ctx.globalAlpha=0.5;
        ctx.beginPath();ctx.moveTo(canvas.width-8,iy-8);ctx.lineTo(canvas.width,iy);ctx.lineTo(canvas.width-8,iy+8);ctx.fill();
        ctx.globalAlpha=1;
    }

    for(var i=0;i<lasers.length;i++){
        var l=lasers[i];
        var sx = l.x - camX, sy = l.y - camY;
        if(sx < -50 || sx > canvas.width+50) continue;
        
        ctx.fillStyle = theme.build;
        ctx.fillRect(sx-8, sy-5, 16, 5);
        ctx.fillRect(sx-8, sy+l.h, 16, 5);
        
        if(l.active) {
            ctx.shadowBlur=15; ctx.shadowColor='#f00'; ctx.fillStyle='#f00';
            ctx.fillRect(sx-3, sy, 6, l.h);
            ctx.fillStyle='#fff'; ctx.fillRect(sx-1, sy, 2, l.h);
            ctx.shadowBlur=0;
        } else if (l.phaseRatio > 0.8) {
            ctx.fillStyle='rgba(255,50,50,0.4)';
            ctx.fillRect(sx-1, sy, 2, l.h);
        }
    }

    for(var i=0;i<chips.length;i++){
        var c=chips[i];
        if(c.col) continue;
        var sx = c.x - camX, sy = c.y - camY + Math.sin(Date.now()*.005 + c.x)*5;
        if(sx < -50 || sx > canvas.width+50) continue;
        
        if(c.kind==='master'){
            // Champion master gem — rainbow pulsing star
            var hue=(Date.now()*0.2+c.x)%360;
            var rcol='hsl('+hue+',100%,60%)';
            ctx.save();ctx.translate(sx,sy);ctx.rotate(Date.now()*.003);
            ctx.shadowBlur=20;ctx.shadowColor=rcol;
            ctx.fillStyle=rcol;
            // Draw 5-pointed star
            ctx.beginPath();
            for(var st=0;st<10;st++){var sa=st/10*Math.PI*2-Math.PI/2;var sr=st%2===0?10:4;ctx.lineTo(Math.cos(sa)*sr,Math.sin(sa)*sr);}
            ctx.closePath();ctx.fill();
            // Inner sparkle
            ctx.fillStyle='#fff';
            ctx.beginPath();ctx.arc(0,0,2.5,0,Math.PI*2);ctx.fill();
            ctx.restore();ctx.shadowBlur=0;
            // Sparkle particles trailing
            if(frameCount%4===0){particles.push({x:c.x+r(-8,8),y:c.y+r(-8,8),vx:r(-0.4,0.4),vy:-r(0.5,1.2),life:1,decay:0.04,color:rcol,size:r(2,3),type:'dot'});}
            continue;
        }
        if(c.kind==='daily'){
            // Daily master chip — diamond shape, gold or cyan based on champion status
            var dailyCol=championStatus.unlocked?'#ffd700':'#0ff';
            var dailyGlow=championStatus.unlocked?'#ff8c00':'#08f';
            ctx.save();ctx.translate(sx,sy);ctx.rotate(Date.now()*.0025);
            ctx.shadowBlur=18;ctx.shadowColor=dailyGlow;
            ctx.fillStyle=dailyCol;
            // Bigger gem shape
            ctx.beginPath();ctx.moveTo(0,-10);ctx.lineTo(8,0);ctx.lineTo(0,10);ctx.lineTo(-8,0);ctx.closePath();ctx.fill();
            // Inner highlight
            ctx.fillStyle='#fff';ctx.beginPath();ctx.moveTo(0,-5);ctx.lineTo(4,0);ctx.lineTo(0,5);ctx.lineTo(-4,0);ctx.closePath();ctx.fill();
            ctx.restore();ctx.shadowBlur=0;
            // "DAILY" label hover
            ctx.fillStyle=dailyCol;ctx.font='bold 8px monospace';ctx.textAlign='center';
            ctx.fillText('DAILY',sx,sy-16);
            continue;
        }
        var cArr = bestChips[curLvl] || [];
        var isGold = !c.isArc && c.goldIdx!=null && !cArr[c.goldIdx];
        var colBase = isGold ? '#ffd700' : '#e0e0e0';
        var colGlow = isGold ? '#ff8c00' : '#ffffff';
        
        ctx.save(); ctx.translate(sx, sy); ctx.rotate(Date.now()*.002);
        ctx.shadowBlur=12; ctx.shadowColor=colGlow; ctx.fillStyle=colBase;
        ctx.beginPath(); ctx.moveTo(0,-8); ctx.lineTo(6,0); ctx.lineTo(0,8); ctx.lineTo(-6,0); ctx.fill();
        ctx.fillStyle='#fff'; ctx.beginPath(); ctx.moveTo(0,-4); ctx.lineTo(3,0); ctx.lineTo(0,4); ctx.lineTo(-3,0); ctx.fill();
        ctx.restore(); ctx.shadowBlur=0;
    }

    if(!replayMode&&ghostsEnabled&&hasSkill('ghost')&&ghostVisible&&currentGhost&&!player.dead){
        // ghostIdx based on elapsed time so toggle on/off keeps correct sync; freeze during pause
        var gIdx=Math.floor(((isPaused?pauseTime:Date.now())-startTime)/83.33);
        if(gIdx<currentGhost.length){
            var gp=currentGhost[gIdx];
            if(gp.tp){
                // Teleport effect at ghost position
                var tCx=gp.x-camX+11, tCy=gp.y-camY+24;
                ctx.globalAlpha=0.6;ctx.shadowBlur=15;ctx.shadowColor='#0f8';
                for(var ti=0;ti<8;ti++){
                    var tang=ti/8*Math.PI*2+Date.now()*0.005;
                    ctx.fillStyle='#0f8';
                    ctx.beginPath();ctx.arc(tCx+Math.cos(tang)*15,tCy+Math.sin(tang)*15,2,0,Math.PI*2);ctx.fill();
                }
                ctx.shadowBlur=0;ctx.globalAlpha=1;
            }
            drawGhostSprite(gp.x,gp.y,gp.f||1,gp.og,gp.ph,!!gp.dj);
        }
    }
    if(!player.dead) {
        var ec=equippedCosmetics.trail;
        var hasTrailCos=ec==='trail_cyan'||ec==='trail_fire'||ec==='trail_ice'||ec==='trail_rainbow'||ec==='trail_glitch';
        if(hasTrailCos){
            for(var i=0; i<pTrail.length; i++) {
                var tr = pTrail[i];
                var dotColor;
                var ageIdx=pTrail.length-i;
                if(ec==='trail_cyan')dotColor='#0ff';
                else if(ec==='trail_fire')dotColor='#f80';
                else if(ec==='trail_ice')dotColor='#8ef';
                else if(ec==='trail_rainbow')dotColor='hsl('+(((Date.now()*0.1)+ageIdx*30)%360)+',100%,60%)';
                else if(ec==='trail_glitch')dotColor=Math.random()>0.5?'#0f0':'#f0f';
                ctx.globalAlpha = 0.3 + (i+1) * 0.12;
                ctx.shadowBlur=15;ctx.shadowColor=dotColor;
                ctx.fillStyle=dotColor;
                ctx.beginPath();ctx.arc(tr.x-camX+11,tr.y-camY+24,8-(pTrail.length-i)*0.4,0,Math.PI*2);ctx.fill();
                ctx.shadowBlur=0;
            }
        }
        ctx.globalAlpha = 1;
        drawPlayerSprite(player.x, player.y, player.face, player.at, player.djU, true, player.og);
        // Shield visual: only when absorbing a hit (during invuln period)
        if(shieldInvuln>0){
            var shCx=player.x-camX+player.w/2, shCy=player.y-camY+player.h/2;
            var shFade=shieldInvuln/60;
            var shR=player.w*0.85;
            // Dashed cyan ring
            ctx.strokeStyle='rgba(0,255,255,'+(shFade*0.7)+')';
            ctx.lineWidth=2;ctx.shadowBlur=8;ctx.shadowColor='#0ff';
            ctx.setLineDash([6,4]);
            ctx.beginPath();ctx.arc(shCx,shCy,shR,0,Math.PI*2);ctx.stroke();
            ctx.setLineDash([]);
            ctx.shadowBlur=0;
            // 6 hexagonal sparkle dots orbiting
            ctx.fillStyle='rgba(170,255,255,'+(shFade*0.8)+')';
            for(var hi=0;hi<6;hi++){
                var hAng=hi/6*Math.PI*2 + Date.now()*0.003;
                ctx.beginPath();
                ctx.arc(shCx+Math.cos(hAng)*shR,shCy+Math.sin(hAng)*shR,3,0,Math.PI*2);
                ctx.fill();
            }
        }
    }

    if(Math.abs(player.vx)>6){
        ctx.globalAlpha=Math.min((Math.abs(player.vx)-6)*0.1,0.4);
        ctx.strokeStyle=theme.acc;ctx.lineWidth=1.5;
        for(var sl=0;sl<4;sl++){
            var sy=player.y-camY+r(0,player.h);
            var sx=player.x-camX+(player.face<0?player.w+5:-5);
            ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(sx-player.face*r(20,50),sy);ctx.stroke();
        }
        ctx.globalAlpha=1;
    }

    for(var i=0;i<particles.length;i++){
        var pt=particles[i];
        ctx.globalAlpha=Math.max(0, pt.life);
        if(pt.type === 'glass') {
            ctx.save(); ctx.translate(pt.x-camX, pt.y-camY); ctx.rotate(pt.rot);
            ctx.fillStyle=pt.color;
            ctx.beginPath();
            ctx.moveTo(-pt.size/2, -pt.size/2);
            ctx.lineTo(pt.size/2, 0);
            ctx.lineTo(-pt.size/2, pt.size/2);
            ctx.fill();
            ctx.restore();
        } else if(pt.type === 'pixel') {
            ctx.fillStyle=pt.color;
            ctx.fillRect(pt.x-camX-pt.size/2,pt.y-camY-pt.size/2,pt.size,pt.size);
        } else if(pt.type === 'dissolve') {
            ctx.shadowBlur=8;ctx.shadowColor=pt.color;
            ctx.fillStyle=pt.color;
            ctx.beginPath();ctx.arc(pt.x-camX,pt.y-camY,pt.size*pt.life,0,Math.PI*2);ctx.fill();
            ctx.shadowBlur=0;
        } else if (pt.type === 'ring') {
            pt.size += pt.grow;
            ctx.shadowBlur=15; ctx.shadowColor=pt.color;
            ctx.strokeStyle = pt.color; ctx.lineWidth = 4 * pt.life;
            ctx.beginPath(); ctx.arc(pt.x-camX, pt.y-camY, pt.size, 0, Math.PI*2); ctx.stroke();
            ctx.shadowBlur=0;
        } else {
            ctx.fillStyle=pt.color;
            ctx.beginPath();ctx.arc(pt.x-camX,pt.y-camY,pt.size*pt.life,0,Math.PI*2);ctx.fill();
        }
    }
    ctx.globalAlpha=1;

    for(var fi=floatTexts.length-1;fi>=0;fi--){
        var ft=floatTexts[fi];
        ft.y-=1.5*dt;ft.life-=0.025*dt;
        if(ft.life<=0){floatTexts.splice(fi,1);continue;}
        ctx.globalAlpha=ft.life;ctx.fillStyle=ft.color;ctx.font='bold 14px monospace';ctx.textAlign='center';
        ctx.fillText(ft.text,ft.x-camX,ft.y-camY);ctx.globalAlpha=1;
    }

    if(deathFlash > 0) {
        ctx.fillStyle = 'rgba(255, 0, 85, ' + deathFlash + ')';
        ctx.fillRect(0,0,canvas.width,canvas.height);
        deathFlash -= 0.04*dt;
    }
    if(resurrectFlash > 0) {
        var rfg=ctx.createRadialGradient(canvas.width/2,canvas.height/2,0,canvas.width/2,canvas.height/2,canvas.width*0.8);
        rfg.addColorStop(0,'rgba(0,255,136,'+(resurrectFlash*0.8)+')');
        rfg.addColorStop(0.5,'rgba(0,255,200,'+(resurrectFlash*0.3)+')');
        rfg.addColorStop(1,'rgba(0,255,136,0)');
        ctx.fillStyle=rfg;ctx.fillRect(0,0,canvas.width,canvas.height);
        resurrectFlash -= 0.03*dt;
    }
    if(gemFlash>0){
        var gfg=ctx.createRadialGradient(canvas.width/2,canvas.height/2,0,canvas.width/2,canvas.height/2,canvas.width*0.7);
        gfg.addColorStop(0,'rgba(255,255,255,0)');gfg.addColorStop(1,'rgba(255,255,255,'+gemFlash+')');
        ctx.fillStyle=gfg;ctx.fillRect(0,0,canvas.width,canvas.height);
        gemFlash-=0.03*dt;
    }
    drawWeatherOverlay();
}

function drawPlat(p){
    var sx=p.x-camX,sy=p.y-camY;
    if(sx+p.w<-50||sx>canvas.width+50)return;
    // Pulse platforms: skip if invisible
    if(p.pulse&&p.pulseInvis)return;
    if(p.pulse){
        // Distinct purple-themed pulse platform with dashed animated outline
        var pAlpha=p.pulseWarn?(0.5+Math.abs(Math.sin(Date.now()*0.025))*0.5):(0.85+Math.sin(Date.now()*0.005+p.x)*0.10);
        var pCol=p.pulseWarn?'#f0a':'#c0f';
        ctx.save();
        ctx.globalAlpha=pAlpha;
        // Solid purple gradient fill — strong enough to look landable
        var pg=ctx.createLinearGradient(sx,sy,sx,sy+p.h);
        pg.addColorStop(0,p.pulseWarn?'rgba(255,0,170,0.55)':'rgba(170,30,255,0.50)');
        pg.addColorStop(1,p.pulseWarn?'rgba(255,0,170,0.20)':'rgba(80,0,170,0.18)');
        ctx.fillStyle=pg;ctx.fillRect(sx,sy,p.w,p.h);
        // Animated dashed outline
        var dashOff=(Date.now()*0.01)%10;
        ctx.strokeStyle=pCol;ctx.lineWidth=2;
        ctx.setLineDash([5,3]);ctx.lineDashOffset=-dashOff;
        ctx.strokeRect(sx,sy,p.w,p.h);
        ctx.setLineDash([]);ctx.lineDashOffset=0;
        // Bright top edge accent (solid)
        ctx.strokeStyle=pCol;ctx.lineWidth=3;
        ctx.shadowBlur=p.pulseWarn?14:8;ctx.shadowColor=pCol;
        ctx.beginPath();ctx.moveTo(sx+3,sy);ctx.lineTo(sx+p.w-3,sy);ctx.stroke();
        ctx.shadowBlur=0;
        // Floating dots inside platform — brighter
        var dotCount=Math.max(2,Math.floor(p.w/24));
        for(var pdi=0;pdi<dotCount;pdi++){
            var dx=sx+8+(pdi*(p.w-16)/(dotCount-1||1));
            var dy=sy+p.h/2+Math.sin(Date.now()*0.004+pdi*1.7)*3;
            ctx.fillStyle='#fff';
            ctx.beginPath();ctx.arc(dx,dy,2,0,Math.PI*2);ctx.fill();
        }
        // Indicator above platform
        ctx.fillStyle=pCol;
        ctx.font='bold 10px monospace';ctx.textAlign='center';
        ctx.shadowBlur=10;ctx.shadowColor=pCol;
        ctx.fillText(p.pulseWarn?'\u26a0':'\u2735',sx+p.w/2,sy-4);
        ctx.shadowBlur=0;
        ctx.restore();
        return;
    }
    if(equippedCosmetics.platform==='plat_holo'&&p.t!=='f'&&p.t!=='b'){
        var hFlicker=0.5+Math.sin(Date.now()*0.01+p.x)*0.3;
        ctx.globalAlpha=hFlicker;
        ctx.fillStyle='rgba(0,255,255,0.1)';ctx.fillRect(sx,sy,p.w,p.h);
        ctx.strokeStyle='#0ff';ctx.lineWidth=1;ctx.setLineDash([4,4]);
        ctx.strokeRect(sx,sy,p.w,p.h);ctx.setLineDash([]);
        ctx.strokeStyle='#0ff';ctx.lineWidth=2;
        ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(sx+p.w,sy);ctx.stroke();
        ctx.globalAlpha=1;
        return;
    }
    if(p.t==='b'){
        var bPulse=1+Math.sin(Date.now()*.008)*.15;
        ctx.fillStyle='rgba(255,136,0,0.2)';ctx.fillRect(sx,sy,p.w,p.h);
        ctx.strokeStyle='#f80';ctx.lineWidth=2*bPulse;
        ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(sx+p.w,sy);ctx.stroke();
        // Spring-coil zigzag pattern on top (resembles bouncy compressed spring)
        var coilStart=sx+p.w*0.2, coilEnd=sx+p.w*0.8, coilCount=4;
        var coilStep=(coilEnd-coilStart)/coilCount;
        var coilY1=sy-3-bPulse*1, coilY2=sy-9-bPulse*2;
        ctx.strokeStyle='#fa3';ctx.lineWidth=1.6;ctx.lineCap='round';ctx.lineJoin='round';
        ctx.beginPath();
        ctx.moveTo(coilStart,coilY1);
        for(var bi=0;bi<coilCount;bi++){
            ctx.lineTo(coilStart+coilStep*bi+coilStep*0.5,coilY2);
            ctx.lineTo(coilStart+coilStep*(bi+1),coilY1);
        }
        ctx.stroke();
        return;
    }
    if(p.t==='f'){
        ctx.shadowBlur=20;ctx.shadowColor=theme.acc;ctx.fillStyle='rgba(0,255,136,.3)';ctx.fillRect(sx,sy,p.w,p.h);
        ctx.strokeStyle=theme.acc;ctx.lineWidth=3;ctx.strokeRect(sx,sy,p.w,p.h);ctx.shadowBlur=0;
        ctx.fillStyle=theme.acc;ctx.font='bold 16px monospace';ctx.textAlign='center';ctx.fillText('SECTOR END',sx+p.w/2,sy-10);
        return;
    }
    var gr=ctx.createLinearGradient(sx,sy,sx,sy+p.h);gr.addColorStop(0,'rgba(0,229,255,.15)');gr.addColorStop(1,'rgba(0,100,200,.3)');
    ctx.fillStyle=gr;ctx.fillRect(sx,sy,p.w,p.h);
    ctx.strokeStyle='rgba(0,229,255,.5)';ctx.lineWidth=1.5;ctx.strokeRect(sx,sy,p.w,p.h);
    if(p.t==='m'){
        ctx.strokeStyle=theme.acc;ctx.lineWidth=2;ctx.setLineDash([4,4]);ctx.strokeRect(sx,sy,p.w,p.h);ctx.setLineDash([]);
        var dir=Math.cos(Date.now()*.001*p.sp+p.phase);
        ctx.fillStyle=theme.acc;ctx.beginPath();ctx.moveTo(sx+p.w/2+dir*10,sy-8);ctx.lineTo(sx+p.w/2+dir*10-3*dir,sy-12);ctx.lineTo(sx+p.w/2+dir*10-3*dir,sy-4);ctx.fill();
    }
    ctx.strokeStyle='rgba(0,229,255,.8)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(sx+p.w,sy);ctx.stroke();
    var pdx=player.x+player.w/2-(p.x+p.w/2),pdy=player.y+player.h-p.y;
    var pd=Math.sqrt(pdx*pdx+pdy*pdy);
    if(pd<120){
        ctx.shadowBlur=(1-pd/120)*15;ctx.shadowColor=theme.acc;
        ctx.strokeStyle=theme.acc;ctx.lineWidth=2;ctx.globalAlpha=(1-pd/120)*0.6;
        ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(sx+p.w,sy);ctx.stroke();
        ctx.shadowBlur=0;ctx.globalAlpha=1;
    }
}

function drawSpike(s){
    var sx=s.x-camX,sy=s.y-camY;
    if(sx+s.w<-50||sx>canvas.width+50)return;
    var pulse=1+Math.sin(Date.now()*.005)*.3;
    ctx.shadowBlur=12*pulse;ctx.shadowColor='#f05';ctx.fillStyle='#f05';
    ctx.beginPath();ctx.moveTo(sx,sy+s.h);ctx.lineTo(sx+s.w/2,sy);ctx.lineTo(sx+s.w,sy+s.h);ctx.closePath();ctx.fill();
    ctx.shadowBlur=0;
    ctx.fillStyle='rgba(255,150,150,.5)';ctx.beginPath();ctx.moveTo(sx+s.w*.3,sy+s.h*.6);ctx.lineTo(sx+s.w/2,sy+s.h*.2);ctx.lineTo(sx+s.w*.7,sy+s.h*.6);ctx.closePath();ctx.fill();
}

function drawGhostSprite(gx, gy, gf, gOg, gPhase, gDjU) {
    var w=22, h=48;
    var cx=gx-camX+w/2, y=gy-camY;
    var hr=h*.15, bl=h*.35, ul=h*.16, lowl=h*.18;
    ctx.save();
    ctx.translate(cx, y+h/2);
    ctx.scale(gf||1, 1);
    if(gDjU){ctx.rotate((gPhase!==undefined?gPhase:Date.now()*0.01)*0.4);}
    ctx.translate(-cx, -(y+h/2));
    ctx.globalAlpha=0.35;
    ctx.shadowBlur=10;ctx.shadowColor='#fff';
    ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.lineCap='round';ctx.lineJoin='round';
    ctx.beginPath();ctx.arc(cx,y+hr+2,hr,0,Math.PI*2);ctx.stroke();
    var ny=y+hr*2+2,hy=ny+bl;
    if(gDjU)hy-=4;
    ctx.beginPath();ctx.moveTo(cx,ny);ctx.lineTo(cx,hy);ctx.stroke();
    function gl(sx,sy,a1,a2){var mx=sx+ul*Math.sin(a1),my=sy+ul*Math.cos(a1);var ex=mx+lowl*Math.sin(a2),ey=my+lowl*Math.cos(a2);ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(mx,my);ctx.lineTo(ex,ey);ctx.stroke();}
    if(gDjU){
        // Double-jump tucked pose (matches drawPlayerSprite)
        gl(cx,hy,1.2,0);
        gl(cx,hy,0.8,-0.5);
        gl(cx,ny+bl*.15,1.0,2.0);
        gl(cx,ny+bl*.15,0.8,1.8);
    }else if(gOg===false){
        // In-air pose: legs back, arms up
        gl(cx,hy,0.6,1.0);
        gl(cx,hy,-0.4,-0.2);
        gl(cx,ny+bl*.15,1.0,1.5);
        gl(cx,ny+bl*.15,-0.6,-1.0);
    }else{
        // Running pose: cycle legs/arms
        var cyc=(gPhase!==undefined?gPhase:Date.now()*0.01);
        var tF1=Math.sin(cyc)*1.0, tF2=tF1+(Math.cos(cyc)>0?-1.2:-0.2);
        var tB1=Math.sin(cyc+Math.PI)*1.0, tB2=tB1+(Math.cos(cyc+Math.PI)>0?-1.2:-0.2);
        var aF1=Math.sin(cyc+Math.PI)*0.9, aF2=aF1+1.0;
        var aB1=Math.sin(cyc)*0.9, aB2=aB1+1.0;
        gl(cx,hy,tB1,tB2);
        gl(cx,hy,tF1,tF2);
        gl(cx,ny+bl*.15,aB1,aB2);
        gl(cx,ny+bl*.15,aF1,aF2);
    }
    ctx.restore();
    ctx.shadowBlur=0;
    ctx.globalAlpha=1;
}

function drawPlayerSprite(px, py, pFace, pAt, pDjU, isMainPlayer, isOg) {
    var w=player.w, h=player.h;
    var cx=px-camX+w/2, y=py-camY;
    var hr=h*.15, bl=h*.35; 
    var ul=h*.16, lowl=h*.18;

    var idleBob = 0;
    if(isOg && Math.abs(player.vx) < 0.3) {
        idleBob = Math.sin(Date.now()*.004) * 1.5;
    }

    ctx.save();
    ctx.translate(cx,y+h/2);
    ctx.scale(pFace,1);
    if(isMainPlayer) ctx.scale(1+(1-player.squash)*0.3,player.squash);

    if (pDjU) {
        ctx.rotate(pAt * 0.4);
        idleBob = 5; 
    }

    ctx.translate(-cx,-(y+h/2));
    ctx.shadowBlur=10; var glowCos=equippedCosmetics.glow;
    var champPulse=glowCos==='glow_champion'?(Math.sin(Date.now()/180)*0.4+0.8):1;
    var bodyCos=equippedCosmetics.body;
    var pGlow=glowCos==='glow_champion'?'#ffd700':glowCos==='glow_gold'?'#ffd700':glowCos==='glow_pink'?'#f0a':glowCos==='glow_rainbow'?'hsl('+((Date.now()*0.09)%360)+',100%,60%)':theme.acc;
    // If black body equipped without a glow cosmetic, suppress the default theme glow halo
    if(bodyCos==='body_black' && !glowCos){pGlow='#000'; ctx.shadowBlur=0;}
    else if(glowCos==='glow_champion')ctx.shadowBlur=22*champPulse;
    ctx.shadowColor=pGlow;
    if(glowCos==='glow_champion'&&!player.dead&&frameCount%3===0&&partMult>0.1){
        particles.push({x:player.x+r(0,player.w),y:player.y+player.h,vx:r(-0.3,0.3),vy:-r(1.2,2.8),life:1,decay:0.04,color:Math.random()<0.5?'#ffd700':'#fff8a0',size:r(2,4),type:'dot'});
    }
    var bodyCol=bodyCos==='body_gold'?'#ffd700':bodyCos==='body_pink'?'#f0a':bodyCos==='body_black'?'#222':bodyCos==='body_rainbow'?'hsl('+((Date.now()*0.1)%360)+',100%,60%)':'#0ff';
    ctx.strokeStyle=bodyCol; 
    ctx.lineWidth=2.5; ctx.lineCap='round'; ctx.lineJoin='round';

    ctx.beginPath();ctx.arc(cx,y+hr+2+idleBob,hr,0,Math.PI*2);ctx.stroke();
    if(isMainPlayer) {
        ctx.fillStyle=bodyCol;ctx.fillRect(cx+hr*.1,y+hr*.7+idleBob,hr*.8,hr*.25);
        // Hat
        var hatCos=equippedCosmetics.hat;
        var headY=y+hr+2+idleBob;
        if(hatCos==='hat_tophat'){ctx.fillStyle='#222';ctx.fillRect(cx-hr*.6,headY-hr*1.8,hr*1.2,hr*.8);ctx.fillRect(cx-hr*.9,headY-hr*1.05,hr*1.8,hr*.3);}
        else if(hatCos==='hat_horns'){ctx.strokeStyle='#f00';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(cx-hr*.6,headY-hr*.5);ctx.lineTo(cx-hr*.9,headY-hr*1.6);ctx.stroke();ctx.beginPath();ctx.moveTo(cx+hr*.6,headY-hr*.5);ctx.lineTo(cx+hr*.9,headY-hr*1.6);ctx.stroke();ctx.strokeStyle=bodyCol;}
        else if(hatCos==='hat_catears'){ctx.fillStyle=bodyCol;ctx.beginPath();ctx.moveTo(cx-hr*.7,headY-hr*.3);ctx.lineTo(cx-hr*.4,headY-hr*1.4);ctx.lineTo(cx-hr*.1,headY-hr*.3);ctx.fill();ctx.beginPath();ctx.moveTo(cx+hr*.1,headY-hr*.3);ctx.lineTo(cx+hr*.4,headY-hr*1.4);ctx.lineTo(cx+hr*.7,headY-hr*.3);ctx.fill();}
        else if(hatCos==='hat_crown'){ctx.fillStyle='#ffd700';ctx.beginPath();ctx.moveTo(cx-hr*.7,headY-hr*.6);ctx.lineTo(cx-hr*.7,headY-hr*1.4);ctx.lineTo(cx-hr*.3,headY-hr*1.0);ctx.lineTo(cx,headY-hr*1.5);ctx.lineTo(cx+hr*.3,headY-hr*1.0);ctx.lineTo(cx+hr*.7,headY-hr*1.4);ctx.lineTo(cx+hr*.7,headY-hr*.6);ctx.fill();}
        else if(hatCos==='hat_halo'){ctx.strokeStyle='#ffd700';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(cx,headY-hr*1.4,hr*.8,hr*.3,0,0,Math.PI*2);ctx.stroke();ctx.strokeStyle=bodyCol;}
        else if(hatCos==='hat_antenna'){ctx.strokeStyle='#888';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(cx,headY-hr);ctx.lineTo(cx,headY-hr*2.2);ctx.stroke();ctx.fillStyle='#0f0';ctx.beginPath();ctx.arc(cx,headY-hr*2.2,3,0,Math.PI*2);ctx.fill();ctx.strokeStyle=bodyCol;}
    }

    var ny=y+hr*2+2+idleBob, hy=ny+bl;
    if(pDjU) hy -= 4; 
    ctx.beginPath();ctx.moveTo(cx,ny);ctx.lineTo(cx,hy);ctx.stroke();

    var tF1=0, tF2=0, tB1=0, tB2=0; 
    var aF1=0, aF2=0, aB1=0, aB2=0; 

    if(pDjU) { 
        tF1 = 1.2; tF2 = 0;
        tB1 = 0.8; tB2 = -0.5;
        aF1 = 1.0; aF2 = 2.0;
        aB1 = 0.8; aB2 = 1.8;
    } else if(!isOg) { 
        tF1 = 1.0; tF2 = 0.2; 
        tB1 = -0.5; tB2 = -1.5; 
        aF1 = 2.5; aF2 = 2.5; 
        aB1 = -1.0; aB2 = -0.5; 
    } else if(Math.abs(player.vx) > 0.3) { 
        var cycle = pAt * 0.4;
        tF1 = Math.sin(cycle) * 1.1;
        var tF_vel = Math.cos(cycle); 
        tF2 = tF1 + (tF_vel > 0 ? -1.5 : -0.2); 
        
        tB1 = Math.sin(cycle + Math.PI) * 1.1;
        var tB_vel = Math.cos(cycle + Math.PI);
        tB2 = tB1 + (tB_vel > 0 ? -1.5 : -0.2);

        aF1 = Math.sin(cycle + Math.PI) * 1.0;
        aF2 = aF1 + 1.2;
        
        aB1 = Math.sin(cycle) * 1.0;
        aB2 = aB1 + 1.2;
    } else { 
        tF1 = 0.1; tF2 = 0.15;
        tB1 = -0.1; tB2 = -0.05;
        aF1 = 0.2 + Math.sin(Date.now()*.002)*0.1; aF2 = 0.5 + Math.sin(Date.now()*.002)*0.1;
        aB1 = -0.2 - Math.sin(Date.now()*.002)*0.1; aB2 = -0.1 - Math.sin(Date.now()*.002)*0.1;
    }

    function drawLimb(sx, sy, ang1, ang2) {
        var mx = sx + ul * Math.sin(ang1);
        var my = sy + ul * Math.cos(ang1);
        var ex = mx + lowl * Math.sin(ang2);
        var ey = my + lowl * Math.cos(ang2);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(mx, my);
        ctx.lineTo(ex, ey);
        ctx.stroke();
    }

    drawLimb(cx, ny+bl*.15, aB1, aB2); 
    drawLimb(cx, hy, tB1, tB2); 
    // Cape
    if(isMainPlayer&&equippedCosmetics.cape){
        var capeCos=equippedCosmetics.cape;
        var capeCol=capeCos==='cape_white'?'#ddd':capeCos==='cape_red'?'#e22':capeCos==='cape_rainbow'?'hsl('+((Date.now()*0.08)%360)+',100%,60%)':capeCos==='cape_fire'?'#f80':'#aaa';
        var cLen=bl*1.2;
        var tipX=cx+Math.cos(capeAng)*cLen;
        var tipY=ny+2+Math.sin(capeAng)*cLen;
        var midX=cx+(tipX-cx)*0.5+Math.sin(Date.now()*.006)*2;
        var midY=ny+2+(tipY-(ny+2))*0.5;
        ctx.strokeStyle=capeCol;ctx.lineWidth=3;ctx.globalAlpha=0.7;
        ctx.beginPath();ctx.moveTo(cx,ny+2);ctx.quadraticCurveTo(midX,midY,tipX,tipY);ctx.stroke();
        ctx.beginPath();ctx.moveTo(cx,ny+2);ctx.quadraticCurveTo(midX-2,midY+2,tipX-3,tipY-2);ctx.stroke();
        if(capeCos==='cape_fire'){ctx.strokeStyle='#ff0';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(tipX,tipY);ctx.lineTo(tipX+Math.cos(capeAng)*6,tipY+Math.sin(capeAng)*6+Math.sin(Date.now()*.01)*3);ctx.stroke();}
        ctx.globalAlpha=1;ctx.strokeStyle=bodyCol;ctx.lineWidth=2.5;
    }
    drawLimb(cx, hy, tF1, tF2); 
    drawLimb(cx, ny+bl*.15, aF1, aF2); 

    ctx.restore();ctx.shadowBlur=0;
}

function showDie(){
    gameRunning=false; stopMusic();
    if(typeof isDailyStage!=='undefined'&&isDailyStage){
        showDailyDie();
        return;
    }
    $('homeTooltip').classList.remove('active');
    var ov=$('overlay');
    var tip = TIPS[Math.floor(Math.random() * TIPS.length)];
    var st=normalizeLevelStat(levelStats[curLvl]);

    var dieTitle,dieColor;
    if(lastDeathType==='spike'){dieTitle='SPIKED!';dieColor='#f80';}
    else if(lastDeathType==='laser'){dieTitle='LASERED!';dieColor='#f00';}
    else if(lastDeathType==='lightning'){dieTitle='\u26a1 STRUCK!';dieColor='#ff0';}
    else{dieTitle='FALLEN';dieColor='#f05';}
    $('ovTitle').textContent=dieTitle;
    $('ovTitle').style.color=dieColor;

    $('ovMsg').innerHTML=
        '<div style="margin:10px 0; font-size:1.1rem; font-weight:bold; color:#fff;">Sector: ' + LEVELS[curLvl].name + '</div>' +
        '<div style="background:rgba(255,0,85,0.1); border:1px solid rgba(255,0,85,0.3); padding:10px 20px; border-radius:8px; display:inline-block; margin-bottom:15px;">' +
            '<div style="color:#f05; font-weight:bold; font-size:1.1rem; margin-bottom:4px;">Sector Matches: ' + st.attempts + '</div>' +
            '<div style="color:#aaa; font-size:0.75rem;">Total Hazards Hit: ' + (globalData.deadFall + globalData.deadSpike + globalData.deadLaser) + '</div>' +
            (stylePoints>0?'<div style="color:#0ff; font-size:0.85rem; margin-top:4px;">Style: '+stylePoints+'</div>':'') +
            '<div style="color:#ffd700; font-size:0.75rem; margin-top:4px;">Score: '+Math.max(0,Math.floor(player.x/10)+(runGold*50)+(lastRunSilver*10)+(stylePoints*5)-(deaths*10))+'</div>' +
        '</div><br>' +
        '<div style="color:#0ff; font-size:0.85rem; font-style:italic; max-width:280px; margin:0 auto; line-height:1.4;">" ' + tip + ' "</div><br><br>' +
        '<small style="color:#555; font-size:0.75rem; letter-spacing:2px; animation:p 1.5s infinite">' + (autoRetryDelay !== 'none' ? (autoRetryDelay === '0' ? 'AUTO-RETRY' : 'AUTO-RETRY IN ' + autoRetryDelay + 's') : 'TAP ANYWHERE TO RETRY') + '</small>';

    $('ovBtn').style.display='none';
    $('ovBtnExtra').style.display='none';
    $('ovBtnReplay').style.display='none';
    $('ovBtnCancel').style.display='none';
    var canTap = false;
    var retryFired = false;
    function fireRetry(){
        if(retryFired)return;
        retryFired = true;
        ov.onclick = null;
        if(_autoRetryTimer){clearTimeout(_autoRetryTimer);_autoRetryTimer=null;}
        ov.classList.remove('active');
        startGame(curLvl);
    }
    // Tap-to-retry available after a brief 300ms gate (prevents accidental taps from in-game)
    setTimeout(function(){canTap = true;}, 300);
    ov.onclick = function(){if(canTap)fireRetry();};
    if(autoRetryDelay !== 'none'){
        var delayMs = Math.round(parseFloat(autoRetryDelay) * 1000);
        if(_autoRetryTimer)clearTimeout(_autoRetryTimer);
        _autoRetryTimer = setTimeout(fireRetry, Math.max(0, delayMs));
    }
    ov.classList.add('active');
}
var _autoRetryTimer = null;

function showTutorial(){
    var isMobile='ontouchstart' in window||navigator.maxTouchPoints>0;
    $('tutorialControls').textContent=isMobile?'Use the joystick to move, tap ⬆ to jump':'Arrow keys / WASD to move, Space to jump';
    $('tutorial').classList.add('active');
}
function dismissTutorial(){
    save('tutorialDone',true);
    $('tutorial').classList.remove('active');
}

function endGame(){
    $('gameCanvas').classList.remove('active');
    $('gameCanvas').classList.remove('grey');$('gameCanvas').classList.remove('shake');
    $('gameTitleHUD').classList.remove('active');
    $('hudCenter').classList.remove('active');
    $('hudRight').classList.remove('active');
    $('hudLeft').style.display='none';$('freezeBtn').style.display='none';$('ghostBtn').style.display='none';
    $('jZone').classList.remove('active');
    $('jBtn').classList.remove('active');
    $('arrowControls').classList.remove('active');
    $('overlay').classList.remove('active');
    wCtx.clearRect(0,0,wCanvas.width,wCanvas.height);
    if(screen.orientation&&screen.orientation.unlock)try{screen.orientation.unlock();}catch(e){}
    if(document.exitFullscreen)document.exitFullscreen().catch(function(){});
    initLevelSelect();
}

