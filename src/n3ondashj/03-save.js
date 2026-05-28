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
var APP_VERSION = 'v1.2.64'; // Build version — updated by zipgame.ps1
var playerId = load('playerId', null);
if(!playerId){playerId='p_'+Math.random().toString(36).slice(2,10)+Date.now().toString(36);save('playerId',playerId);}

// Referral capture — must run after playerId is set, before anything else reads location.search
(function handleReferral(){
try{
var params=new URLSearchParams(location.search);
var ref=params.get('ref');
if(!ref)return;
if(ref===playerId){history.replaceState(null,'',location.origin+location.pathname);return;}
if(localStorage.getItem('ndj_referrer_pid')){history.replaceState(null,'',location.origin+location.pathname);return;}
if(!/^p_[a-z0-9]+$/i.test(ref)){history.replaceState(null,'',location.origin+location.pathname);return;}
localStorage.setItem('ndj_referrer_pid',ref);
if(typeof sendMetric==='function')sendMetric('ui_event',{action:'referral_open',meta:ref});
history.replaceState(null,'',location.origin+location.pathname);
showWelcomeFromFriendToast();
}catch(e){}
})();
function showWelcomeFromFriendToast(){var t=document.createElement('div');t.textContent='Welcomed via friend';t.style.cssText='position:fixed;top:20px;left:50%;transform:translateX(-50%);background:rgba(0,255,255,0.15);color:#0ff;border:1px solid #0ff;padding:8px 16px;border-radius:8px;font-family:monospace;font-size:0.8rem;z-index:9999;backdrop-filter:blur(8px);box-shadow:0 0 12px rgba(0,255,255,0.3);';document.body.appendChild(t);setTimeout(function(){t.style.transition='opacity 500ms';t.style.opacity='0';},3500);setTimeout(function(){if(t.parentNode)t.parentNode.removeChild(t);},4200);}

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

function genEventUuid(){
    if(self.crypto&&typeof self.crypto.randomUUID==='function')return self.crypto.randomUUID();
    return('xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx').replace(/[xy]/g,function(c){var r=Math.random()*16|0,v=c==='x'?r:(r&0x3|0x8);return v.toString(16);});
}

