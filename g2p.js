// Client-side English g2p — port of MeloTTS clean_text(text,"EN").
// CMUdict path is bit-exact with the Python pipeline; OOV words use a compact letter-to-sound fallback.
let CMU=null, SID=null;
export async function loadG2P(){
  CMU=await (await fetch('assets/cmudict.json')).json();
  SID=await (await fetch('assets/sid.json')).json();
}
const ABBR=[['mrs','misess'],['mr','mister'],['dr','doctor'],['st','saint'],['co','company'],['jr','junior'],['maj','major'],['gen','general'],['drs','doctors'],['rev','reverend'],['lt','lieutenant'],['hon','honorable'],['sgt','sergeant'],['capt','captain'],['esq','esquire'],['ltd','limited'],['col','colonel'],['ft','fort']];
const ONES=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const TENS=['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
function n3(n){let s='';if(n>=100){s+=ONES[Math.floor(n/100)]+' hundred';n%=100;if(n)s+=' ';}if(n>=20){s+=TENS[Math.floor(n/10)];if(n%10)s+='-'+ONES[n%10];}else if(n>0)s+=ONES[n];return s;}
function num2words(x){let n=parseInt(x,10);if(isNaN(n))return x;if(n===0)return'zero';const sc=['','thousand','million','billion'];let p=[],i=0;while(n>0){const c=n%1000;if(c)p.unshift(n3(c)+(sc[i]?' '+sc[i]:''));n=Math.floor(n/1000);i++;}return p.join(' ');}
function normalize(text){
  text=text.toLowerCase();
  for(const [a,b] of ABBR) text=text.replace(new RegExp('\\b'+a+'\\.','gi'),b);
  text=text.replace(/\d[\d,]*/g,m=>num2words(m.replace(/,/g,'')));
  return text;
}
function refine(phn){let tone=0;if(/\d$/.test(phn)){tone=parseInt(phn.slice(-1))+1;phn=phn.slice(0,-1);}return [phn.toLowerCase(),tone];}
function postId(ph){if(ph==='v')ph='V';return (ph in SID)?SID[ph]:SID['UNK'];}
const REP={';':',','：':',','，':',','。':'.','！':'!','？':'?','·':',','、':','};
const LTS={'th':'th','sh':'sh','ch':'ch','ph':'f','ck':'k','ng':'ng','wh':'w','qu':'k w','oo':'uw','ee':'iy','ea':'iy','ai':'ey','ay':'ey','ou':'aw','ow':'aw','oi':'oy','oy':'oy','oa':'ow',
  'a':'ae','e':'eh','i':'ih','o':'aa','u':'ah','y':'iy','b':'b','c':'k','d':'d','f':'f','g':'g','h':'hh','j':'jh','k':'k','l':'l','m':'m','n':'n','p':'p','q':'k','r':'r','s':'s','t':'t','v':'v','w':'w','x':'k s','z':'z'};
function ltsFallback(w){let i=0,out=[];while(i<w.length){const two=w.slice(i,i+2);if(LTS[two]){for(const p of LTS[two].split(' '))out.push([p,0]);i+=2;}else{const o=w[i];if(LTS[o])for(const p of LTS[o].split(' '))out.push([p,0]);i++;}}return out;}
export function g2pJS(text){
  const norm=normalize(text);
  const toks=norm.match(/[a-z]+|'|\.\.\.|[,.!?;:\-…]/g)||[];   // apostrophe is its own token (matches BERT tokenizer)
  const ph=[SID['_']], to=[0];
  for(const t of toks){
    if(/^[a-z]+$/.test(t)){
      const key=t.toUpperCase();
      if(CMU[key]){ for(const a of CMU[key]){ const [p,tn]=refine(a); ph.push(postId(p)); to.push(tn); } }
      else { for(const [p,tn] of ltsFallback(t)){ ph.push(postId(p)); to.push(tn); } }
    } else {
      let m=t==='...'?'…':(REP[t]||t); ph.push(postId(m)); to.push(0);
    }
  }
  ph.push(SID['_']); to.push(0);
  return {ph,to,norm};
}
