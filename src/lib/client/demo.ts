import { defaultControls, type ChatMessage, type Playlist, type PlaylistControls, type SavedMood, type ThemeConfig, type Vibe, type Track } from "@/lib/contracts";

export const DEMO_STORAGE_KEY = "dsh-music:guest:v1";
export const themes: ThemeConfig[] = [
 {name:"Lavender dusk",mode:"dark",background:"#101019",surface:"#252333",text:"#f3f0fa",accent:"#c7b4f3",gradientFrom:"#352c50",gradientTo:"#202735",blur:24,opacity:.55,radius:24,shadow:.25,borderOpacity:.1,gradientAngle:135,motion:true},
 {name:"Morning light",mode:"light",background:"#f4f0f6",surface:"#ffffff",text:"#262032",accent:"#7b57a9",gradientFrom:"#e5d3ef",gradientTo:"#d9e8e5",blur:24,opacity:.6,radius:24,shadow:.12,borderOpacity:.16,gradientAngle:135,motion:true},
 {name:"Quiet graphite",mode:"dark",background:"#121315",surface:"#24272a",text:"#f4f4f3",accent:"#c5d9c7",gradientFrom:"#222527",gradientTo:"#18191b",blur:16,opacity:.7,radius:20,shadow:.2,borderOpacity:.12,gradientAngle:145,motion:true},
 {name:"Soft paper",mode:"light",background:"#efeee9",surface:"#ffffff",text:"#292b27",accent:"#577562",gradientFrom:"#e7e5de",gradientTo:"#f7f6f1",blur:16,opacity:.65,radius:20,shadow:.1,borderOpacity:.15,gradientAngle:135,motion:true},
];