function sendMetric(type, data){
    if(!METRIC_URL)return;
    var d=Object.assign({},data);
    d._v=APP_VERSION;
    var e={pid:playerId,name:(typeof playerName!=='undefined'&&playerName)?playerName:null,type:type,data:d,ts:Date.now()};
    e.event_uuid=genEventUuid();
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
var CONSUMABLES=[{id:'triplejump',name:'Triple Jump',icon:'\u2b06\ufe0f',desc:'3rd jump mid-air (15s CD)',cost:10,preview:'After double jump, jump once more! Recharges every 15 seconds'},{id:'dblshield',name:'Double Shield',icon:'\ud83d\udee1\ufe0f',desc:'Absorb 2 hits this run',cost:15,preview:'Two layers of protection \u2014 survive two hits before dying'},{id:'timefreeze',name:'Time Freeze',icon:'\u23f8\ufe0f',desc:'Freeze hazards 10s (60s CD)',cost:12,preview:'Tap the \u23f8 button to freeze lasers and moving platforms'},{id:'namechange',name:'Name Change',icon:'\u270f\ufe0f',desc:'Change your player name',cost:50,preview:'Pick a new name (5-10 chars, alphanumeric)'},{id:'streakfreeze',name:'Streak Freeze',icon:'\ud83e\uddca',desc:'Protect streak for 1 missed day',cost:15,preview:'If you miss a day, your streak is preserved. Max 2 in inventory.'}];
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
// === CLOUD SYNC ===
var playerMmyy=load('playerMmyy','');
var syncPin=load('syncPin','');
var syncRegistered=load('syncRegistered',false);
var syncAuto=load('syncAuto',true);
var pendingPurchases=load('pendingPurchases',[]);
var syncDeviceId=load('syncDeviceId','');
if(!syncDeviceId){syncDeviceId='d_'+Math.random().toString(36).slice(2,8);save('syncDeviceId',syncDeviceId);}
var _syncDebounce=null;
var SYNC_SALT_CLIENT='ndj-sync-v1-salt';

function hashSyncKeyClient(username,mmyy,pin){
    var msg=String(username||'').toUpperCase()+'|'+String(mmyy||'')+'|'+String(pin||'');
    if(!window.crypto||!crypto.subtle)return Promise.resolve(null);
    var enc=new TextEncoder();
    return crypto.subtle.importKey('raw',enc.encode(SYNC_SALT_CLIENT),{name:'HMAC',hash:'SHA-256'},false,['sign']).then(function(k){
        return crypto.subtle.sign('HMAC',k,enc.encode(msg));
    }).then(function(sig){
        return Array.from(new Uint8Array(sig)).map(function(b){return ('0'+b.toString(16)).slice(-2);}).join('');
    }).catch(function(){return null;});
}

function buildSyncData(){
    return {
        pid:playerId,
        playerName:playerName,
        playerMmyy:playerMmyy,
        unlocked:unlocked,
        scores:bestScores,
        times:bestTimes,
        chips:bestChips,
        stats:levelStats,
        lastPlayed:lastPlayed,
        silver:silverWallet,
        globalData:globalData,
        goldSpent:goldSpent,
        bonusGold:bonusGold,
        ownedSkills:ownedSkills,
        equippedSkills:equippedSkills,
        ownedCosmetics:ownedCosmetics,
        equippedCosmetics:equippedCosmetics,
        consumableInv:consumableInv,
        lastChest:lastChestClaim,
        lastResurrect:lastResurrectTime,
        championStatus:championStatus,
        streakFreezes:load('streakFreezes',0),
        frozenDays:load('frozenDays',[]),
        dailyStreak:load('dailyStreak',0),
        sfx:sfxOn,
        mus:musOn,
        ctrl:ctrlMode,
        vibrate:vibrateOn,
        orient:orient,
        visualQuality:visualQuality,
        ghostsEnabled:ghostsEnabled,
        showFps:showFps,
        autoRetryDelay:autoRetryDelay,
        hintsSeen:hintsSeen,
        tutorialDone:load('tutorialDone',false),
        ctrlPicked:load('ctrlPicked',false)
    };
}

function mergeSyncData(cloud){
    if(!cloud||typeof cloud!=='object')return;
    // Adopt PID from cloud
    if(cloud.pid&&cloud.pid!==playerId){playerId=cloud.pid;save('playerId',playerId);}
    // Player name
    if(cloud.playerName){playerName=cloud.playerName;save('playerName',playerName);}
    // Player mmyy
    if(cloud.playerMmyy){playerMmyy=cloud.playerMmyy;save('playerMmyy',playerMmyy);}
    // Unlocked: union
    if(Array.isArray(cloud.unlocked)){
        var uSet=new Set(unlocked);
        for(var i=0;i<cloud.unlocked.length;i++)uSet.add(cloud.unlocked[i]);
        unlocked=Array.from(uSet);save('unlocked',unlocked);
    }
    // Best scores: per-level max
    if(cloud.scores){for(var k in cloud.scores){if(cloud.scores[k]>(bestScores[k]||0))bestScores[k]=cloud.scores[k];}save('scores',bestScores);}
    // Best times: per-level min
    if(cloud.times){for(var k in cloud.times){if(cloud.times[k]<(bestTimes[k]||Infinity))bestTimes[k]=cloud.times[k];}save('times',bestTimes);}
    // Best chips: per-index OR
    if(cloud.chips){for(var k in cloud.chips){var ca=cloud.chips[k]||[];var ba=bestChips[k]||[];var maxLen=Math.max(ca.length,ba.length);var merged=[];for(var i=0;i<maxLen;i++)merged[i]=!!ca[i]||!!ba[i];bestChips[k]=merged;}save('chips',bestChips);}
    // Stats: per-level max completions/attempts/silver
    if(cloud.stats){for(var k in cloud.stats){var cs=cloud.stats[k]||{};var ls=levelStats[k]||{};levelStats[k]={attempts:Math.max(ls.attempts||0,cs.attempts||0),completions:Math.max(ls.completions||0,cs.completions||0),hazards:Math.max(ls.hazards||0,cs.hazards||0),silver:Math.max(ls.silver||0,cs.silver||0),timePlayed:Math.max(ls.timePlayed||0,cs.timePlayed||0),contentVersion:Math.max(ls.contentVersion||0,cs.contentVersion||0),masterGems:Array.isArray(cs.masterGems)?cs.masterGems.slice():([])};}save('stats',levelStats);}
    // Silver: max
    if(typeof cloud.silver==='number'){silverWallet=Math.max(silverWallet,cloud.silver);save('silver',silverWallet);}
    // Gold spent: max
    if(typeof cloud.goldSpent==='number'){goldSpent=Math.max(goldSpent,cloud.goldSpent);save('goldSpent',goldSpent);}
    // Bonus gold: max
    if(typeof cloud.bonusGold==='number'){bonusGold=Math.max(bonusGold,cloud.bonusGold);save('bonusGold',bonusGold);}
    // Skills: union
    if(Array.isArray(cloud.ownedSkills)){for(var i=0;i<cloud.ownedSkills.length;i++){if(ownedSkills.indexOf(cloud.ownedSkills[i])<0)ownedSkills.push(cloud.ownedSkills[i]);}save('ownedSkills',ownedSkills);}
    if(Array.isArray(cloud.equippedSkills)){equippedSkills=cloud.equippedSkills.slice(0,3);save('equippedSkills',equippedSkills);}
    // Cosmetics: union
    if(Array.isArray(cloud.ownedCosmetics)){for(var i=0;i<cloud.ownedCosmetics.length;i++){if(ownedCosmetics.indexOf(cloud.ownedCosmetics[i])<0)ownedCosmetics.push(cloud.ownedCosmetics[i]);}save('ownedCosmetics',ownedCosmetics);}
    if(cloud.equippedCosmetics&&typeof cloud.equippedCosmetics==='object'){for(var k in cloud.equippedCosmetics){if(cloud.equippedCosmetics[k])equippedCosmetics[k]=cloud.equippedCosmetics[k];}save('equippedCosmetics',equippedCosmetics);}
    // Consumables: per-item max
    if(cloud.consumableInv&&typeof cloud.consumableInv==='object'){for(var k in cloud.consumableInv){consumableInv[k]=Math.max(consumableInv[k]||0,cloud.consumableInv[k]||0);}save('consumableInv',consumableInv);}
    // Settings
    if(typeof cloud.sfx==='boolean'){sfxOn=cloud.sfx;save('sfx',sfxOn);}
    if(typeof cloud.mus==='boolean'){musOn=cloud.mus;save('mus',musOn);}
    if(typeof cloud.ctrl==='string'){ctrlMode=cloud.ctrl;save('ctrl',ctrlMode);}
    if(typeof cloud.vibrate==='boolean'){vibrateOn=cloud.vibrate;save('vibrate',vibrateOn);}
    if(typeof cloud.orient==='string'){orient=cloud.orient;save('orient',orient);}
    if(typeof cloud.visualQuality==='string'){visualQuality=cloud.visualQuality;save('visualQuality',visualQuality);}
    if(typeof cloud.ghostsEnabled==='boolean'){ghostsEnabled=cloud.ghostsEnabled;save('ghostsEnabled',ghostsEnabled);}
    if(typeof cloud.showFps==='boolean'){showFps=cloud.showFps;save('showFps',showFps);}
    if(cloud.autoRetryDelay){autoRetryDelay=cloud.autoRetryDelay;save('autoRetryDelay',autoRetryDelay);}
    // Champion status
    if(cloud.championStatus&&typeof cloud.championStatus==='object'){
        championStatus.unlocked=!!(championStatus.unlocked||cloud.championStatus.unlocked);
        save('championStatus',championStatus);
    }
    // Daily/streak
    if(typeof cloud.dailyStreak==='number'){save('dailyStreak',cloud.dailyStreak);}
    if(typeof cloud.streakFreezes==='number'){save('streakFreezes',cloud.streakFreezes);}
    if(Array.isArray(cloud.frozenDays)){save('frozenDays',cloud.frozenDays);}
    if(typeof cloud.lastChest==='number'){lastChestClaim=cloud.lastChest;save('lastChest',lastChestClaim);}
    if(typeof cloud.lastResurrect==='number'){lastResurrectTime=cloud.lastResurrect;save('lastResurrect',lastResurrectTime);}
}

function queueSync(data,rewards,purchases){
    if(!syncRegistered||!syncAuto)return;
    if(_syncDebounce)clearTimeout(_syncDebounce);
    _syncDebounce=setTimeout(function(){saveSync(data,rewards,purchases);},5000);
}

function saveSync(data,rewards,purchases){
    if(!METRIC_URL||!syncRegistered||!syncPin||!playerMmyy)return;
    var payload={
        username:playerName,
        mmyy:playerMmyy,
        pin:syncPin,
        deviceId:syncDeviceId,
        data:data||buildSyncData(),
        rewards:rewards||[],
        pendingPurchases:purchases||pendingPurchases||[],
        ts:Date.now()
    };
    fetch(METRIC_URL+'/sync/save',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(payload),
        keepalive:true
    }).then(function(r){return r.json();}).then(function(d){
        if(d&&d.ok){
            pendingPurchases=[];save('pendingPurchases',pendingPurchases);
            if(d.rejectedPurchases&&d.rejectedPurchases.length>0){
                // Refund rejected purchases locally
                for(var i=0;i<d.rejectedPurchases.length;i++){
                    var p=d.rejectedPurchases[i];
                    if(p.currency==='silver'){silverWallet+=p.cost;save('silver',silverWallet);}
                    else if(p.currency==='gold'){goldSpent=Math.max(0,goldSpent-p.cost);save('goldSpent',goldSpent);}
                    // Remove item from owned
                    if(ownedSkills.indexOf(p.id)>=0){ownedSkills.splice(ownedSkills.indexOf(p.id),1);save('ownedSkills',ownedSkills);}
                    if(ownedCosmetics.indexOf(p.id)>=0){ownedCosmetics.splice(ownedCosmetics.indexOf(p.id),1);save('ownedCosmetics',ownedCosmetics);}
                }
                if(typeof addFloat==='function')addFloat(W.innerWidth/2,W.innerHeight/2,'Some purchases were refunded (sync conflict)','#f80');
            }
        }
    }).catch(function(){});
}

