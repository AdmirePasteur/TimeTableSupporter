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
const departmentByPrefix: Record<string, string> = {
 LS:'자유전공학부', FN:'식품영양학과', AM:'융합바이오시스템기계공학과', NU:'간호학과',
 IK:'국제한국어교육학전공', AP:'건축학부', SF:'스마트안전관리학과', GL:'글로벌매니지먼트전공',
 GI:'글로벌ICT융합문화콘텐츠전공', AL:'농생명과학전공', FR:'산림자원학전공', LA:'조경학전공',
 AS:'동물자원과학전공', HO:'원예학전공', FT:'식품공학전공', AG:'농업경제학전공',
 BI:'의생명과학전공', FC:'조리과학전공', OR:'바이오한약자원학전공', IS:'국제농총산학과',
 EC:'경제학전공', TR:'무역학전공', BA:'경영학전공', LW:'법학전공', AD:'행정학전공',
 AC:'회계학전공', LO:'물류학전공', SW:'사회복지학전공', HI:'사학전공', PH:'철학전공',
 CL:'글로벌중국학전공', JL:'일본어일본문화학전공', LI:'문예창작학전공', SL:'사회체육학전공',
 PI:'음악예술융합학전공', PA:'사진미디어학전공', DE:'영상디자인학전공', CA:'만화애니메이션학전공',
 CT:'패션디자인학전공', CE:'토목공학전공', EN:'환경공학전공', MS:'기계우주항공공학전공',
 MM:'첨단신소재공학전공', CG:'화학공학전공', EL:'전기공학전공', EI:'전자공학전공',
 IC:'인공지능공학전공', CS:'컴퓨터공학전공', CH:'화학전공', GY:'에너지응용학전공',
 KE:'국어교육과', EE:'영어교육과', SE:'사회교육과', AE:'농업교육과', MA:'수학교육과',
 CO:'컴퓨터교육과', ES:'환경교육과', PD:'물리교육과', CD:'화학교육과', DP:'약학과',
 LB:'물류비즈니스전공트랙', CN:'융합산업학전공트랙', IA:'동물생명산업전공트랙',
 GC:'정원문화산업전공트랙', SP:'스포츠레저전공트랙', SS:'사회서비스상담전공트랙', ST:'스마트식품산업학',
 SH:'스마트원예산업학', SM:'스마트축산학', CM:'콘텐츠매니지먼트전공', IB:'지능의료기술전공',
 SG:'스마트농업전공', CI:'기후변화융합전공', DL:'인문사회디지털융합전공',
 HM:'인문사회융합인재양성전공', GF:'글로컬금융공학전공', KR:'케이뷰티학전공',
 SN:'스마트앱애널리틱스', DW:'디지털헬스케어', RA:'지역의제·인문사회실천전공', AF:'AI+X융합전공',
}

const sourceCourses=generatedCourses.length?generatedCourses:sampleCourses
export const courses:Course[]=sourceCourses.map(course=>{
 if(course.category!=='전공'||course.department!=='학과 미지정')return course
 const department=departmentByPrefix[course.code.slice(0,2).toUpperCase()]
 return department?{...course,department}:course
})