const samples: [string,string,string][] = [
 ["bpOSxM0rNPM","Do I Wanna Know?","Arctic Monkeys"],["p4zluA60hjs","Space Song","Beach House"],["0J2QdDbelmY","The Less I Know The Better","Tame Impala"],["hTWKbfoikeg","Smells Like Teen Spirit","Nirvana"],["4NRXx6U8ABQ","Blinding Lights","The Weeknd"],["RBumgq5yVrA","Let Her Go","Passenger"],["ktvTqknDobU","Radioactive","Imagine Dragons"],["hT_nvWreIhg","Counting Stars","OneRepublic"],["fLexgOxsZu0","The Lazy Song","Bruno Mars"],["CevxZvSJLk8","Roar","Katy Perry"],["09R8_2nJtjg","Sugar","Maroon 5"],["OPf0YbXqDm0","Uptown Funk","Mark Ronson ft. Bruno Mars"],["kXYiU_JCYtU","Numb","Linkin Park"],["eVTXPUF4Oz4","In The End","Linkin Park"],["YQHsXMglC9A","Hello","Adele"],["rYEDA3JcQqw","Rolling in the Deep","Adele"],["60ItHLz5WEA","Faded","Alan Walker"],["fJ9rUzIMcZQ","Bohemian Rhapsody","Queen"],["btPJPFnesV4","Eye of the Tiger","Survivor"],["Zi_XLOBDo_Y","Billie Jean","Michael Jackson"],["dQw4w9WgXc","Never Gonna Give You Up","Rick Astley"],["kJQP7kiw5Fk","Despacito","Luis Fonsi"],["JGwWNGJdvx8","Shape of You","Ed Sheeran"],["lp-EO5I60KA","Thinking Out Loud","Ed Sheeran"],["RgKAFK5djSk","See You Again","Wiz Khalifa ft. Charlie Puth"],["09R8_2nJtjg","Sugar","Maroon 5"],["9bZkp7q19f0","Gangnam Style","PSY"],["L_jWHffIx5E","All Star","Smash Mouth"],["6Ejga4kJUts","Zombie","The Cranberries"],["A_MjCqQoLLA","Hey Jude","The Beatles"],["1w7OgIMMRc4","Sweet Child O' Mine","Guns N' Roses"],["v2AC41dglnM","Thunderstruck","AC/DC"],["YykjpeuMNEk","Hymn for the Weekend","Coldplay"],["k4V3Mo61fJM","Paradise","Coldplay"],["dvgZkm1xWPE","Viva La Vida","Coldplay"],["nfs8NYg7yQM","Attention","Charlie Puth"],
];
export const catalog: Track[] = samples.filter((item,index,all)=>all.findIndex(other=>other[0]===item[0])===index).map(([videoId,title,artist],index)=>({id:videoId,videoId,title,artist,thumbnail:`https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,duration:180+index*7,reason:"A track from the demo sample catalogue.",origin:index%4===0?"discovery":"familiar",feedback:0,available:true}));

export interface DemoState { messages:ChatMessage[]; vibe:Vibe; controls:PlaylistControls; history:Playlist[]; moods:SavedMood[]; theme:ThemeConfig; draft:Playlist|null; }
export const initialVibe: Vibe = {name:"A little room to breathe",description:"Warm sounds, a slower pace, and a little room for something new.",tags:["Reflective","Warm","Unhurried"],energy:45,artists:[],genres:[]};
export const initialDemo: DemoState = {messages:[],vibe:initialVibe,controls:defaultControls,history:[],moods:[],theme:themes[0],draft:null};
export const uid = () => crypto.randomUUID();

export function inferDemoVibe(messages:ChatMessage[], fallback:Vibe): Vibe {
 const text = messages.filter(m=>m.role==="user").map(m=>m.content).join(" ");
 const energetic = /ener|gym|run|dance|moving|party|бадьор|танц|спорт|біг|двиг|ruch|bieg/i.test(text);
 const focus = /focus|work|study|read|зосеред|робот|навчан|сосред|работ|уч[её]б|skup|prac|nauk/i.test(text);
 const artists = [...new Set(catalog.filter(track=>text.toLowerCase().includes(track.artist.toLowerCase())).map(track=>track.artist))];
 return {...fallback,name:energetic?"A little more alive":focus?"In my own little world":"A little room to breathe",description:text.slice(-500),energy:energetic?80:focus?30:45,artists,tags:energetic?["Electric","Bright","Forward"]:focus?["Focused","Soft","Flowing"]:["Reflective","Warm","Unhurried"]};
}

export function generateDemo(vibe:Vibe, controls:PlaylistControls, seed=0):Playlist {
 const excluded = controls.excludeArtists.map(v=>v.toLowerCase());
 const pool = catalog.filter(track=>!excluded.some(name=>track.artist.toLowerCase().includes(name)));
 const rotated = [...pool.slice(seed%pool.length),...pool.slice(0,seed%pool.length)];
 const preferred = [...vibe.artists,...controls.includeArtists].map(a=>a.toLowerCase());
 rotated.sort((a,b)=>Number(preferred.some(name=>b.artist.toLowerCase().includes(name)))-Number(preferred.some(name=>a.artist.toLowerCase().includes(name))));
 const tracks = rotated.slice(0,30).map(track=>({...track,feedback:0,origin:preferred.some(name=>track.artist.toLowerCase().includes(name))?"familiar" as const:"discovery" as const}));
 const date=new Date().toISOString();
 return {id:uid(),title:vibe.name,description:vibe.description,vibe:structuredClone(vibe),controls:structuredClone(controls),tracks,createdAt:date,updatedAt:date,version:1,status:"draft",resolutionStatus:tracks.length===30?"complete":"partial",feedback:0};
}

export function themeStyle(theme:ThemeConfig):Record<string,string> {
 return {"--bg":theme.background,"--surface":theme.surface,"--text":theme.text,"--accent":theme.accent,"--gradient-from":theme.gradientFrom,"--gradient-to":theme.gradientTo,"--glass-opacity":`${theme.opacity*100}%`,"--blur":`${theme.blur}px`,"--radius":`${theme.radius}px`,"--shadow":`${theme.shadow}`,"--border-opacity":`${theme.borderOpacity*100}%`,"--gradient-angle":`${theme.gradientAngle}deg`,colorScheme:theme.mode};
}
