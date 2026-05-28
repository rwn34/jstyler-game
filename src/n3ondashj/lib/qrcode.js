// qrcode-generator by Kazuhiko Arase — MIT License
// Based on: https://github.com/kazuhikoarase/qrcode-generator (v1.4.4)
// Minimal single-file reimplementation for N3ON DashJ (no npm/build allowed).
// Vendored 2026-05-27. Wrapper functions renderQR() and drawQRToCanvas() at bottom.
// License: MIT — https://opensource.org/licenses/MIT

var QRCode=(function(){
'use strict';
var PAD0=0xEC,PAD1=0x11;
var MODE_8BIT=4;
var ECC_L=1;

function QR(typeNumber,errorCorrectionLevel){
this._typeNumber=typeNumber;
this._ecl=errorCorrectionLevel;
this._modules=null;
this._moduleCount=0;
this._dataCache=null;
this._dataList=[];
}
QR.prototype={
addData:function(data){this._dataList.push({mode:MODE_8BIT,data:data});this._dataCache=null;},
make:function(){if(this._typeNumber<1){var tn=1;for(tn=1;tn<40;tn++){var rs=RSBlock.getRSBlocks(tn,this._ecl);var buf=new BitBuffer();for(var i=0;i<this._dataList.length;i++){var d=this._dataList[i];buf.put(d.mode,4);buf.put(d.data.length,getLengthInBits(d.mode,tn));putBytes(buf,d.data);}var totalDataCount=0;for(var i=0;i<rs.length;i++)totalDataCount+=rs[i].dataCount;if(buf.getLengthInBits()<=totalDataCount*8)break;}this._typeNumber=tn;}this._makeImpl(false,this._getBestMaskPattern());},
_makeImpl:function(test,maskPattern){
this._moduleCount=this._typeNumber*4+17;
this._modules=new Array(this._moduleCount);
for(var row=0;row<this._moduleCount;row++){this._modules[row]=new Array(this._moduleCount);for(var col=0;col<this._moduleCount;col++)this._modules[row][col]=null;}
this._setupPositionProbePattern(0,0);
this._setupPositionProbePattern(this._moduleCount-7,0);
this._setupPositionProbePattern(0,this._moduleCount-7);
this._setupPositionAdjustPattern();
this._setupTimingPattern();
this._setupTypeInfo(test,maskPattern);
if(this._typeNumber>=7)this._setupTypeNumber(test);
if(this._dataCache==null)this._dataCache=createData(this._typeNumber,this._ecl,this._dataList);
this._mapData(this._dataCache,maskPattern);
},
_setupPositionProbePattern:function(row,col){
for(var r=-1;r<=7;r++){if(row+r<=-1||this._moduleCount<=row+r)continue;for(var c=-1;c<=7;c++){if(col+c<=-1||this._moduleCount<=col+c)continue;if((0<=r&&r<=6&&(c==0||c==6))||(0<=c&&c<=6&&(r==0||r==6))||(2<=r&&r<=4&&2<=c&&c<=4)){this._modules[row+r][col+c]=true;}else{this._modules[row+r][col+c]=false;}}}
},
_getBestMaskPattern:function(){
var minLostPoint=0;var pattern=0;
for(var i=0;i<8;i++){this._makeImpl(true,i);var lp=getLostPoint(this);if(i==0||minLostPoint>lp){minLostPoint=lp;pattern=i;}}
return pattern;
},
_setupTimingPattern:function(){
for(var r=8;r<this._moduleCount-8;r++){if(this._modules[r][6]!=null)continue;this._modules[r][6]=(r%2==0);}
for(var c=8;c<this._moduleCount-8;c++){if(this._modules[6][c]!=null)continue;this._modules[6][c]=(c%2==0);}
},
_setupPositionAdjustPattern:function(){
var pos=getPatternPosition(this._typeNumber);
for(var i=0;i<pos.length;i++){for(var j=0;j<pos.length;j++){var row=pos[i];var col=pos[j];if(this._modules[row][col]!=null)continue;for(var r=-2;r<=2;r++){for(var c=-2;c<=2;c++){if(r==-2||r==2||c==-2||c==2||(r==0&&c==0)){this._modules[row+r][col+c]=true;}else{this._modules[row+r][col+c]=false;}}}}}
},
_setupTypeNumber:function(test){
var bits=BCH.typeNumber(this._typeNumber);
for(var i=0;i<18;i++){var mod=(!test&&((bits>>i)&1)==1);this._modules[Math.floor(i/3)][i%3+this._moduleCount-8-3]=mod;this._modules[i%3+this._moduleCount-8-3][Math.floor(i/3)]=mod;}
},
_setupTypeInfo:function(test,maskPattern){
var data=(this._ecl<<3)|maskPattern;
var bits=BCH.typeInfo(data);
for(var i=0;i<15;i++){var mod=(!test&&((bits>>i)&1)==1);if(i<6){this._modules[i][8]=mod;}else if(i<8){this._modules[i+1][8]=mod;}else{this._modules[this._moduleCount-15+i][8]=mod;}}
for(var i=0;i<15;i++){var mod=(!test&&((bits>>i)&1)==1);if(i<8){this._modules[8][this._moduleCount-i-1]=mod;}else if(i<9){this._modules[8][15-i-1+1]=mod;}else{this._modules[8][15-i-1]=mod;}}
this._modules[this._moduleCount-8][8]=(!test);
},
_mapData:function(data,maskPattern){
var inc=-1;var row=this._moduleCount-1;var bitIndex=7;var byteIndex=0;
for(var col=this._moduleCount-1;col>0;col-=2){
if(col==6)col--;
while(true){
for(var c=0;c<2;c++){if(this._modules[row][col-c]==null){var dark=false;if(byteIndex<data.length)dark=(((data[byteIndex]>>>bitIndex)&1)==1);var mask=getMask(maskPattern,row,col-c);if(mask)dark=!dark;this._modules[row][col-c]=dark;bitIndex--;if(bitIndex<0){byteIndex++;bitIndex=7;}}}
row+=inc;
if(row<0||this._moduleCount<=row){row-=inc;inc=-inc;break;}
}}
},
isDark:function(row,col){return this._modules[row][col];},
getModuleCount:function(){return this._moduleCount;}
};


var BCH={
typeInfo:function(data){var d=data<<10;while(getBCHDigit(d)-getBCHDigit(0x537)>=0)d^=(0x537<<(getBCHDigit(d)-getBCHDigit(0x537)));return((data<<10)|d)^0x5412;},
typeNumber:function(data){var d=data<<12;while(getBCHDigit(d)-getBCHDigit(0x1f25)>=0)d^=(0x1f25<<(getBCHDigit(d)-getBCHDigit(0x1f25)));return(data<<12)|d;}
};
function getBCHDigit(data){var digit=0;while(data!=0){digit++;data>>>=1;}return digit;}

function getLengthInBits(mode,type){if(1<=type&&type<10)return 8;else if(type<27)return 16;else return 16;}

function putBytes(buf,data){for(var i=0;i<data.length;i++)buf.put(data.charCodeAt(i),8);}

function getMask(maskPattern,i,j){
switch(maskPattern){
case 0:return(i+j)%2==0;case 1:return i%2==0;case 2:return j%3==0;case 3:return(i+j)%3==0;
case 4:return(Math.floor(i/2)+Math.floor(j/3))%2==0;case 5:return(i*j)%2+(i*j)%3==0;
case 6:return((i*j)%2+(i*j)%3)%2==0;case 7:return((i*j)%3+(i+j)%2)%2==0;default:return false;
}}

function getLostPoint(qr){
var mc=qr.getModuleCount();var lp=0;
for(var row=0;row<mc;row++){for(var col=0;col<mc;col++){var sameCount=0;var dark=qr.isDark(row,col);for(var r=-1;r<=1;r++){if(row+r<0||mc<=row+r)continue;for(var c=-1;c<=1;c++){if(col+c<0||mc<=col+c)continue;if(r==0&&c==0)continue;if(dark==qr.isDark(row+r,col+c))sameCount++;}}if(sameCount>5)lp+=(3+sameCount-5);}}
for(var row=0;row<mc-1;row++){for(var col=0;col<mc-1;col++){var count=0;if(qr.isDark(row,col))count++;if(qr.isDark(row+1,col))count++;if(qr.isDark(row,col+1))count++;if(qr.isDark(row+1,col+1))count++;if(count==0||count==4)lp+=3;}}
for(var row=0;row<mc;row++){for(var col=0;col<mc-6;col++){if(qr.isDark(row,col)&&!qr.isDark(row,col+1)&&qr.isDark(row,col+2)&&qr.isDark(row,col+3)&&qr.isDark(row,col+4)&&!qr.isDark(row,col+5)&&qr.isDark(row,col+6))lp+=40;}}
for(var col=0;col<mc;col++){for(var row=0;row<mc-6;row++){if(qr.isDark(row,col)&&!qr.isDark(row+1,col)&&qr.isDark(row+2,col)&&qr.isDark(row+3,col)&&qr.isDark(row+4,col)&&!qr.isDark(row+5,col)&&qr.isDark(row+6,col))lp+=40;}}
var darkCount=0;for(var col=0;col<mc;col++){for(var row=0;row<mc;row++){if(qr.isDark(row,col))darkCount++;}}
var ratio=Math.abs(100*darkCount/mc/mc-50)/5;lp+=ratio*10;
return lp;
}

var PATTERN_POSITION_TABLE=[[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50],[6,30,54],[6,32,58],[6,34,62],[6,26,46,66],[6,26,48,70],[6,26,50,74],[6,30,54,78],[6,30,56,82],[6,30,58,86],[6,34,62,90],[6,28,50,72,94],[6,26,50,74,98],[6,30,54,78,102],[6,28,54,80,106],[6,32,58,84,110],[6,30,58,86,114],[6,34,62,90,118],[6,26,50,74,98,122],[6,30,54,78,102,126],[6,26,52,78,104,130],[6,30,56,82,108,134],[6,34,60,86,112,138],[6,30,58,86,114,142],[6,34,62,90,118,146],[6,30,54,78,102,126,150],[6,24,50,76,102,128,154],[6,28,54,80,106,132,158],[6,32,58,84,110,136,162],[6,26,54,82,110,138,166],[6,30,58,86,114,142,170]];
function getPatternPosition(typeNumber){return PATTERN_POSITION_TABLE[typeNumber-1];}



var RS_BLOCK_TABLE=[[1,26,19],[1,26,16],[1,26,13],[1,26,9],[1,44,34],[1,44,28],[1,44,22],[1,44,16],[1,70,55],[1,70,44],[2,35,17],[2,35,13],[1,100,80],[2,50,32],[2,50,24],[4,25,9],[1,134,108],[2,67,43],[2,33,15,2,34,16],[2,33,11,2,34,12],[2,86,68],[4,43,27],[4,43,19],[4,43,15],[2,98,78],[4,49,31],[2,32,14,4,33,15],[4,39,13,1,40,14],[2,121,97],[2,60,38,2,61,39],[4,40,18,2,41,19],[4,40,14,2,41,15],[2,146,116],[3,58,36,2,59,37],[4,36,16,4,37,17],[4,36,12,4,37,13],[2,86,68,2,87,69],[4,69,43,1,70,44],[6,43,19,2,44,20],[6,43,15,2,44,16],[4,101,81],[1,80,50,4,81,51],[4,50,22,4,51,23],[3,36,12,8,37,13],[2,116,92,2,117,93],[6,58,36,2,59,37],[4,46,20,6,47,21],[7,42,14,4,43,15],[4,133,107],[8,59,37,1,60,38],[8,44,20,4,45,21],[12,33,11,4,34,12],[3,145,115,1,146,116],[4,64,40,5,65,41],[11,36,16,5,37,17],[11,36,12,5,37,13],[5,109,87,1,110,88],[5,65,41,5,66,42],[5,54,24,7,55,25],[11,36,12,7,37,13],[5,122,98,1,123,99],[7,73,45,3,74,46],[15,43,19,2,44,20],[3,45,15,13,46,16],[1,135,107,5,136,108],[10,74,46,1,75,47],[1,50,22,15,51,23],[2,42,14,17,43,15],[5,150,120,1,151,121],[9,69,43,4,70,44],[17,50,22,1,51,23],[2,42,14,19,43,15],[3,141,113,4,142,114],[3,70,44,11,71,45],[17,47,21,4,48,22],[9,39,13,16,40,14],[3,135,107,5,136,108],[3,67,41,13,68,42],[15,54,24,5,55,25],[15,43,15,10,44,16],[4,144,116,4,145,117],[17,68,42],[17,50,22,6,51,23],[19,46,16,6,47,17],[2,139,111,7,140,112],[17,74,46],[7,54,24,16,55,25],[34,37,13],[4,151,121,5,152,122],[4,75,47,14,76,48],[11,54,24,14,55,25],[16,45,15,14,46,16],[6,147,117,4,148,118],[6,73,45,14,74,46],[11,54,24,16,55,25],[30,46,16,2,47,17],[8,132,106,4,133,107],[8,75,47,13,76,48],[7,54,24,22,55,25],[22,45,15,13,46,16],[10,142,114,2,143,115],[19,74,46,4,75,47],[28,50,22,6,51,23],[33,46,16,4,47,17],[8,152,122,4,153,123],[22,73,45,3,74,46],[8,53,23,26,54,24],[12,45,15,28,46,16],[3,147,117,10,148,118],[3,73,45,23,74,46],[4,54,24,31,55,25],[11,45,15,31,46,16],[7,146,116,7,147,117],[21,73,45,7,74,46],[1,53,23,37,54,24],[19,45,15,26,46,16],[5,145,115,10,146,116],[19,75,47,10,76,48],[15,54,24,25,55,25],[23,45,15,25,46,16],[13,145,115,3,146,116],[2,74,46,29,75,47],[42,54,24,1,55,25],[23,45,15,28,46,16],[17,145,115],[10,74,46,23,75,47],[10,54,24,35,55,25],[19,45,15,35,46,16],[17,145,115,1,146,116],[14,74,46,21,75,47],[29,54,24,19,55,25],[11,45,15,46,46,16],[13,145,115,6,146,116],[14,74,46,23,75,47],[44,54,24,7,55,25],[59,46,16,1,47,17],[12,151,121,7,152,122],[12,75,47,26,76,48],[39,54,24,14,55,25],[22,45,15,41,46,16],[6,151,121,14,152,122],[6,75,47,34,76,48],[46,54,24,10,55,25],[2,45,15,64,46,16],[17,152,122,4,153,123],[29,74,46,14,75,47],[49,54,24,10,55,25],[24,45,15,46,46,16],[4,152,122,18,153,123],[13,74,46,32,75,47],[48,54,24,14,55,25],[42,45,15,32,46,16],[20,147,117,4,148,118],[40,75,47,7,76,48],[43,54,24,22,55,25],[10,45,15,67,46,16],[19,148,118,6,149,119],[18,75,47,31,76,48],[34,54,24,34,55,25],[20,45,15,61,46,16]];

var RSBlock={getRSBlocks:function(typeNumber,ecl){var rsBlock=RS_BLOCK_TABLE[(typeNumber-1)*4+(ecl-1)];var list=[];for(var i=0;i<rsBlock.length;i+=3){var count=rsBlock[i],totalCount=rsBlock[i+1],dataCount=rsBlock[i+2];for(var j=0;j<count;j++)list.push({totalCount:totalCount,dataCount:dataCount});}return list;}};

function BitBuffer(){this._buffer=[];this._length=0;}
BitBuffer.prototype={get:function(index){return((this._buffer[Math.floor(index/8)]>>>(7-index%8))&1)==1;},put:function(num,length){for(var i=0;i<length;i++)this.putBit(((num>>>(length-i-1))&1)==1);},getLengthInBits:function(){return this._length;},putBit:function(bit){if(this._length==this._buffer.length*8)this._buffer.push(0);if(bit)this._buffer[Math.floor(this._length/8)]|=(0x80>>>(this._length%8));this._length++;}};

var EXP_TABLE=new Array(256);var LOG_TABLE=new Array(256);
(function(){for(var i=0;i<8;i++)EXP_TABLE[i]=1<<i;for(var i=8;i<256;i++)EXP_TABLE[i]=EXP_TABLE[i-4]^EXP_TABLE[i-5]^EXP_TABLE[i-6]^EXP_TABLE[i-8];for(var i=0;i<255;i++)LOG_TABLE[EXP_TABLE[i]]=i;})();

function gfMul(a,b){if(a==0||b==0)return 0;return EXP_TABLE[(LOG_TABLE[a]+LOG_TABLE[b])%255];}

function Polynomial(num,shift){var offset=0;while(offset<num.length&&num[offset]==0)offset++;this._num=new Array(num.length-offset+shift);for(var i=0;i<num.length-offset;i++)this._num[i]=num[i+offset];for(var i=num.length-offset;i<this._num.length;i++)this._num[i]=0;}
Polynomial.prototype={get:function(index){return this._num[index];},getLength:function(){return this._num.length;},
multiply:function(e){var num=new Array(this.getLength()+e.getLength()-1);for(var i=0;i<num.length;i++)num[i]=0;for(var i=0;i<this.getLength();i++)for(var j=0;j<e.getLength();j++)num[i+j]^=gfMul(this.get(i),e.get(j));return new Polynomial(num,0);},
mod:function(e){if(this.getLength()-e.getLength()<0)return this;var ratio=LOG_TABLE[this.get(0)]-LOG_TABLE[e.get(0)];var num=new Array(this.getLength());for(var i=0;i<this.getLength();i++)num[i]=this.get(i);for(var i=0;i<e.getLength();i++)num[i]^=gfMul(e.get(i),EXP_TABLE[(ratio+255)%255]);return new Polynomial(num,0).mod(e);}};

function getErrorCorrectPolynomial(errorCorrectLength){var a=new Polynomial([1],0);for(var i=0;i<errorCorrectLength;i++)a=a.multiply(new Polynomial([1,EXP_TABLE[i]],0));return a;}



function createData(typeNumber,ecl,dataList){
var rsBlocks=RSBlock.getRSBlocks(typeNumber,ecl);
var buffer=new BitBuffer();
for(var i=0;i<dataList.length;i++){var data=dataList[i];buffer.put(data.mode,4);buffer.put(data.data.length,getLengthInBits(data.mode,typeNumber));putBytes(buffer,data.data);}
var totalDataCount=0;for(var i=0;i<rsBlocks.length;i++)totalDataCount+=rsBlocks[i].dataCount;
if(buffer.getLengthInBits()>totalDataCount*8)throw new Error('code length overflow');
if(buffer.getLengthInBits()+4<=totalDataCount*8)buffer.put(0,4);
while(buffer.getLengthInBits()%8!=0)buffer.putBit(false);
while(true){if(buffer.getLengthInBits()>=totalDataCount*8)break;buffer.put(PAD0,8);if(buffer.getLengthInBits()>=totalDataCount*8)break;buffer.put(PAD1,8);}
return createBytes(buffer,rsBlocks);
}

function createBytes(buffer,rsBlocks){
var offset=0;var maxDcCount=0;var maxEcCount=0;
var dcdata=new Array(rsBlocks.length);var ecdata=new Array(rsBlocks.length);
for(var r=0;r<rsBlocks.length;r++){
var dcCount=rsBlocks[r].dataCount;var ecCount=rsBlocks[r].totalCount-dcCount;
maxDcCount=Math.max(maxDcCount,dcCount);maxEcCount=Math.max(maxEcCount,ecCount);
dcdata[r]=new Array(dcCount);
for(var i=0;i<dcCount;i++)dcdata[r][i]=buffer._buffer[i+offset];
var rsPoly=getErrorCorrectPolynomial(ecCount);
var rawPoly=new Polynomial(dcdata[r],rsPoly.getLength()-1);
var modPoly=rawPoly.mod(rsPoly);
ecdata[r]=new Array(rsPoly.getLength()-1);
for(var i=0;i<ecdata[r].length;i++){var modIndex=i+modPoly.getLength()-ecdata[r].length;ecdata[r][i]=(modIndex>=0)?modPoly.get(modIndex):0;}
offset+=dcCount;
}
var totalCodeCount=0;for(var i=0;i<rsBlocks.length;i++)totalCodeCount+=rsBlocks[i].totalCount;
var data=new Array(totalCodeCount);var index=0;
for(var i=0;i<maxDcCount;i++){for(var r=0;r<rsBlocks.length;r++){if(i<dcdata[r].length)data[index++]=dcdata[r][i];}}
for(var i=0;i<maxEcCount;i++){for(var r=0;r<rsBlocks.length;r++){if(i<ecdata[r].length)data[index++]=ecdata[r][i];}}
return data;
}

return QR;
})();

