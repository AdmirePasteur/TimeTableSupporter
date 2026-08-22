import csv, json, re
from pathlib import Path
from lxml import etree

ROOT=Path(__file__).resolve().parents[1]
XML=ROOT/'hwp.xml'
OUT=ROOT/'src'/'generatedCourses.ts'
SKIPPED_OUT=ROOT/'제외된-강의-72행.csv'
DAYS={'월':'월','화':'화','수':'수','목':'목','금':'금'}
COLORS=['#6C5CE7','#FF7F6B','#37B7A5','#3D8BFF','#F5A623','#E85D9E','#7C6DF2','#42A5D9','#2FB47C','#F08A5D']
CODE=re.compile(r'^[A-Z]{2,4}\d{3,5}$')
OTHER_PREFIXES=('ED','YA','ZA','ZB','AE','ES','XH')
CELL_CODES={'XG1128','XG1129','XG1130','XG1131','XG1132','XG1133','XG1134','XG1135','XG1136','XG1162','XG1163','XG1164','XG1165','XG1166','XG1167','XG1159','XG1160','XG1161'}

def slot(number):
    if 1<=number<=10:
        return number+8, number+8+50/60
    night={11:(18,18.75),12:(18+50/60,19+35/60),13:(19+40/60,20+25/60),14:(20.5,21.25),15:(21+20/60,22+5/60)}
    return night.get(number)

def meetings(value,building):
    value=value.replace('중간','').replace('야간','')
    found=list(re.finditer(r'[월화수목금]',value)); result=[]
    for i,match in enumerate(found):
        day=match.group(); segment=value[match.end():found[i+1].start() if i+1<len(found) else len(value)]
        nums=[int(x) for x in re.findall(r'\d+',segment)]
        for n in nums:
            times=slot(n)
            if not times: continue
            start,end=times
            if result and result[-1]['day']==day and start-result[-1]['end']<=.2: result[-1]['end']=end
            else: result.append({'day':day,'start':start,'end':end,'building':building or '강의실 미정'})
    return result

tree=etree.parse(str(XML)); records=[]; seen=set(); skipped=0; skipped_records=[]; area_map={}
all_rows=list(tree.iter('TableRow'))
text_nodes=list(tree.iter('Text')); text_positions={id(node):i for i,node in enumerate(text_nodes)}; table_departments={}

def expanded_rows(table):
    """HWP 표의 rowspan/colspan 병합 셀을 실제 행 값으로 펼친다."""
    active={}
    for row in table.iter('TableRow'):
        values={col:text for col,(_,text) in active.items()}
        active={col:(remaining-1,text) for col,(remaining,text) in active.items() if remaining>1}
        for cell in row.findall('TableCell'):
            col=int(cell.get('col','0')); colspan=int(cell.get('colspan','1')); rowspan=int(cell.get('rowspan','1'))
            value=' '.join(''.join(cell.itertext()).replace('\r',' ').split())
            for offset in range(colspan):
                values[col+offset]=value
                if rowspan>1: active[col+offset]=(rowspan-1,value)
        if values:
            yield [values.get(col,'') for col in range(max(values)+1)]
for table in tree.iter('TableControl'):
    code_node=next((node for node in table.iter('Text') if CODE.match((node.text or '').strip())),None)
    if code_node is None: continue
    position=text_positions[id(code_node)]; candidates=[]
    for node in text_nodes[max(0,position-100):position]:
        value=' '.join((node.text or '').split())
        if re.search(r'(학과|학부|전공|교육원|학군단|대학원)$',value) and value not in {'이수구분','협력학과'}: candidates.append(value.replace(' ',''))
    if candidates: table_departments[table]=candidates[-1]
for table in tree.iter('TableControl'):
    current_area=''
    for row in table.iter('TableRow'):
        cells=[' '.join(''.join(cell.itertext()).replace('\r',' ').split()) for cell in sorted(row.findall('TableCell'),key=lambda c:int(c.get('col','0')))]
        code_index=next((i for i,v in enumerate(cells) if CODE.match(v)),None)
        if code_index!=1 or not cells[code_index].startswith('XG'): continue
        if cells[0] and (re.search(r'[가-힣]',cells[0]) or cells[0].upper()=='CELL'): current_area=cells[0]
        if current_area: area_map.setdefault(cells[code_index],current_area)