function replaceSyncData(cloud){
    if(!cloud||typeof cloud!=='object')return;
    // Adopt PID from cloud
    if(cloud.pid&&cloud.pid!==playerId){playerId=cloud.pid;save('playerId',playerId);}
    // Player name
    if(cloud.playerName){playerName=cloud.playerName;save('playerName',playerName);}
    // Player mmyy
    if(cloud.playerMmyy){playerMmyy=cloud.playerMmyy;save('playerMmyy',playerMmyy);}
    // Replace unlocked
    if(Array.isArray(cloud.unlocked)){unlocked=cloud.unlocked.slice();save('unlocked',unlocked);}
    // Replace scores
    if(cloud.scores){bestScores=JSON.parse(JSON.stringify(cloud.scores));save('scores',bestScores);}
    // Replace times
    if(cloud.times){bestTimes=JSON.parse(JSON.stringify(cloud.times));save('times',bestTimes);}
    // Replace chips
    if(cloud.chips){bestChips=JSON.parse(JSON.stringify(cloud.chips));save('chips',bestChips);}
    // Replace stats
    if(cloud.stats){levelStats=JSON.parse(JSON.stringify(cloud.stats));save('stats',levelStats);}
    // Replace silver
    if(typeof cloud.silver==='number'){silverWallet=cloud.silver;save('silver',silverWallet);}
    // Replace globalData
    if(cloud.globalData){globalData=JSON.parse(JSON.stringify(cloud.globalData));save('globalData',globalData);}
    // Replace goldSpent
    if(typeof cloud.goldSpent==='number'){goldSpent=cloud.goldSpent;save('goldSpent',goldSpent);}
    // Replace bonusGold
    if(typeof cloud.bonusGold==='number'){bonusGold=cloud.bonusGold;save('bonusGold',bonusGold);}
    // Replace skills
    if(Array.isArray(cloud.ownedSkills)){ownedSkills=cloud.ownedSkills.slice();save('ownedSkills',ownedSkills);}
    if(Array.isArray(cloud.equippedSkills)){equippedSkills=cloud.equippedSkills.slice(0,3);save('equippedSkills',equippedSkills);}
    // Replace cosmetics
    if(Array.isArray(cloud.ownedCosmetics)){ownedCosmetics=cloud.ownedCosmetics.slice();save('ownedCosmetics',ownedCosmetics);}
    if(cloud.equippedCosmetics&&typeof cloud.equippedCosmetics==='object'){equippedCosmetics=JSON.parse(JSON.stringify(cloud.equippedCosmetics));save('equippedCosmetics',equippedCosmetics);}
    // Replace consumables
    if(cloud.consumableInv&&typeof cloud.consumableInv==='object'){consumableInv=JSON.parse(JSON.stringify(cloud.consumableInv));save('consumableInv',consumableInv);}
    // Settings
    if(typeof cloud.sfx==='boolean'){sfxOn=cloud.sfx;save('sfx',sfxOn);}
    if(typeof cloud.mus==='boolean'){musOn=cloud.mus;save('mus',musOn);}
    if(typeof cloud.ctrl==='string'){ctrlMode=cloud.ctrl;save('ctrl',ctrlMode);}
    if(typeof cloud.vibrate==='boolean'){vibrateOn=cloud.vibrate;save('vibrate',vibrateOn);}
    if(typeof cloud.orient==='string'){orient=cloud.orient;save('orient',orient);}
    if(typeof cloud.visualQuality==='string'){visualQuality=cloud.visualQuality;save('visualQuality',visualQuality);}
    if(typeof cloud.ghostsEnabled==='boolean'){ghostsEnabled=cloud.ghostsEnabled;save('ghostsEnabled',ghostsEnabled);}
    if(typeof cloud.showFps==='boolean'){showFps=cloud.showFps;save('showFps',showFps);}
    if(cloud.autoRetryDelay){autoRetryDelay=cloud.autoRetryDelay;save('autoRetryDelay',autoRetryDelay);}
    // Champion status
    if(cloud.championStatus&&typeof cloud.championStatus==='object'){
        championStatus=JSON.parse(JSON.stringify(cloud.championStatus));
        save('championStatus',championStatus);
    }
    // Daily/streak
    if(typeof cloud.dailyStreak==='number'){save('dailyStreak',cloud.dailyStreak);}
    if(typeof cloud.streakFreezes==='number'){save('streakFreezes',cloud.streakFreezes);}
    if(Array.isArray(cloud.frozenDays)){save('frozenDays',cloud.frozenDays);}
    if(typeof cloud.lastChest==='number'){lastChestClaim=cloud.lastChest;save('lastChest',lastChestClaim);}
    if(typeof cloud.lastResurrect==='number'){lastResurrectTime=cloud.lastResurrect;save('lastResurrect',lastResurrectTime);}
    if(Array.isArray(cloud.hintsSeen)){hintsSeen=cloud.hintsSeen.slice();save('hintsSeen',hintsSeen);}
    if(typeof cloud.tutorialDone==='boolean'){save('tutorialDone',cloud.tutorialDone);}
    if(typeof cloud.ctrlPicked==='boolean'){save('ctrlPicked',cloud.ctrlPicked);}
}

