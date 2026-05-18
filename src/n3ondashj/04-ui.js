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
var isDailyReplay=false;var replayDailyDate='';var replayDailyRank=0;
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
    updateLsStreakBtn();
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
    for(var i=0; i<LEVELS.length; i++) {
        var dot = document.createElement('button');
        dot.className = 'dot' + (unlocked.includes(i) ? ' unlocked' : ' locked');
        dot.type = 'button';
        dot.style.setProperty('--dot-color', THEMES[LEVELS[i].theme].acc);
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
    scrambleText('lsTags', lv.diff + ' | ' + th.name + (isUpdated?' | \ud83d\udd04 UPDATED':''), null);
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

// === STREAK CALENDAR ===
function openStreakCalendar(){
    renderStreakCalendar();
    $('streakCalendar').classList.add('active');
}
function closeStreakCalendar(){$('streakCalendar').classList.remove('active');}
function renderStreakCalendar(){
    var strip=$('streakStrip');
    if(!strip)return;
    var days=getCalendarDays();
    var html='<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:8px 4px;max-width:320px;margin:0 auto;">';
    var weekLabels=['M','T','W','T','F','S','S'];
    for(var wi=0;wi<7;wi++){
        html+='<div style="text-align:center;font-size:0.5rem;color:#555;font-weight:700;">'+weekLabels[wi]+'</div>';
    }
    for(var i=0;i<days.length;i++){
        var d=days[i];
        var circleStyle='width:22px;height:22px;border-radius:50%;border:2px solid;margin:0 auto;';
        if(d.isPlayed){
            circleStyle+='background:#0ff;border-color:#0ff;box-shadow:0 0 6px rgba(0,255,255,0.4);';
        }else if(d.isFuture){
            circleStyle+='border-color:rgba(255,255,255,0.15);background:transparent;';
        }else{
            circleStyle+='border-color:rgba(255,255,255,0.25);background:transparent;';
        }
        if(d.isToday) circleStyle+='transform:scale(1.2);';
        var labelColor=d.isToday?'#0ff':d.isFuture?'#444':'#666';
        html+='<div style="display:flex;flex-direction:column;align-items:center;gap:2px;">';
        html+='<div style="'+circleStyle+'"></div>';
        html+='<div style="font-size:0.5rem;color:'+labelColor+';font-weight:'+(d.isToday?'700':'400')+';">'+d.label+'</div>';
        html+='</div>';
    }
    html+='</div>';
    strip.innerHTML=html;
    var sb=$('streakBig');
    if(sb) sb.textContent=dailyStreak;
    var sfInv=$('sfInv');
    if(sfInv) sfInv.textContent=streakFreezes+' / '+maxStreakFreezes;
    var sfBtn=$('sfBuyBtn');
    if(sfBtn){
        if(streakFreezes>=maxStreakFreezes){
            sfBtn.style.opacity='0.4';sfBtn.style.pointerEvents='none';sfBtn.textContent='🧊 Max Freezes';
        }else{
            sfBtn.style.opacity='1';sfBtn.style.pointerEvents='auto';sfBtn.textContent='🧊 Buy Freeze (15 ♦)';
        }
    }
}
function buyStreakFreezeFromCalendar(){
    if(streakFreezes>=maxStreakFreezes){addFloat(200,250,'Max freezes reached','#f44');return;}
    if(silverWallet<15){addFloat(200,250,'Not enough silver','#f44');return;}
    silverWallet-=15;save('silver',silverWallet);
    streakFreezes=Math.min(maxStreakFreezes,streakFreezes+1);
    save('streakFreezes',streakFreezes);
    renderStreakCalendar();
    updateLsStreakBtn();
    addFloat(200,250,'+1 🧊 Streak Freeze','#0ff');
}

// === DAILY STAGE PREVIEW ===
function openDailyPreview(){
    dailyLevelObj=generateDailyLevel();
    var lv=dailyLevelObj;
    var dpDiff=$('dpDiff');
    var dpStreak=$('dpStreak');
    var dpBest=$('dpBest');
    if(dpDiff){dpDiff.textContent=lv.diff;dpDiff.style.color=lv.diff==='HARD'?'#f44':lv.diff==='MODERATE'?'#fa0':'#0f8';}
    if(dpStreak) dpStreak.textContent='🔥 Streak: '+dailyStreak+' days';
    var stats=getDailyStats();
    if(dpBest) dpBest.textContent=stats.bestTime?'Best today: '+(stats.bestTime/1000).toFixed(2)+'s':'Best today: --';
    $('dailyPreview').classList.add('active');
}
function closeDailyPreview(){$('dailyPreview').classList.remove('active');}
function playDailyFromPreview(){
    closeDailyPreview();
    startDailyStage();
}

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
    var lv=LEVELS[activeIdx];
    var bTime=bestTimes[activeIdx];
    var bScore=bestScores[activeIdx]||0;
    var st=normalizeLevelStat(levelStats[activeIdx]);
    var cleared=0;for(var i=0;i<LEVELS.length;i++)if(levelStats[i]&&levelStats[i].completions>0)cleared++;
    var stageLine=lv?'\ud83c\udfaf '+lv.name+(bTime?' \u2014 BEST: '+(bTime/1000).toFixed(2)+'s':'')+(bScore?' | Score: '+bScore:''):'';
    return '\ud83c\udfae N3ON DashJ'+(playerName?' \u2014 '+getDisplayName():'')+'\n'+
           stageLine+'\n'+
           '\ud83c\udf1f Rank: '+ri.current.name+'  |  \ud83d\udea9 Cleared: '+cleared+'/'+LEVELS.length+'\n'+
           (championStatus.unlocked?'\u2605 MASTER OF N30N\n':'')+
           '\ud83d\udca5 Think you can beat my time?\n'+
           '\ud83d\udd17 '+location.href;
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
        '<textarea id="shareCustomMsg" oninput="refreshSharePreview()" style="width:100%;height:60px;background:#111;color:#0ff;border:1px solid #0ff;padding:8px;font-family:monospace;font-size:0.75rem;border-radius:8px;resize:none;box-sizing:border-box;">Think you can beat my time? \ud83d\udca5</textarea>'+
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
        // Build stage-specific share card
        var sc=document.createElement('canvas');sc.width=600;sc.height=400;
        var sx=sc.getContext('2d');
        var th=THEMES[LEVELS[activeIdx].theme];
        var bTime=bestTimes[activeIdx];
        var bScore=bestScores[activeIdx]||0;
        var st=normalizeLevelStat(levelStats[activeIdx]);
        // Background gradient from active stage theme
        var bg=sx.createLinearGradient(0,0,0,400);
        bg.addColorStop(0,th.skyT);bg.addColorStop(0.5,th.skyM);bg.addColorStop(1,th.skyB);
        sx.fillStyle=bg;sx.fillRect(0,0,600,400);
        // Grid overlay
        sx.strokeStyle=th.grid;sx.lineWidth=1;sx.globalAlpha=0.08;
        for(var gx=0;gx<600;gx+=40){sx.beginPath();sx.moveTo(gx,0);sx.lineTo(gx,400);sx.stroke();}
        for(var gy=0;gy<400;gy+=40){sx.beginPath();sx.moveTo(0,gy);sx.lineTo(600,gy);sx.stroke();}
        sx.globalAlpha=1;
        // Title
        sx.fillStyle='#fff';sx.font='bold 28px monospace';sx.textAlign='center';
        sx.shadowBlur=12;sx.shadowColor=th.acc;
        sx.fillText('N3ON DashJ',300,36);
        sx.shadowBlur=0;
        // Player name + rank
        if(playerName){var dn=getDisplayName();sx.fillStyle=championStatus.unlocked?'#ffd700':'#ccc';sx.font='bold 14px monospace';sx.fillText(dn,300,56);}
        // Stage name (big, accent)
        sx.fillStyle=th.acc;sx.font='bold 26px monospace';sx.textAlign='center';
        sx.shadowBlur=10;sx.shadowColor=th.acc;
        sx.fillText(LEVELS[activeIdx].name.toUpperCase(),300,95);
        sx.shadowBlur=0;
        // Stats for this stage
        sx.textAlign='left';sx.fillStyle='#fff';sx.font='16px monospace';
        var sy=125;
        sx.fillText('\u23f1 Best: '+(bTime?(bTime/1000).toFixed(2)+'s':'--'),60,sy);
        sx.fillText('\ud83c\udfc6 Score: '+(bScore||0),350,sy);sy+=28;
        sx.fillText('\u2728 Style: '+(st.style||0),60,sy);
        var ri=getPlayerRankInfo();
        sx.fillStyle=ri.current.color;sx.font='bold 16px monospace';sx.textAlign='center';
        sx.fillText('\ud83c\udf1f '+ri.current.name,300,sy+10);
        // Challenge text
        sx.fillStyle='#fff';sx.font='bold 20px monospace';sx.textAlign='center';
        sx.shadowBlur=8;sx.shadowColor='#f0f';
        sx.fillText('\ud83d\udca5 CAN YOU BEAT THIS? \ud83d\udca5',300,260);
        sx.shadowBlur=0;
        // Character (right side, larger)
        drawCharOnCtx(sx, 500, 320, 2.8, Date.now()*0.001);
        // URL
        sx.fillStyle=th.acc;sx.font='bold 12px monospace';sx.textAlign='center';
        sx.fillText(location.host+location.pathname,300,385);
        // Border
        sx.strokeStyle=th.acc;sx.lineWidth=3;sx.strokeRect(2,2,596,396);
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
function canClaimChest(){return !lastChestClaim || getGameDayShort() !== getChestDayKey(lastChestClaim);}
function getMsUntilNextChestReset(){
    var now = Date.now();
    var utc7 = new Date(now + (7 * 60 * 60 * 1000));
    var h = utc7.getUTCHours(), m = utc7.getUTCMinutes(), s = utc7.getUTCSeconds(), ms = utc7.getUTCMilliseconds();
    var sinceMidnight = h*3600000 + m*60000 + s*1000 + ms;
    var until5am = (5*3600000) - sinceMidnight;
    if(until5am <= 0) until5am += 86400000;
    return until5am;
}
function claimDailyChest(){
if(!canClaimChest()){var ms=getMsUntilNextChestReset();var h=Math.floor(ms/3600000);var m=Math.floor((ms%3600000)/60000);addFloat(200,300,h+'h '+m+'m left','#f80');return;}
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
        btn.style.display='flex';
        btn.classList.remove('chest-pulse');
        btn.style.opacity='0.5';
        btn.style.pointerEvents='none';
        var ms=getMsUntilNextChestReset();
        var h=Math.floor(ms/3600000), m=Math.floor((ms%3600000)/60000);
        btn.innerHTML='<div style="font-size:0.45rem;line-height:1.1;text-align:center;">'+h+'h<br>'+m+'m</div>';
        btn.title='Daily chest available in '+h+'h '+m+'m';
    }
}
function updateLsDailyBtn(){
    var btn=$('lsDailyBtn');
    if(!btn)return;
    btn.style.display='flex';
    var stats=getDailyStats();
    if(stats.completed){
        btn.innerHTML='✓';
        btn.style.opacity='0.5';
        btn.style.filter='grayscale(0.5)';
        btn.title='Daily Stage completed today';
    }else{
        btn.innerHTML='💎';
        btn.style.opacity='1';
        btn.style.filter='none';
        btn.title='Daily Stage ready!';
    }
}
function updateLsStreakBtn(){
    var btn=$('lsStreakBtn');
    if(!btn)return;
    btn.style.display='flex';
    btn.innerHTML='🔥 '+dailyStreak;
    if(dailyStreak>0){
        btn.style.opacity='1';
        btn.style.filter='none';
        btn.title='Streak: '+dailyStreak+' days. Tap to view calendar.';
    }else{
        btn.style.opacity='0.5';
        btn.style.filter='grayscale(0.7)';
        btn.title='No streak yet. Play any stage for 60+ seconds!';
    }
}