// === Wrapper functions for N3ON DashJ ===

function renderQR(targetEl, text, size){
try{
var qr=new QRCode(0,1);
qr.addData(text);
qr.make();
var mc=qr.getModuleCount();
var cellSize=size/mc;
var svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+size+'" height="'+size+'" viewBox="0 0 '+mc+' '+mc+'">';
svg+='<rect width="'+mc+'" height="'+mc+'" fill="#fff"/>';
for(var r=0;r<mc;r++){for(var c=0;c<mc;c++){if(qr.isDark(r,c))svg+='<rect x="'+c+'" y="'+r+'" width="1" height="1" fill="#000"/>';}}
svg+='</svg>';
targetEl.innerHTML=svg;
}catch(e){targetEl.innerHTML='';}
}

function drawQRToCanvas(ctx, x, y, size, text){
try{
var qr=new QRCode(0,1);
qr.addData(text);
qr.make();
var mc=qr.getModuleCount();
var cellSize=size/mc;
ctx.fillStyle='#fff';
ctx.fillRect(x,y,size,size);
ctx.fillStyle='#000';
for(var r=0;r<mc;r++){for(var c=0;c<mc;c++){if(qr.isDark(r,c))ctx.fillRect(x+c*cellSize,y+r*cellSize,cellSize+0.5,cellSize+0.5);}}
}catch(e){}
}