function checkSyncCredentials(username,mmyy,pin,callback){
    if(!METRIC_URL)return;
    var payload={username:mmyy?username:playerName,mmyy:mmyy||playerMmyy,pin:pin||syncPin};
    fetch(METRIC_URL+'/sync/check',{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),keepalive:true
    }).then(function(r){return r.json();}).then(function(d){
        if(typeof callback==='function')callback(d&&d.ok,d);
    }).catch(function(){if(typeof callback==='function')callback(false,null);});
}
function loadSync(username,mmyy,pin,callback,replace){
    if(!METRIC_URL)return;
    var payload={username:mmyy?username:playerName,mmyy:mmyy||playerMmyy,pin:pin||syncPin,deviceId:syncDeviceId};
    fetch(METRIC_URL+'/sync/load',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(payload),
        keepalive:true
    }).then(function(r){return r.json();}).then(function(d){
        if(d&&d.ok&&d.data){
            if(replace)replaceSyncData(d.data);
            else mergeSyncData(d.data);
            if(typeof callback==='function')callback(true,d);
            // Reflect authoritative server state into local recovery-code flag.
            var serverFlag=(d.requiresRecoveryCodeSetup!==undefined
                ?d.requiresRecoveryCodeSetup
                :(d.data&&d.data.requiresRecoveryCodeSetup));
            if(serverFlag===false){
                try{localStorage.setItem('ndj_recoveryCodeSet','1');}catch(e){}
            }else if(serverFlag===true){
                try{localStorage.removeItem('ndj_recoveryCodeSet');}catch(e){}
            }
            if(serverFlag===true){
                setTimeout(function(){if(typeof maybeShowRecoveryCodeModal==='function')maybeShowRecoveryCodeModal();},800);
            }
        }else{
            if(typeof callback==='function')callback(false,d);
        }
    }).catch(function(){if(typeof callback==='function')callback(false,null);});
}