for table in tree.iter('TableControl'):
    for cells in expanded_rows(table):
        code_index=next((i for i,v in enumerate(cells) if CODE.match(v)),None)
        if code_index is None or len(cells)<=code_index+6: continue
        code=cells[code_index]; name=cells[code_index+1]; section=cells[code_index+2] or '0'; ratio=cells[code_index+3]
        schedule=cells[code_index+4]; professor=cells[code_index+5]; room=cells[code_index+6]
        if '�' in ''.join([name,schedule,professor,room]) or not name:
            skipped+=1; skipped_records.append({'제외 이유':'원본 문자 손상','과목코드':code,'과목명':name,'분반':section,'강의시간':schedule,'교수':professor,'강의실':room}); continue
        parsed=meetings(schedule,room)
        if not parsed:
            external={'광주여자대','전남대','호남대','동강대','조선대','남부대','광주대'}
            if not schedule: reason='미개설 또는 강의시간 미정'
            elif schedule in external: reason='타 대학 학점교류 과목'
            elif '토' in schedule: reason='토요일 수업(현재 월~금 범위 밖)'
            else: reason='특수 강의시간 표기 확인 필요'
            skipped+=1; skipped_records.append({'제외 이유':reason,'과목코드':code,'과목명':name,'분반':section,'강의시간':schedule,'교수':professor,'강의실':room}); continue
        key=(code,section,name,schedule)
        if key in seen: continue
        seen.add(key)
        credit_match=re.search(r'\d+',ratio); credits=int(credit_match.group()) if credit_match else 0
        category='기타' if code.startswith(OTHER_PREFIXES) else ('교양' if code.startswith('XG') else '전공')
        department=table_departments.get(table,'')
        area=area_map.get(code,'') if category=='교양' else ''
        if area.upper()=='CELL' or code in CELL_CODES:
            skipped+=1; skipped_records.append({'제외 이유':'CELL 과목(서비스 제외)','과목코드':code,'과목명':name,'분반':section,'강의시간':schedule,'교수':professor,'강의실':room}); continue
        requirement=next((value for value in reversed(cells[:code_index]) if value in {'전공필수','전공선택'}),'') if category=='전공' else ''
        records.append({'id':f'{code}-{section}-{len(records)}','code':f'{code}-{section}','name':name,'professor':professor or '미정','credits':credits,'category':category,'department':department or '학과 미지정','area':area or '영역 미지정','requirement':requirement or ('이수구분 미지정' if category=='전공' else ''),'meetings':parsed,'color':COLORS[len(records)%len(COLORS)]})

manual=[
 {'id':'EE2004-00-manual','code':'EE2004-00','name':'영어교육수업연구','professor':'박은정','credits':1,'category':'전공','department':'영어교육과','area':'영역 미지정','requirement':'전공선택','meetings':[{'day':'수','start':11,'end':12+50/60,'building':'E30203'}],'color':'#5B8DEF'},
 {'id':'ST2012-00-manual','code':'ST2012-00','name':'창업실습2','professor':'최정민','credits':3,'category':'전공','department':'학과 미지정','area':'영역 미지정','requirement':'전공선택','meetings':[{'day':'월','start':18,'end':20+25/60,'building':'강의실 미정'},{'day':'수','start':20.5,'end':22+5/60,'building':'강의실 미정'}],'color':'#EF7A65'},
]
existing={r['code'] for r in records}; records.extend(r for r in manual if r['code'] not in existing)

header="import { Course } from './types'\n\n"
OUT.write_text(header+'export const generatedCourses: Course[] = '+json.dumps(records,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
with SKIPPED_OUT.open('w',encoding='utf-8-sig',newline='') as file:
    writer=csv.DictWriter(file,fieldnames=['제외 이유','과목코드','과목명','분반','강의시간','교수','강의실']); writer.writeheader(); writer.writerows(skipped_records)
print(json.dumps({'courses':len(records),'skipped':skipped,'departments':sorted({r['department'] for r in records if r['category']=='전공'}),'areas':sorted({r['area'] for r in records if r['category']=='교양'}),'output':str(OUT),'skipped_output':str(SKIPPED_OUT)},ensure_ascii=False))
