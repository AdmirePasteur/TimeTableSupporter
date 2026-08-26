import { Course, Day, ScheduleResult } from './types'
import { buildingTravelTime } from './buildingTravelTimes'
const days:Day[]=['월','화','수','목','금']
export type GlobalCondition='credits'|'gaps'|'days'
export const scheduleSlots=[
 {id:'d1',label:'1교시',time:'09:00–09:50',start:9,end:9+50/60,type:'day'},
 {id:'d2',label:'2교시',time:'10:00–10:50',start:10,end:10+50/60,type:'day'},
 {id:'d3',label:'3교시',time:'11:00–11:50',start:11,end:11+50/60,type:'day'},
 {id:'d4',label:'4교시',time:'12:00–12:50',start:12,end:12+50/60,type:'day'},
 {id:'d5',label:'5교시',time:'13:00–13:50',start:13,end:13+50/60,type:'day'},
 {id:'d6',label:'6교시',time:'14:00–14:50',start:14,end:14+50/60,type:'day'},
 {id:'d7',label:'7교시',time:'15:00–15:50',start:15,end:15+50/60,type:'day'},
 {id:'d8',label:'8교시',time:'16:00–16:50',start:16,end:16+50/60,type:'day'},
 {id:'d9',label:'9교시',time:'17:00–17:50',start:17,end:17+50/60,type:'day'},
 {id:'d10',label:'10교시',time:'18:00–18:50',start:18,end:18+50/60,type:'day'},
 {id:'n1',label:'야간1',time:'18:00–18:45',start:18,end:18.75,type:'night'},
 {id:'n2',label:'야간2',time:'18:50–19:35',start:18+50/60,end:19+35/60,type:'night'},
 {id:'n3',label:'야간3',time:'19:40–20:25',start:19+40/60,end:20+25/60,type:'night'},
 {id:'n4',label:'야간4',time:'20:30–21:15',start:20.5,end:21.25,type:'night'},
 {id:'n5',label:'야간5',time:'21:20–22:05',start:21+20/60,end:22+5/60,type:'night'},
] as const
const clashes=(a:Course,b:Course)=>a.meetings.some(x=>b.meetings.some(y=>x.day===y.day&&x.start<y.end&&y.start<x.end))
export const coursesClash=clashes
export const courseHitsBlocked=(course:Course,blocked:Set<string>)=>course.meetings.some(m=>scheduleSlots.some(slot=>blocked.has(`${m.day}-${slot.id}`)&&m.start<slot.end&&m.end>slot.start))
export function calculateConsecutiveTravel(picked:Course[]){
 const grouped=new Map<Day,Course['meetings']>();days.forEach(d=>grouped.set(d,[]));picked.forEach(c=>c.meetings.forEach(m=>grouped.get(m.day)!.push(m)))
 let moveMinutes=0
 const moveDetails:ScheduleResult['moveDetails']=[]
 days.forEach(day=>{
  const meetings=grouped.get(day)!.sort((a,b)=>a.start-b.start)
  meetings.forEach((meeting,index)=>{
   if(!index)return
   const previous=meetings[index-1],gap=Math.max(0,Math.round((meeting.start-previous.end)*60))
   if(gap>10)return
   const minutes=buildingTravelTime(previous.building,meeting.building)
   if(minutes!==null)moveMinutes+=minutes
   const from=picked.find(course=>course.meetings.includes(previous)),to=picked.find(course=>course.meetings.includes(meeting))
   moveDetails.push({day,fromCourse:from?.name??'',toCourse:to?.name??'',fromBuilding:previous.building,toBuilding:meeting.building,minutes})
  })
 })
 return{moveMinutes,moveDetails}
}
function evaluate(picked:Course[],all:Course[],enabled:Set<GlobalCondition>):ScheduleResult{
 const grouped=new Map<Day,Course['meetings']>();days.forEach(d=>grouped.set(d,[]));picked.forEach(c=>c.meetings.forEach(m=>grouped.get(m.day)!.push(m)))
 let gaps=0,morning=0,lunch=0,active=0
 days.forEach(d=>{const ms=grouped.get(d)!.sort((a,b)=>a.start-b.start);if(!ms.length)return;active++;if(!ms.some(m=>m.start<13&&m.end>12))lunch++;ms.forEach((m,i)=>{if(m.start<10)morning++;if(i){const prev=ms[i-1],gap=Math.max(0,Math.round((m.start-prev.end)*60));if(gap>10)gaps+=gap}})})
 const {moveMinutes:moves,moveDetails}=calculateConsecutiveTravel(picked)
 const credits=picked.reduce((s,c)=>s+c.credits,0),lunchRate=active?Math.round(lunch/active*100):0
 const scores:Record<GlobalCondition,number>={credits:Math.min(1,credits/18),gaps:Math.max(0,1-gaps/600),days:Math.max(0,1-(active-2)/3)}
 const quality=enabled.size?[...enabled].reduce((s,k)=>s+scores[k],0)/enabled.size:.5
 const score=Math.round(Math.min(100,(quality*.8+(picked.length/all.length)*.2)*100))
 return{courses:picked,excluded:all.filter(c=>!picked.includes(c)),credits,days:active,lunchRate,gapMinutes:Math.round(gaps),moveMinutes:moves,moveDetails,morningCount:morning,score}
}
export function optimize(all:Course[],required:Set<string>,blocked:Set<string>,enabled:Set<GlobalCondition>){
 const must=all.filter(c=>required.has(c.id))
 if(must.length!==required.size||must.some(c=>courseHitsBlocked(c,blocked))||must.some((c,i)=>must.slice(i+1).some(x=>clashes(c,x))))return[]
 const optional=all.filter(c=>!required.has(c.id)&&!courseHitsBlocked(c,blocked))
 let states:Course[][]=[must]
 const limit=12000
 for(const course of optional){
  const additions=states.filter(state=>state.every(existing=>!clashes(existing,course))).map(state=>[...state,course])
  states=states.concat(additions)
  if(states.length>limit){
   states.sort((a,b)=>b.reduce((s,c)=>s+c.credits,0)-a.reduce((s,c)=>s+c.credits,0)||b.length-a.length)
   const high=states.slice(0,limit*3/4),spread=states.filter((_,i)=>i%Math.max(1,Math.floor(states.length/(limit/4)))===0).slice(0,limit/4)
   states=[...high,...spread]
  }
 }
 return states.filter(s=>s.length).map(s=>evaluate(s,all,enabled)).sort((a,b)=>b.score-a.score||b.credits-a.credits||a.days-b.days).slice(0,3)
}