function setRecoveryCode(code,callback){
    if(!METRIC_URL||!syncRegistered||!syncPin||!playerMmyy){
        if(typeof callback==='function')callback(false,'not_signed_in');
        return;
    }
    var payload={username:playerName,mmyy:playerMmyy,pin:syncPin,recoveryCode:code};
    fetch(METRIC_URL+'/sync/set-recovery-code',{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),keepalive:true
    }).then(function(r){
        if(r.status===404){if(typeof callback==='function')callback(false,'not_supported');return null;}
        return r.json();
    }).then(function(d){
        if(d===null)return;
        if(d&&d.ok){
            try{localStorage.setItem('ndj_recoveryCodeSet','1');}catch(e){}
            if(typeof callback==='function')callback(true,d);
        }else{
            if(typeof callback==='function')callback(false,d&&d.error?d.error:'failed');
        }
    }).catch(function(){if(typeof callback==='function')callback(false,'network_error');});
}

function forgotSyncPin(username,mmyy,newPin,recoveryCode,callback){
    if(!METRIC_URL)return;
    var payload={username:mmyy?username:playerName,mmyy:mmyy||playerMmyy,newPin:newPin};
    if(recoveryCode&&typeof recoveryCode==='string'&&recoveryCode.trim().length>0){
        payload.recoveryCode=recoveryCode.trim();
    }
    fetch(METRIC_URL+'/sync/forgot-pin',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(payload),
        keepalive:true
    }).then(function(r){return r.json();}).then(function(d){
        if(d&&d.ok){
            syncPin=newPin;save('syncPin',syncPin);
            playerName=String(payload.username).toUpperCase();save('playerName',playerName);
            playerMmyy=String(payload.mmyy);save('playerMmyy',playerMmyy);
            syncRegistered=true;save('syncRegistered',true);
            if(typeof callback==='function')callback(true,d);
        }else{
            if(d&&d.error){
                if(d.error==='recovery_code_required'){if(typeof callback==='function')callback(false,'Your account is past the legacy window. Please enter a recovery code.');return;}
                if(d.error==='locked_out'){if(typeof callback==='function')callback(false,'Too many attempts. Please try again in 1 hour.');return;}
            }
            if(typeof callback==='function')callback(false,d&&d.error?d.error:'Failed');
        }
    }).catch(function(){if(typeof callback==='function')callback(false,'Network error');});
}

