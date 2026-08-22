import { scheduleSlots } from './optimizer'
import { Category, Course, Day, Meeting } from './types'

const palette=['#6C5CE7','#FF7F6B','#37B7A5','#3D8BFF','#F5A623','#E85D9E','#7C6DF2','#42A5D9','#2FB47C','#F08A5D']
const normalize=(s:string)=>s.replace(/[\s/()\[\]._-]/g,'').toLowerCase()
const aliases:Record<string,string[]>={code:['과목코드','학수번호','교과목코드'],name:['과목명','교과목명'],section:['분반'],credits:['학점'],schedule:['강의시간','수업시간'],professor:['교수','교수명','담당교수'],room:['강의실','수업강의실'],category:['구분','이수구분']}

function splitLine(line:string,delimiter:string){if(delimiter==='\t')return line.split('\t').map(x=>x.trim());const out:string[]=[];let cell='',quoted=false;for(let i=0;i<line.length;i++){const ch=line[i];if(ch==='"'){if(quoted&&line[i+1]==='"'){cell+='"';i++}else quoted=!quoted}else if(ch===delimiter&&!quoted){out.push(cell.trim());cell=''}else cell+=ch}out.push(cell.trim());return out}
function findColumn(headers:string[],key:string){const candidates=aliases[key].map(normalize);return headers.findIndex(h=>candidates.includes(normalize(h)))}
function categoryOf(value:string):Category{return value.includes('교양')?'교양':value.includes('전공')?'전공':'일반'}

function parseMeetings(value:string,building:string):Meeting[]{
 const dayMatches=[...value.matchAll(/[월화수목금]/g)];if(!dayMatches.length)return[]
 const result:Meeting[]=[]
 for(let i=0;i<dayMatches.length;i++){
  const day=dayMatches[i][0] as Day,startAt=dayMatches[i].index!+1,endAt=dayMatches[i+1]?.index??value.length
  let numbers=(value.slice(startAt,endAt).match(/\d+/g)??[]).map(Number)
  if(!numbers.length){const all=value.match(/\d+/g)?.map(Number)??[];numbers=all}
  const slots=numbers.map(n=>scheduleSlots.find(s=>s.id===(n<=10?`d${n}`:`n${n-10}`))).filter(Boolean) as (typeof scheduleSlots[number])[]
  slots.sort((a,b)=>a.start-b.start)
  for(const slot of slots){const prev=result[result.length-1];if(prev&&prev.day===day&&slot.start-prev.end<=.2)prev.end=slot.end;else result.push({day,start:slot.start,end:slot.end,building:building||'강의실 미정'})}
 }
 return result
}

export function parseCourseFile(text:string):{courses:Course[];skipped:number}{
 const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).filter(x=>x.trim());if(lines.length<2)throw new Error('강의 데이터가 비어 있어요.')
 const delimiter=lines[0].includes('\t')?'\t':',';const headers=splitLine(lines[0],delimiter)
 const col=Object.fromEntries(Object.keys(aliases).map(k=>[k,findColumn(headers,k)])) as Record<string,number>
 if(col.code<0||col.name<0||col.credits<0||col.schedule<0)throw new Error('과목코드, 과목명, 학점, 강의시간 열을 찾을 수 없어요.')
 const parsed:Course[]=[];let skipped=0
 lines.slice(1).forEach((line,index)=>{const row=splitLine(line,delimiter),get=(k:string)=>col[k]>=0?(row[col[k]]??''):'';const code=get('code'),name=get('name'),section=get('section')||'0',schedule=get('schedule'),room=get('room');const meetings=parseMeetings(schedule,room);if(!code||!name||!meetings.length){skipped++;return}parsed.push({id:`upload-${code}-${section}-${index}`,code:`${code}-${section}`,name,professor:get('professor')||'미정',credits:Number(get('credits'))||0,category:categoryOf(`${get('category')} ${row[0]??''}`),meetings,color:palette[parsed.length%palette.length]})})
 if(!parsed.length)throw new Error('읽을 수 있는 강의가 없어요. 강의시간 표기를 확인해주세요.')
 return{courses:parsed,skipped}
}

export async function readCourseFile(file:File){const buffer=await file.arrayBuffer();const utf8=new TextDecoder('utf-8').decode(buffer);if((utf8.match(/�/g)?.length??0)>3)return new TextDecoder('euc-kr').decode(buffer);return utf8}
