curLvl=lvl;deaths=0;replayMode=false;_isFreshStageEntry=true;
var st=normalizeLevelStat(levelStats[lvl]);
st.attempts++;
levelStats[lvl]=st;save('stats',levelStats);
$('levelSelect').classList.remove('active');
stopStageTips();
$('gameCanvas').classList.add('active');

$('gameTitleHUD').classList.add('active');
$('hudCenter').classList.add('active');
$('hudRight').classList.add('active');
$('hudLeft').style.display='flex';

if(ctrlMode==='analog'){$('jZone').classList.add('active');$('jBtn').classList.add('active');$('arrowControls').classList.remove('active');}
else{$('jZone').classList.remove('active');$('jBtn').classList.add('active');$('arrowControls').classList.add('active');}

applyJoySettings();applyBtnSize();applyJumpBtnSize();

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
    stopStageTips();
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
    resize();initStars();startLvl(lvl);
    $('hudLvl').textContent='\ud83c\udfac REPLAY: '+LEVELS[lvl].name;
}
function exitReplay(){
    if(_winTimer){clearTimeout(_winTimer);_winTimer=null;}
    if(_dieTimer){clearTimeout(_dieTimer);_dieTimer=null;}
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

function resize(){
    var vw=W.visualViewport||{width:W.innerWidth,height:W.innerHeight,offsetLeft:0,offsetTop:0};
    canvas.width=vw.width;canvas.height=vw.height;
    wCanvas.width=vw.width;wCanvas.height=vw.height;
    // Adjust canvas CSS position to account for visual viewport offset (browser chrome scroll)
    canvas.style.position='fixed';
    canvas.style.left=vw.offsetLeft+'px';
    canvas.style.top=vw.offsetTop+'px';
    wCanvas.style.position='fixed';
    wCanvas.style.left=vw.offsetLeft+'px';
    wCanvas.style.top=vw.offsetTop+'px';
}

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
if(_winTimer){clearTimeout(_winTimer);_winTimer=null;}
if(_dieTimer){clearTimeout(_dieTimer);_dieTimer=null;}
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
if(_carryRun){sessionRunTime+=runTime;}
else{sessionRunTime=0;}
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
if(tt && globalData.matches < 20) {
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
_isDailyRun=(typeof isDailyStage!=='undefined'&&isDailyStage);
var skillIcons='';if(hasSkill('ghost')&&!_isDailyRun)skillIcons+='\ud83d\udc7b';if(hasSkill('phasedash'))skillIcons+=phaseDashUsed?'\u26ab':'\ud83c\udf00';if(hasSkill('airdash'))skillIcons+='\ud83d\udca8';if(hasSkill('reflexdash'))skillIcons+='\u26a1';if(hasSkill('resurrect'))skillIcons+='\u2764';if(hasSkill('coyote'))skillIcons+='\ud83d\udc3e';if(hasSkill('magnet'))skillIcons+='\ud83e\uddf2';if(hasSkill('wallslide'))skillIcons+='\ud83e\udea9';if(hasSkill('slowfall'))skillIcons+='\ud83e\ude82';if(consumableTimefreeze)skillIcons+='\u23f8';$('hudSkills').textContent=skillIcons;
$('freezeBtn').style.display=consumableTimefreeze?'flex':'none';
$('hudFx').innerHTML=(theme.weather!=='clear'?theme.weather.toUpperCase()+'<br>':'')+(theme.grav<=0.55?'LOW G':theme.grav>=0.65?'HEAVY G':'NORMAL G')+'<br>'+(theme.fric<=0.8?'SLIPPERY':theme.fric>=0.88?'GRIPPY':'NORMAL FRIC');
gameRunning=true;lastFrameTime=0;if(animId)cancelAnimationFrame(animId);loop();
}

function genLvl(lv){
var sc=lv.sc,px=0,py=450,cnt=lv.plats,seed=lv.theme*997+lv.plats*31;
var isDaily = (typeof isDailyStage!=='undefined' && isDailyStage);
if(lv.theme===-1) {
    var _dailyRank = (typeof lv.rankIdx !== 'undefined') ? lv.rankIdx : getPlayerRankInfo().index;
    seed = hashString((lv.dateKey || getGameDayKey()) + 'layout' + _dailyRank) % 233280;
}
platforms.push({x:0,y:450,w:400*sc,h:40,t:'s',ox:0,oy:0,sp:0,amp:0});
var lastX=400*sc;
var goldChipOrdinal=0; // ordinal index for gold chips, used for bestChips persistence
var dailySilverOrdinal=0; // ordinal index for silver arc gems in daily stages
var dailyCollected = isDaily ? (load('dailySilver',{day:'',collected:[]}).collected||[]) : [];
var todayKey = isDaily ? getGameDayShort() : '';
var dailyData = isDaily ? load('dailySilver',{day:todayKey,collected:[]}) : {day:todayKey,collected:[]};
if(dailyData.day !== todayKey) dailyData = {day:todayKey,collected:[]};
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
    
    // Layout-specific geometry adjustments
    if(lv.layoutType && lv.layoutType !== 'wave'){
        if(lv.layoutType === 'clusters'){
            var clusterSize = 3 + Math.floor((seed/233280)*2);
            if(i > 0 && i % clusterSize === 0){
                gap += 35 + Math.floor((seed/233280)*25);
            }else if(i > 0){
                gap = Math.max(40, gap * 0.62);
            }
        }else if(lv.layoutType === 'stairs'){
            var stairDir = (i % 4 < 2) ? 1 : -1;
            var stairStep = 12 + Math.floor((seed/233280)*28);
            hc = stairDir * stairStep;
            gap = Math.max(50, gap * 0.8);
            pw = Math.max(50, pw * 0.86);
        }else if(lv.layoutType === 'islands'){
            pw = 40 + Math.floor((seed/233280)*55*sc);
            hc = hc * 1.5;
            gap = Math.max(60, gap * 1.2);
        }else if(lv.layoutType === 'gaps'){
            if((seed/233280) < 0.14){
                gap += 45 + Math.floor((seed/233280)*35);
            }
        }else if(lv.layoutType === 'vertical'){
            hc = hc * 1.3;
            gap = Math.max(48, gap * 0.85);
        }else if(lv.layoutType === 'dense'){
            pw = Math.min(170, pw * 1.15);
        }
    }
    
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
            // No gold gems in daily stages or replay mode
            if(!isDaily){
                chips.push({x: px+pw/2, y: py-60, col: false, goldIdx: goldChipOrdinal++});
            }
            if(i>1 && i<cnt-1 && gap>80){
                var arcMid=px-gap/2,arcTop=py-80;
                for(var ci=0;ci<3;ci++){
                    var dsIdx = dailySilverOrdinal++;
                    // Skip already-collected silver gems in daily stage
                    if(isDaily && dailyData.collected.indexOf(dsIdx)>=0) continue;
                    var ct=(ci+1)/4;
                    var cx2=px-gap+gap*ct;
                    var cy2=py-Math.sin(ct*Math.PI)*80;
                    chips.push({x:cx2,y:cy2,col:false,isArc:true,dailyIdx:dsIdx});
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
// Only in normal stages, not daily stages
if(championStatus.unlocked && !isDaily){
    var stCur=normalizeLevelStat(levelStats[curLvl]);
    var collectedMG=stCur.masterGems||[];
    var mgCount=lv.diff==='HARD'?4:lv.diff==='MODERATE'?3:2;
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

// Daily gem placement removed — daily stages only have silver gems (persistent per day)

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
if(_winTimer){clearTimeout(_winTimer);_winTimer=null;}
if(_dieTimer){clearTimeout(_dieTimer);_dieTimer=null;}
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
        todayPlayTime += elapsed; save('todayPlayTime', todayPlayTime);
    }
    if(sessionRunTime + elapsed >= 60000) recordPlayDay();
    checkPwaReward();
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
$('hudLeft').style.display='none';$('freezeBtn').style.display='none';
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
if(ghostsEnabled&&!replayMode&&!player.dead&&!player.won&&frameCount%5===0&&ghostFrames.length<4000&&!_isDailyRun){var _gf={x:Math.round(player.x),y:Math.round(player.y),f:player.face,og:player.og,ph:player.at};if(player.djU)_gf.dj=1;if(_ghostTeleportFlag){_gf.tp=true;_ghostTeleportFlag=false;}ghostFrames.push(_gf);}
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
    _winTimer=setTimeout(showWin,1000);
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
            dailyData={day:getGameDayShort(),collected:true};
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
            // Persist daily silver collection so gems don't respawn on retry
            if(typeof isDailyStage!=='undefined'&&isDailyStage&&c.isArc&&c.dailyIdx!=null){
                var _ds=load('dailySilver',{day:'',collected:[]});
                var _tk=getGameDayShort();
                if(_ds.day!==_tk){_ds={day:_tk,collected:[]};}
                if(_ds.collected.indexOf(c.dailyIdx)<0){
                    _ds.collected.push(c.dailyIdx);
                    save('dailySilver',_ds);
                }
            }
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

recordPlayDay();checkPwaReward();
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
    st.silver = (st.silver || 0) + runSilver;
    st.contentVersion = STAGE_CONTENT_VERSION;
    levelStats[curLvl]=st;save('stats',levelStats);
    if(_wasLocked && isGhostUnlocked())_ghostJustUnlocked=true;
}else{
    st.completions++;
    st.silver = (st.silver || 0) + runSilver;
    st.contentVersion = STAGE_CONTENT_VERSION;
    levelStats[curLvl]=st;save('stats',levelStats);
}

globalData.matches++;
var elapsed = runTime || (Date.now() - startTime);
if(elapsed > 0 && elapsed < 86400000) {
    globalData.timePlayed += elapsed;