function changeSyncPin(oldPin,newPin,callback){
    if(!METRIC_URL||!syncRegistered||!playerMmyy)return;
    var payload={username:playerName,mmyy:playerMmyy,oldPin:oldPin,newPin:newPin};
    fetch(METRIC_URL+'/sync/change-pin',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(payload),
        keepalive:true
    }).then(function(r){return r.json();}).then(function(d){
        if(d&&d.ok){
            syncPin=newPin;save('syncPin',syncPin);
            if(typeof callback==='function')callback(true);
        }else{
            if(typeof callback==='function')callback(false,d&&d.error);
        }
    }).catch(function(){if(typeof callback==='function')callback(false,'network error');});
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
    if(!TIPS||!TIPS.length)return;
    var tip=TIPS[Math.floor(Math.random()*TIPS.length)];
    var el=$('npcAdvice');if(!el)return;
    el.innerHTML='<span class="npc-icon">\u2728</span><span class="npc-msg">'+tip+'</span>';
    el.classList.add('active');
    if(W._npcAdviceTimer)clearTimeout(W._npcAdviceTimer);
    W._npcAdviceTimer=setTimeout(function(){
        el.classList.remove('active');
        setTimeout(function(){el.style.display='';},400);
    }, 3500);
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
// Today play time tracker
var todayPlayDay=load('todayPlayDay','');
var todayPlayTime=load('todayPlayTime',0);
var _todayShort=getGameDayShort?getGameDayShort():'';
if(todayPlayDay!==_todayShort){todayPlayDay=_todayShort;todayPlayTime=0;save('todayPlayDay',todayPlayDay);save('todayPlayTime',todayPlayTime);}
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
var DEFAULT_CTRL_LAYOUT = {padX:20, padY:20, jSize:150, btnSize:80, jumpX:20, jumpY:20, jumpSize:80};
var ctrlLayouts = load('ctrlLayouts', null);
if(!ctrlLayouts || typeof ctrlLayouts!=='object'){
    // Migrate legacy single-orientation save (if any) into both layouts as starting point
    var legacy = {
        padX: cleanNumber(load('padX', 20), 20),
        padY: cleanNumber(load('padY', 20), 20),
        jSize: cleanNumber(load('jSize', 150), 150),
        btnSize: cleanNumber(load('btnSize', 80), 80),
        jumpX: cleanNumber(load('jumpX', 20), 20),
        jumpY: cleanNumber(load('jumpY', 20), 20),
        jumpSize: cleanNumber(load('jumpSize', 80), 80)
    };
    ctrlLayouts = {portrait:Object.assign({},legacy), landscape:Object.assign({},legacy)};
    save('ctrlLayouts', ctrlLayouts);
}
function currentLayoutKey(){if(orient==='portrait')return W.innerWidth >= W.innerHeight ? 'landscape' : 'portrait';return 'landscape';}
function loadCurrentCtrlLayout(){
    var key = currentLayoutKey();
    var layout = ctrlLayouts[key] || Object.assign({}, DEFAULT_CTRL_LAYOUT);
    padX = layout.padX; padY = layout.padY; jSize = layout.jSize; btnSize = layout.btnSize;
    jumpX = layout.jumpX || 20; jumpY = layout.jumpY || 20; jumpSize = layout.jumpSize || 80;
}
function saveCurrentCtrlLayout(){
    var key = currentLayoutKey();
    ctrlLayouts[key] = {padX:padX, padY:padY, jSize:jSize, btnSize:btnSize, jumpX:jumpX, jumpY:jumpY, jumpSize:jumpSize};
    save('ctrlLayouts', ctrlLayouts);
}
var jSize = 150;
var padX = 20;
var padY = 20;
var orient=load('orient','landscape');
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
// v1.1.42: ensure all players start with at least 2 free streak freezes
if(streakFreezes < maxStreakFreezes){
    streakFreezes = maxStreakFreezes;
    save('streakFreezes', streakFreezes);
}
var playDays = load('playDays', []);
var dailyCollection = load('dailyCollection', []);