function claimDailyChestFromHome(){
    if(!canClaimChest()){
        var ms=getMsUntilNextChestReset();
        var h=Math.floor(ms/3600000), m=Math.floor((ms%3600000)/60000);
        addFloat(200,250,h+'h '+m+'m until next chest','#f80');
        return;
    }
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
    if(!dailyLevelObj) dailyLevelObj = generateDailyLevel();
    curLvl = -1;
    deaths = 0;
    replayMode = false;
    _isFreshStageEntry = true;
    sessionStage = -2;
    // Hide home screen, show game (same pattern as startGame but skip stats tracking)
    $('levelSelect').classList.remove('active');
    $('gameCanvas').classList.add('active');
    $('gameTitleHUD').classList.add('active');
    $('hudCenter').classList.add('active');
    $('hudRight').classList.add('active');
    $('hudLeft').style.display='flex';
    if(ctrlMode==='analog'){$('jZone').classList.add('active');$('jBtn').classList.add('active');$('arrowControls').classList.remove('active');}
    else{$('jZone').classList.remove('active');$('jBtn').classList.add('active');$('arrowControls').classList.add('active');}
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
    
    // Save to daily collection
    var todayShort = getGameDayShort();
    var alreadyIdx = -1;
    for(var ci=0;ci<dailyCollection.length;ci++){if(dailyCollection[ci].date===todayShort){alreadyIdx=ci;break;}}
    var rankInfo = getPlayerRankInfo();
    if(alreadyIdx<0){
        dailyCollection.push({date:todayShort,name:'DAILY STAGE',time:runTime,rankIdx:rankInfo.index});
    }else if(runTime < (dailyCollection[alreadyIdx].time||Infinity)){
        dailyCollection[alreadyIdx].time = runTime;
        dailyCollection[alreadyIdx].rankIdx = rankInfo.index;
    }
    dailyCollection.sort(function(a,b){return b.date.localeCompare(a.date);});
    save('dailyCollection',dailyCollection);
    
    // Metrics
    sendMetric('level_complete',{level:-1,name:'DAILY',time:_dt,deaths:_dd,gold:_dg,silver:_ds,style:_dsp,isDaily:true});
    
    // Build collection list HTML
    var collectionHtml = '';
    if(dailyCollection.length > 0){
        var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        collectionHtml = '<div style="margin-top:10px;max-height:90px;overflow-y:auto;border-top:1px solid rgba(255,255,255,0.1);padding-top:6px;">'+
            '<div style="font-size:0.6rem;color:#888;margin-bottom:4px;">📜 DAILY COLLECTION</div>';
        for(var cj=0; cj<dailyCollection.length; cj++){
            var ce = dailyCollection[cj];
            var dStr = parseInt(ce.date.slice(6,8),10) + months[parseInt(ce.date.slice(4,6),10)-1] + ce.date.slice(2,4);
            var isToday = ce.date === todayShort;
            collectionHtml += '<div style="display:flex;justify-content:space-between;align-items:center;padding:2px 0;font-size:0.6rem;color:#ccc;">'+
                '<span>'+(isToday?'🔹 ':'')+dStr+' — '+(ce.time?(ce.time/1000).toFixed(2)+'s':'--')+'</span>'+
                (ce.date!==todayShort?'<button onclick="replayDailyStage(\''+ce.date+'\','+ce.rankIdx+')" style="padding:1px 6px;font-size:0.5rem;background:#111;border:1px solid #0ff;color:#0ff;border-radius:3px;cursor:pointer;">▶</button>':'<span style="color:#0ff;font-size:0.5rem;">TODAY</span>')+
                '</div>';
        }
        collectionHtml += '</div>';
    }
    
    $('ovTitle').textContent = '★ DAILY COMPLETE!';
    $('ovTitle').style.color = '#ffd700';
    $('ovMsg').innerHTML =
        '<div style="font-size:1.1rem;font-weight:700;color:#0ff;margin-bottom:8px;">DAILY STAGE CLEARED</div>'+
        '<div style="font-size:0.85rem;color:#ccc;line-height:1.6;">'+
        'Time: <b style="color:#0ff;">'+(runTime/1000).toFixed(2)+'s</b><br>'+
        'Style: '+stylePoints+'<br>'+
        (rewardText?'<div style="margin-top:8px;padding:6px 12px;background:rgba(255,215,0,0.1);border:1px solid rgba(255,215,0,0.3);border-radius:8px;color:#ffd700;font-weight:bold;">🎁 '+rewardText+'</div>':'')+
        (streak>1?'<div style="margin-top:6px;color:#fa0;font-size:0.8rem;">🔥 '+streak+'-day streak</div>':'')+
        '</div>'+collectionHtml;
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

function showDailyReplayWin(){
    gameRunning=false; stopMusic();
    var ov=$('overlay');
    ov.onclick=null;
    $('homeTooltip').classList.remove('active');
    var dStr = parseInt(replayDailyDate.slice(6,8),10)+['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(replayDailyDate.slice(4,6),10)-1]+replayDailyDate.slice(2,4);
    $('ovTitle').textContent = '✓ REPLAY COMPLETE';
    $('ovTitle').style.color = '#0f8';
    $('ovMsg').innerHTML =
        '<div style="font-size:1rem;font-weight:700;color:#0ff;margin-bottom:8px;">'+dStr+' DAILY STAGE</div>'+
        '<div style="font-size:0.85rem;color:#ccc;line-height:1.6;">'+
        'Time: <b style="color:#0ff;">'+(runTime/1000).toFixed(2)+'s</b><br>'+
        'No gems • No deaths • Practice run<br>'+
        '</div>';
    $('ovBtn').textContent = '🏠 STAGE SELECT';
    $('ovBtn').style.display = 'inline-block';
    $('ovBtn').style.background = '';
    $('ovBtn').onclick = function(){ ov.classList.remove('active'); isDailyReplay=false; dailyLevelObj=null; endGame(); };
    $('ovBtnExtra').style.display = 'inline-block';
    $('ovBtnExtra').textContent = '🔁 REPLAY AGAIN';
    $('ovBtnExtra').onclick = function(){ ov.classList.remove('active'); $('gameCanvas').classList.remove('grey'); $('gameCanvas').classList.remove('shake'); replayDailyStage(replayDailyDate,replayDailyRank); if(musOn) startMusic(); };
    $('ovBtnReplay').style.display = 'none';
    $('ovBtnCancel').style.display = 'none';
    ov.classList.add('active');
}

function replayDailyStage(dateKey,rankIdx){
    isDailyReplay=true;
    replayDailyDate=dateKey;
    replayDailyRank=rankIdx;
    dailyLevelObj=generateDailyLevel(dateKey,rankIdx);
    curLvl=-1; deaths=0; replayMode=false; _isFreshStageEntry=true; sessionStage=-2;
    $('levelSelect').classList.remove('active');
    $('gameCanvas').classList.add('active');
    $('hud').style.display='flex';
    $('hudLvl').style.display='block';
    $('hudTime').style.display='block';
    $('hudDist').style.display='block';
    $('hudPct').style.display='block';
    $('hudChips').style.display='block';
    $('hudDeath').style.display='block';
    $('hudConsumable').style.display='block';
    $('homeBtn').style.display='block';
    $('ovTitle').textContent='';
    $('ovMsg').innerHTML='';
    startLvl(-1);
    gameRunning=true;
    startTime=Date.now();
    if(musOn) startMusic();
}

function shareDailyResult(){
    var dstats = getDailyStats();
    var dth = (dailyLevelObj && dailyLevelObj.customTheme) ? dailyLevelObj.customTheme : theme;
    var sc=document.createElement('canvas');sc.width=600;sc.height=400;
    var sx=sc.getContext('2d');
    // Background gradient from daily theme
    var g=sx.createLinearGradient(0,0,0,400);
    g.addColorStop(0,dth.skyT);g.addColorStop(0.5,dth.skyM);g.addColorStop(1,dth.skyB);
    sx.fillStyle=g;sx.fillRect(0,0,600,400);
    // Grid overlay
    sx.strokeStyle=dth.grid;sx.lineWidth=1;sx.globalAlpha=0.08;
    for(var gx=0;gx<600;gx+=40){sx.beginPath();sx.moveTo(gx,0);sx.lineTo(gx,400);sx.stroke();}
    for(var gy=0;gy<400;gy+=40){sx.beginPath();sx.moveTo(0,gy);sx.lineTo(600,gy);sx.stroke();}
    sx.globalAlpha=1;
    // Title
    sx.fillStyle='#fff';sx.font='bold 28px monospace';sx.textAlign='center';
    sx.fillText('N3ON DashJ',300,36);
    // Player name
    if(playerName){var dn=getDisplayName();sx.fillStyle=championStatus.unlocked?'#ffd700':'#ccc';sx.font='bold 14px monospace';sx.fillText(dn,300,56);}
    // Daily label
    sx.fillStyle=dth.acc;sx.font='bold 24px monospace';sx.textAlign='center';
    sx.shadowBlur=10;sx.shadowColor=dth.acc;
    sx.fillText('💎 DAILY STAGE — '+getGameDayShort(),300,92);
    sx.shadowBlur=0;
    // Character portrait (right side, larger)
    drawCharOnCtx(sx, 500, 300, 2.4, Date.now()*0.001);
    // Stats
    sx.fillStyle='#fff';sx.font='16px monospace';sx.textAlign='left';
    var sy=125;
    sx.fillText('⏱ Time: '+((dstats.bestTime||0)/1000).toFixed(2)+'s',60,sy);
    sx.fillText('🔥 Streak: '+dailyStreak+' days',350,sy);sy+=28;
    sx.fillText('🎁 Reward: '+(dstats.reward?formatDailyRewardText(dstats.reward):'--'),60,sy);sy+=36;
    // Rank
    var ri=getPlayerRankInfo();
    sx.fillStyle=ri.current.color;sx.font='bold 18px monospace';sx.textAlign='center';
    sx.fillText('🌟 '+ri.current.name,300,sy);sy+=42;
    // Challenge text
    sx.fillStyle='#fff';sx.font='bold 20px monospace';sx.textAlign='center';
    sx.shadowBlur=8;sx.shadowColor='#f0f';
    sx.fillText('💥 CAN YOU BEAT TODAY? 💥',300,260);
    sx.shadowBlur=0;
    // Footer
    sx.fillStyle='#666';sx.font='12px monospace';
    sx.fillText('jstylr.pages.dev',300,380);
    // Border
    sx.strokeStyle=dth.acc;sx.lineWidth=3;sx.strokeRect(2,2,596,396);

    var txt = '🔥 N3ON DashJ Daily Stage — '+getGameDayShort()+'\n'+
              '⏱ Time: '+((dstats.bestTime||0)/1000).toFixed(2)+'s | 🔥 Streak: '+dailyStreak+' days\n'+
              (dstats.reward?'🎁 Reward: '+formatDailyRewardText(dstats.reward)+'\n':'')+
              '💥 Think you can beat today\'s daily?\n'+
              '🔗 '+location.href;
    sc.toBlob(function(blob){
        var file=new File([blob],'n3ondashj-daily.png',{type:'image/png'});
        if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){
            navigator.share({text:txt,files:[file]}).catch(function(){});
        }else{
            var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='n3ondashj-daily.png';a.click();
            if(navigator.clipboard&&navigator.clipboard.writeText){
                navigator.clipboard.writeText(txt).then(function(){addFloat(canvas.width/2,canvas.height/2,'COPIED + SAVED!','#0f8');});
            }else{
                addFloat(canvas.width/2,canvas.height/2,'IMAGE SAVED!','#0f8');
            }
        }
    },'image/png');
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
