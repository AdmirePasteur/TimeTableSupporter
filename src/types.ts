export type Day = '월' | '화' | '수' | '목' | '금'
export type Category = '전공' | '교양' | '일반' | '기타'
export interface Meeting { day: Day; start: number; end: number; building: string }
export interface Course { id:string; code:string; name:string; professor:string; credits:number; category:Category; department?:string; area?:string; requirement?:string; meetings:Meeting[]; color:string }
export type ConditionKey = 'lunch'|'distance'|'credits'|'gaps'|'days'|'morning'
export type Weights = Record<ConditionKey,number>
export type ConditionDays = Record<ConditionKey, Set<Day>>
export interface MoveDetail { day:Day; fromCourse:string; toCourse:string; fromBuilding:string; toBuilding:string; minutes:number }
export interface ScheduleResult { courses:Course[]; excluded:Course[]; credits:number; days:number; lunchRate:number; gapMinutes:number; moveMinutes:number; moveDetails:MoveDetail[]; morningCount:number; score:number }