function offsetDay(dayStr, offset){
    var y = parseInt(dayStr.slice(0,4),10), m = parseInt(dayStr.slice(4,6),10)-1, d = parseInt(dayStr.slice(6,8),10);
    var date = new Date(y,m,d);
    date.setDate(date.getDate()+offset);
    var yy = date.getFullYear(), mm = String(date.getMonth()+1).padStart(2,'0'), dd = String(date.getDate()).padStart(2,'0');
    return ''+yy+mm+dd;
}
function recordPlayDay(){
    var today = getGameDayShort();
    if(playDays.indexOf(today) === -1){
        playDays.push(today);
        playDays.sort();
        save('playDays', playDays);
    }
    return updateStreak();
}
function getCalendarDays(){
    var today = getGameDayShort();
    var frozenDays = load('frozenDays', []);
    var days = [];
    for(var i = -27; i <= 3; i++){
        var d = offsetDay(today, i);
        var isPlayed = playDays.indexOf(d) !== -1;
        var isFrozen = frozenDays.indexOf(d) !== -1;
        var prevD = i > -27 ? offsetDay(today, i-1) : null;
        var nextD = i < 3 ? offsetDay(today, i+1) : null;
        days.push({
            day: d, label: parseInt(d.slice(6,8),10),
            isToday: i === 0, isFuture: i > 0,
            isPlayed: isPlayed, isFrozen: isFrozen,
            hasPrev: prevD && playDays.indexOf(prevD) !== -1,
            hasNext: nextD && playDays.indexOf(nextD) !== -1
        });
    }
    return days;
}

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
function getChestDayKey(ts){
    var d = new Date((ts||0) + (7 * 60 * 60 * 1000));
    var h = d.getUTCHours();
    if(h < 5) d = new Date(d.getTime() - 86400000);
    var y = d.getUTCFullYear();
    var m = String(d.getUTCMonth()+1).padStart(2,'0');
    var day = String(d.getUTCDate()).padStart(2,'0');
    return y + m + day;
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
            if(canSave > 0){
                var frozenDays = load('frozenDays', []);
                for(var fi = 1; fi <= canSave; fi++){
                    var fd = offsetDay(lastStreakDay, fi);
                    if(frozenDays.indexOf(fd) === -1 && playDays.indexOf(fd) === -1){
                        frozenDays.push(fd);
                    }
                }
                var cutoff = offsetDay(today, -90);
                frozenDays = frozenDays.filter(function(d){ return d >= cutoff; });
                save('frozenDays', frozenDays);
            }
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
function generateDailyLevel(dateKey, forcedRankIdx){
    var today = dateKey || getGameDayKey();
    var ymd = today.slice(0, 8);
    var dmy = today.slice(8, 16);
    var mdy = ymd.slice(4, 6) + ymd.slice(6, 8) + ymd.slice(0, 4);
    
    var rankInfo = getPlayerRankInfo();
    var rankIdx = (forcedRankIdx !== undefined) ? forcedRankIdx : rankInfo.index;
    if(rankIdx < 0) rankIdx = 0;
    
    var s1 = ymd + rankIdx;
    var s2 = dmy + rankIdx;
    var s3 = mdy + rankIdx;
    
    var customTheme = buildDailyTheme(s1, s2, s3);
    
    // 5 independent hashes for much more day-to-day variety
    var hPlats = hashString('P' + s1);
    var hGap   = hashString('G' + s2);
    var hHc    = hashString('H' + s3);
    var hMove  = hashString('M' + s1 + s2);
    var hSpec  = hashString('S' + s3 + s1);
    var hLayout = hashString('L' + s2 + s3);
    
    // Base layout type pool
    var layoutPool = ['wave','clusters','stairs','islands'];
    var layoutType = layoutPool[hLayout % layoutPool.length];
    
    // ~25% chance for a special layout override
    var specialRoll = (hSpec % 100) < 25;
    if(specialRoll){
        var specials = ['gaps','vertical','dense'];
        layoutType = specials[hSpec % specials.length];
    }
    
    var basePlats = 18 + (hPlats % 18);      // wider range: 18-35
    var baseGapMin = 85 + (hGap % 30);       // wider range: 85-114
    var baseGapMax = 125 + (hGap % 70);      // wider range: 125-194
    var baseHc = 30 + (hHc % 110);           // wider range: 30-139
    var baseMove = hMove % 5;                // wider range: 0-4
    
    var plats = Math.max(15, basePlats + rankIdx * 2);
    var gapMin = Math.max(70, baseGapMin + rankIdx * 5);
    var gapMax = Math.max(gapMin + 20, baseGapMax + rankIdx * 8);
    var hc = Math.max(20, baseHc + rankIdx * 12);
    var move = Math.max(0, baseMove + Math.floor(rankIdx / 2));
    var diff = rankIdx < 2 ? 'SIMPLE' : rankIdx < 4 ? 'MODERATE' : 'HARD';
    
    // Adjust params for special layouts
    if(layoutType === 'gaps'){
        gapMin = Math.max(110, gapMin + 25);
        gapMax = Math.max(gapMin + 30, gapMax + 35);
        move = Math.max(2, move);
    }else if(layoutType === 'vertical'){
        hc = Math.max(70, hc + 35);
        gapMin = Math.max(55, gapMin - 18);
        gapMax = Math.max(gapMin + 10, gapMax - 12);
    }else if(layoutType === 'dense'){
        plats = Math.max(22, plats + 7);
        gapMin = Math.max(45, gapMin - 22);
        gapMax = Math.max(gapMin + 15, gapMax - 28);
        move = Math.max(1, move + 1);
    }
    
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
        reversed: true,
        dateKey: today,
        rankIdx: rankIdx,
        layoutType: layoutType
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
    if(typeof parsed.orient==='string'){orient=parsed.orient;save('orient',orient);}
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
