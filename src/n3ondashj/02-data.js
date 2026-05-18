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
