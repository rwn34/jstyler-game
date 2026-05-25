// === PWA LOGIC (Installable App) ===
let deferredPrompt;
var _isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  var bi=$('btnInstall'); if(bi) bi.style.display='block';
  if(typeof showPwaInstallBanner==='function') showPwaInstallBanner();
});
// iOS: show install button immediately (Safari doesn't support beforeinstallprompt)
if(_isIOS){
  var btn=$('btnInstall');
  if(btn){btn.style.display='block';btn.textContent='📱 ADD TO HOME SCREEN';}
}
function installPWA() {
  if(_isIOS && typeof showIOSInstallHelp==='function'){save('pwaRewardPending',true);showIOSInstallHelp();return;}
  if(deferredPrompt){
    try{
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((c)=>{
        if(c.outcome==='accepted'){claimPwaReward();}
        deferredPrompt=null;
        var bi=$('btnInstall'); if(bi) bi.style.display='none';
        hidePwaBanner();
      }).catch(function(e){
        console.warn('PWA prompt error:',e);
        deferredPrompt=null;
        addFloat(W.innerWidth/2,W.innerHeight/2,'Install failed. Try again.','#f80');
      });
    }catch(e){
      console.warn('PWA prompt exception:',e);
      deferredPrompt=null;
      addFloat(W.innerWidth/2,W.innerHeight/2,'Install not available.','#f80');
    }
  }else if(!_isIOS){
    addFloat(W.innerWidth/2,W.innerHeight/2,'Install not available. Try Chrome/Android.','#f80');
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
    "Visit the Store daily — the free chest gives gold or silver gems every 24 hours!",
    "The shopkeeper has random tips. Open the Store to hear what they say.",
    "Each stage has unique landing effects — fire in Magma, bubbles in Swamp, sparks in Storm.",
    "Toggle the ghost rival on/off with the 👻 button (bottom-left) during gameplay.",
    "Parallax backgrounds change per stage — notice the different shapes and depths!",
    "Daily Stage: A new procedurally-generated stage every day. Same for everyone at your rank!",
    "Streaks: Play any stage for 60+ seconds to keep your daily streak alive.",
    "Streak Freezes protect your streak for one missed day. Max 2 in inventory.",
    "Your rank tier determines Daily Stage difficulty: Iron = easiest, Cyber = hardest.",
    "Daily Stage mixes sky, grid, and physics from 3 different themes every day.",
    "Complete the Daily Stage for a random reward: gold, silver, consumables, or a freeze!",
    "The Daily Stage resets at 5 AM UTC+7. Set your alarm!",
    "Share your Daily Stage time and streak with friends from the completion screen.",
    "Iron → Bronze → Silver → Gold → Platinum → Cyber. 6 ranks to climb.",
    "Champion rank unlocks when you clear all 20 stages. The ceremony is worth it.",
    "Daily chest countdown shows on the button when claimed. Wait it out!",
    "Consumables stack in inventory. Check your stock before a hard stage.",
    "Some themes have reversed daily variants — hardest gaps first, then easing up.",
    "The 📺 button in top-left toggles screen orientation (portrait / landscape).",
    "Frame drops? Lower visual quality in Settings for smoother gameplay.",
    "Ranks beyond Gold need serious dedication. Platinum and Cyber are elite tiers.",
    "Resurrect has a 2-minute cooldown between uses. Plan accordingly.",
    "The daily stage button shows checkmark when completed and gem when ready.",
    "Tap your streak fire icon on the home screen to see your full 31-day calendar.",
    "Every retry teaches you the platform rhythm. Muscle memory beats luck.",
    "Some gaps look impossible until you realize you can air-dash across them.",
    "The highest score isn't always the fastest — gems and style matter too."
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
// Show a random tip on boot screen
var bootTipsEl=document.getElementById('bootTips');
if(bootTipsEl&&typeof TIPS!=='undefined'&&TIPS.length>0){
    bootTipsEl.textContent='💡 '+TIPS[Math.floor(Math.random()*TIPS.length)];
    setTimeout(function(){if(bootTipsEl)bootTipsEl.style.opacity='1';},400);
}
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