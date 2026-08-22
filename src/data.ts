import { Course } from './types'
import { generatedCourses } from './generatedCourses'
const sampleCourses: Course[] = [
 {id:'c1',code:'CSE201-01',name:'자료구조',professor:'김민준',credits:3,category:'전공',color:'#6C5CE7',meetings:[{day:'월',start:10,end:11.5,building:'공학관'},{day:'수',start:10,end:11.5,building:'공학관'}]},
 {id:'c2',code:'CSE205-01',name:'객체지향프로그래밍',professor:'박서연',credits:3,category:'전공',color:'#FF7F6B',meetings:[{day:'화',start:13,end:14.5,building:'IT관'},{day:'목',start:13,end:14.5,building:'IT관'}]},
 {id:'c3',code:'CSE211-02',name:'컴퓨터구조',professor:'이도윤',credits:3,category:'전공',color:'#37B7A5',meetings:[{day:'월',start:13,end:14.5,building:'공학관'},{day:'수',start:13,end:14.5,building:'공학관'}]},
 {id:'c4',code:'MAT201-01',name:'선형대수학',professor:'최유진',credits:3,category:'전공',color:'#3D8BFF',meetings:[{day:'화',start:9,end:10.5,building:'자연관'},{day:'목',start:9,end:10.5,building:'자연관'}]},
 {id:'c5',code:'GED104-03',name:'현대사회와 심리학',professor:'정하늘',credits:3,category:'교양',color:'#F5A623',meetings:[{day:'월',start:11,end:12.5,building:'인문관'},{day:'수',start:11,end:12.5,building:'인문관'}]},
 {id:'c6',code:'GED221-01',name:'영화로 읽는 철학',professor:'윤지호',credits:2,category:'교양',color:'#E85D9E',meetings:[{day:'금',start:13,end:16,building:'인문관'}]},
 {id:'c7',code:'CSE231-01',name:'데이터베이스',professor:'한지민',credits:3,category:'전공',color:'#7C6DF2',meetings:[{day:'화',start:15,end:16.5,building:'IT관'},{day:'목',start:15,end:16.5,building:'IT관'}]},
 {id:'c8',code:'GED118-02',name:'글쓰기와 토론',professor:'강현우',credits:2,category:'교양',color:'#42A5D9',meetings:[{day:'금',start:10,end:12,building:'인문관'}]},
 {id:'c9',code:'CSE245-01',name:'웹프로그래밍',professor:'오수빈',credits:3,category:'전공',color:'#2FB47C',meetings:[{day:'월',start:15,end:16.5,building:'IT관'},{day:'수',start:15,end:16.5,building:'IT관'}]},
 {id:'c10',code:'GED301-01',name:'경제학의 이해',professor:'임재현',credits:3,category:'교양',color:'#F08A5D',meetings:[{day:'화',start:13,end:14.5,building:'사회관'},{day:'목',start:13,end:14.5,building:'사회관'}]},
 {id:'c11',code:'CSE250-01',name:'인공지능개론',professor:'송예린',credits:3,category:'전공',color:'#5B8DEF',meetings:[{day:'월',start:9,end:10.5,building:'IT관'},{day:'수',start:9,end:10.5,building:'IT관'}]},
 {id:'c12',code:'PE101-04',name:'생활체육',professor:'문태호',credits:1,category:'일반',color:'#7BB661',meetings:[{day:'금',start:9,end:11,building:'체육관'}]},
]
export const courses:Course[]=generatedCourses.length?generatedCourses:sampleCourses
export const buildingDistance:Record<string,Record<string,number>>={공학관:{공학관:0,IT관:5,자연관:6,인문관:12,사회관:10,체육관:15},IT관:{공학관:5,IT관:0,자연관:8,인문관:14,사회관:9,체육관:12},자연관:{공학관:6,IT관:8,자연관:0,인문관:9,사회관:7,체육관:11},인문관:{공학관:12,IT관:14,자연관:9,인문관:0,사회관:5,체육관:8},사회관:{공학관:10,IT관:9,자연관:7,인문관:5,사회관:0,체육관:9},체육관:{공학관:15,IT관:12,자연관:11,인문관:8,사회관:9,체육관:0}}
