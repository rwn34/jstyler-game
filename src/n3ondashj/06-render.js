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
var _oldBestTime = bestTimes[curLvl] || 0;
var _newBest = !bestTimes[curLvl] || runTime < bestTimes[curLvl];
if(_newBest) {
    bestTimes[curLvl] = runTime;
    save('times', bestTimes);
}
// Save ghost ONLY on new best time — ghost must always match the actual best time.
// The old fallback (|| !ghostData[curLvl]) caused ghost/bestTime desync after
// migrations or cloud sync wiped ghostData while preserving bestTimes.
if(_newBest) {
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
queueSync();

var ov=$('overlay');
ov.onclick=null;
$('ovTitle').textContent='SECTOR CLEARED!';
$('ovTitle').style.color=theme.acc;
var unlockHtml = newUnlockNames.length > 0 ? '<br><div style="margin-top:10px;padding:8px 16px;border-radius:8px;background:rgba(0,255,136,0.1);border:1px solid rgba(0,255,136,0.3);color:#0f8;font-weight:bold;">🔓 Unlocked: ' + newUnlockNames.join(', ') + '</div>' : '';
if(_ghostJustUnlocked)unlockHtml += '<br><div style="margin-top:10px;padding:10px 16px;border-radius:8px;background:rgba(0,255,255,0.15);border:1px solid rgba(0,255,255,0.5);color:#0ff;font-weight:bold;font-size:0.95rem;">\ud83d\udc7b Ghost Rival unlocked! <span style="font-size:0.7rem;color:#aaa;display:block;font-weight:normal;margin-top:4px;">Free skill \u2014 always equipped, doesn\'t use slots</span></div>';
var timeDiffStr='';
if(_newBest && _oldBestTime>0){
    var diff=_oldBestTime-runTime;
    timeDiffStr=' <span style="color:#0f8">-'+(diff/1000).toFixed(2)+'s</span>';
}
var bestScore=bestScores[curLvl]||0;
$('ovMsg').innerHTML='Sector '+LEVELS[curLvl].name+' complete!<br>Score: <b style="color:#ffd700">'+runScore+'</b> &nbsp; Best: <b style="color:#ffd700">'+bestScore+'</b><br>Gold: '+runGold+' | Silver: '+earnedSilver+' | Style: '+stylePoints+'<br>Time: '+(runTime/1000).toFixed(2)+'s'+timeDiffStr+'<br>Best Time: '+(bestTimes[curLvl]/1000).toFixed(2)+'s'+unlockHtml;
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
    queueSync();
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
            '<div>Gold gems collected: '+totalChips+' / '+maxChips+'</div>'+
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
    var sc=document.createElement('canvas');sc.width=600;sc.height=400;
    var sx=sc.getContext('2d');
    // Gold gradient bg
    var g=sx.createLinearGradient(0,0,0,400);
    g.addColorStop(0,'#1a0a00');g.addColorStop(0.5,'#3a1f00');g.addColorStop(1,'#0a0500');
    sx.fillStyle=g;sx.fillRect(0,0,600,400);
    // Gold grid
    sx.strokeStyle='#ffd700';sx.lineWidth=1;sx.globalAlpha=0.1;
    for(var gx=0;gx<600;gx+=40){sx.beginPath();sx.moveTo(gx,0);sx.lineTo(gx,400);sx.stroke();}
    for(var gy=0;gy<400;gy+=40){sx.beginPath();sx.moveTo(0,gy);sx.lineTo(600,gy);sx.stroke();}
    sx.globalAlpha=1;
    // Title
    sx.fillStyle='#fff';sx.font='bold 28px monospace';sx.textAlign='center';
    sx.fillText('N3ON DashJ',300,36);
    sx.shadowColor='#ffd700';sx.shadowBlur=20;
    sx.fillStyle='#ffd700';sx.font='bold 28px monospace';
    sx.fillText('\u2605 MASTER OF N3ON \u2605',300,72);
    sx.shadowBlur=0;
    // Character portrait (right side, larger)
    drawCharOnCtx(sx, 500, 300, 2.4, Date.now()*0.001);
    // Subtitle
    sx.fillStyle='#fff';sx.font='bold 16px monospace';sx.textAlign='center';
    sx.fillText('All 20 stages conquered',300,98);
    // Stats
    var totalCompletions=0,totalAttempts=0,totalDeaths=globalData.deadFall+globalData.deadSpike+globalData.deadLaser,totalTime=globalData.timePlayed;
    for(var i=0;i<LEVELS.length;i++){if(levelStats[i]){totalCompletions+=levelStats[i].completions||0;totalAttempts+=levelStats[i].attempts||0;}}
    var totalChips=0,maxChips=0;
    for(var i=0;i<LEVELS.length;i++){var carr=bestChips[i]||[];for(var j=0;j<carr.length;j++){if(carr[j])totalChips++;maxChips++;}}
    var hours=Math.floor(totalTime/3600000),mins=Math.floor((totalTime%3600000)/60000);
    var timeStr=hours>0?hours+'h '+mins+'m':mins+'m';
    sx.font='16px monospace';sx.textAlign='left';sx.fillStyle='#fff';
    var sy=125;
    sx.fillText('\ud83d\udc64 '+getDisplayName(),60,sy);
    sx.fillText('\u23f1 '+timeStr,350,sy);sy+=28;
    sx.fillText('\u2705 Clears: '+totalCompletions+' / 20',60,sy);
    sx.fillText('\u2605 '+totalChips+' / '+maxChips+' gold',350,sy);sy+=28;
    // Rank
    var ri=getPlayerRankInfo();
    sx.fillStyle=ri.current.color;sx.font='bold 18px monospace';sx.textAlign='center';
    sx.fillText('\ud83c\udf1f '+ri.current.name,300,sy);sy+=42;
    // Challenge text
    sx.fillStyle='#fff';sx.font='bold 20px monospace';sx.textAlign='center';
    sx.shadowBlur=10;sx.shadowColor='#f0f';
    sx.fillText('\ud83d\udca5 CAN YOU MATCH THIS? \ud83d\udca5',300,280);
    sx.shadowBlur=0;
    // Footer
    sx.fillStyle='#888';sx.font='12px monospace';
    sx.fillText('jstylr.pages.dev',300,380);
    // Gold border
    sx.strokeStyle='#ffd700';sx.lineWidth=3;sx.strokeRect(2,2,596,396);
    sc.toBlob(function(blob){
        var file=new File([blob],'n3ondashj-master.png',{type:'image/png'});
        var txt='\u2605 N3ON DashJ \u2605\nMASTER OF N30N \u2014 all 20 stages conquered!\n\ud83d\udc64 '+getDisplayName()+' \u2022 \u23f1 '+timeStr+' \u2022 \u2605 '+totalChips+'/'+maxChips+' gold\n\ud83d\udca5 Think you can match this?\n\ud83d\udd17 '+location.href;
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
    var sc=document.createElement('canvas');sc.width=600;sc.height=400;
    var sx=sc.getContext('2d');
    var st=normalizeLevelStat(levelStats[curLvl]);
    var bScore=bestScores[curLvl]||0;
    // Background gradient from theme
    var g=sx.createLinearGradient(0,0,0,400);
    g.addColorStop(0,theme.skyT);g.addColorStop(0.5,theme.skyM);g.addColorStop(1,theme.skyB);
    sx.fillStyle=g;sx.fillRect(0,0,600,400);
    // Grid overlay
    sx.strokeStyle=theme.grid;sx.lineWidth=1;sx.globalAlpha=0.08;
    for(var gx=0;gx<600;gx+=40){sx.beginPath();sx.moveTo(gx,0);sx.lineTo(gx,400);sx.stroke();}
    for(var gy=0;gy<400;gy+=40){sx.beginPath();sx.moveTo(0,gy);sx.lineTo(600,gy);sx.stroke();}
    sx.globalAlpha=1;
    // Title
    sx.fillStyle='#fff';sx.font='bold 28px monospace';sx.textAlign='center';
    sx.fillText('N3ON DashJ',300,36);
    // Player name with MASTER badge
    if(playerName){var dn=getDisplayName();sx.fillStyle=championStatus.unlocked?'#ffd700':'#ccc';sx.font='bold 14px monospace';sx.fillText(dn,300,56);}
    // Stage name (big, accent)
    sx.fillStyle=theme.acc;sx.font='bold 24px monospace';sx.textAlign='center';
    sx.shadowBlur=10;sx.shadowColor=theme.acc;
    sx.fillText('\u2705 '+LEVELS[curLvl].name+' CLEARED!',300,92);
    sx.shadowBlur=0;
    // Character portrait (right side, larger)
    drawCharOnCtx(sx, 500, 300, 2.4, Date.now()*0.001);
    // Stats
    sx.fillStyle='#fff';sx.font='16px monospace';sx.textAlign='left';
    var sy=125;
    sx.fillText('\u23f1 Time: '+(runTime/1000).toFixed(2)+'s',60,sy);
    sx.fillText('\ud83c\udfc6 Best: '+(bestTimes[curLvl]?((bestTimes[curLvl]/1000).toFixed(2)+'s'):'--'),350,sy);sy+=28;
    sx.fillText('\u2b50 Style: '+stylePoints,60,sy);
    sx.fillText('\ud83c\udfc6 Score: '+(bScore||0),350,sy);sy+=36;
    // Rank
    var ri=getPlayerRankInfo();
    sx.fillStyle=ri.current.color;sx.font='bold 18px monospace';sx.textAlign='center';
    sx.fillText('\ud83c\udf1f '+ri.current.name,300,sy);sy+=42;
    // Challenge text
    sx.fillStyle='#fff';sx.font='bold 20px monospace';sx.textAlign='center';
    sx.shadowBlur=8;sx.shadowColor='#f0f';
    sx.fillText('\ud83d\udca5 CAN YOU BEAT THIS? \ud83d\udca5',300,260);
    sx.shadowBlur=0;
    // Footer
    sx.fillStyle='#666';sx.font='12px monospace';
    sx.fillText('jstylr.pages.dev',300,380);
    // Border
    sx.strokeStyle=theme.acc;sx.lineWidth=3;sx.strokeRect(2,2,596,396);

    sc.toBlob(function(blob){
        var file=new File([blob],'n3ondashj-clear.png',{type:'image/png'});
        var txt='\ud83c\udfae N3ON DashJ\n\u2705 '+LEVELS[curLvl].name+' CLEARED!\n\u23f1 '+(runTime/1000).toFixed(2)+'s | \ud83c\udfc6 Score: '+(bScore||0)+' | \u2b50 Style: '+stylePoints+'\n\ud83d\udca5 Think you can beat my time?\n\ud83d\udd17 '+location.href;
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
    {
        if(sessionRunTime + runTime >= 60000) recordPlayDay();
        checkPwaReward();
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
            todayPlayTime += elapsed; save('todayPlayTime', todayPlayTime);
            if(!(typeof isDailyStage!=='undefined'&&isDailyStage)){
                var st=normalizeLevelStat(levelStats[curLvl]);
                st.timePlayed = (st.timePlayed || 0) + elapsed;
                levelStats[curLvl]=st; save('stats',levelStats);
            }
        }
        save('globalData', globalData);
        lastRunSilver=runSilver;
    }
    
    $('hudDeath').textContent=deaths;
    shatterPlayer(); 
    playSfx('die');vib([30,30,60]);
    $('gameCanvas').classList.add('shake');
    setTimeout(function(){if(!gameRunning)return;$('gameCanvas').classList.add('grey');}, 800);
    _dieTimer=setTimeout(showDie,1400); 
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

    ctx.strokeStyle=adjustHex(theme.grid,30);ctx.lineWidth=1;ctx.globalAlpha=.18;
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
            // Daily master gem — diamond shape, gold or cyan based on champion status
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

    var _isDailyRender=(typeof isDailyStage!=='undefined'&&isDailyStage);
    if(!replayMode&&ghostsEnabled&&hasSkill('ghost')&&ghostVisible&&currentGhost&&!player.dead&&!_isDailyRender){
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
    $('hudLeft').style.display='none';$('freezeBtn').style.display='none';
    $('jZone').classList.remove('active');
    $('jBtn').classList.remove('active');
    $('arrowControls').classList.remove('active');
    $('overlay').classList.remove('active');
    wCtx.clearRect(0,0,wCanvas.width,wCanvas.height);
    if(screen.orientation&&screen.orientation.unlock)try{screen.orientation.unlock();}catch(e){}
    if(document.exitFullscreen)document.exitFullscreen().catch(function(){});
    initLevelSelect();
}
