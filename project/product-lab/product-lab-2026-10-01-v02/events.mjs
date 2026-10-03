// CSV is an application input format; this module does not execute spreadsheet formulas.
export const eventNames = ['visit', 'detail', 'application_start', 'application_complete'];
export function parseCSV(text) {
  if (typeof text !== 'string' || text.length > 2000000) throw Error('자료는 2MB 이하의 UTF-8 CSV로 준비해 주세요.');
  text = text.replace(/^\uFEFF/, '');
  const rows=[];let row=[],cell='',quoted=false,closed=false;
  const pushCell=()=>{row.push(cell);cell='';closed=false;};
  const pushRow=()=>{pushCell();if(row.some(v=>v.trim()))rows.push(row);row=[];if(rows.length>10001)throw Error('한 번에 최대 10,000개의 행동 기록을 가져올 수 있습니다.');};
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=c;continue;}
    if(c==='"'){if(cell||closed)throw Error('따옴표 위치가 잘못된 CSV입니다.');quoted=true;}
    else if(c===',')pushCell();
    else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;pushRow();}
    else {if(closed)throw Error('닫는 따옴표 뒤에는 쉼표 또는 줄바꿈이 필요합니다.');cell+=c;}
  }
  if(quoted)throw Error('CSV의 따옴표가 닫히지 않았습니다.');
  if(cell||row.length||closed)pushRow();
  if(rows.length<2)throw Error('열 이름과 최소 한 개의 행동 기록이 필요합니다.');
  const columns=rows.shift().map(v=>v.trim());
  const required=['user_id','event','occurred_at','device'];
  if(columns.length!==4||new Set(columns).size!==4||required.some(c=>!columns.includes(c)))throw Error('열 이름은 user_id, event, occurred_at, device 네 개여야 합니다.');
  return rows.map((r,i)=>{
    if(r.length!==4)throw Error(`${i+2}번째 기록의 열 개수가 맞지 않습니다.`);
    return Object.fromEntries(columns.map((name,j)=>[name,r[j].trim()]));
  });
}
export function parseDay(day) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day))throw Error('분석 시작일과 종료일을 입력해 주세요.');
  const utc=Date.parse(day+'T00:00:00Z');
  if(!Number.isFinite(utc)||new Date(utc).toISOString().slice(0,10)!==day)throw Error('존재하는 날짜를 입력해 주세요.');
  return Date.parse(day+'T00:00:00+09:00');
}
export function aggregateEvents(records,startDay,endDay) {
  const start=parseDay(startDay),end=parseDay(endDay)+86400000;
  if(end<=start)throw Error('종료일은 시작일보다 빠를 수 없습니다.');
  if(!Array.isArray(records)||!records.length||records.length>10000)throw Error('행동 기록은 1~10,000개여야 합니다.');
  const audit={input:records.length,duplicates:0,outside:0,withoutVisit:0,outOfOrder:0,tiedUsers:0,includedUsers:0,startDay,endDay};
  const seen=new Set(),groups=new Map();
  records.forEach((r,i)=>{
    const prefix=`${i+2}번째 기록: `;
    if(!r || typeof r.user_id!=='string'||!r.user_id.trim()||r.user_id.length>64)throw Error(prefix+'익명 사용자 식별자를 1~64자로 입력해 주세요.');
    if(!eventNames.includes(r.event))throw Error(prefix+'지원하지 않는 행동 이름입니다. 입력 양식을 확인해 주세요.');
    if(!['mobile','desktop'].includes(r.device))throw Error(prefix+'device는 mobile 또는 desktop이어야 합니다.');
    if(typeof r.occurred_at!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(r.occurred_at))throw Error(prefix+'행동 시각에 시간대가 필요합니다. 예: 2026-10-01T09:00:00+09:00');
    const time=Date.parse(r.occurred_at);parseDay(r.occurred_at.slice(0,10));
    if(!Number.isFinite(time))throw Error(prefix+'행동 시각이 올바르지 않습니다.');
    const id=JSON.stringify([r.user_id,r.event,time,r.device]);
    if(seen.has(id)){audit.duplicates++;return;}seen.add(id);
    if(time<start||time>=end){audit.outside++;return;}
    if(!groups.has(r.user_id))groups.set(r.user_id,[]);
    groups.get(r.user_id).push({...r,time});
  });
  const rows=[{name:'모바일',counts:[0,0,0,0]},{name:'데스크톱',counts:[0,0,0,0]}];
  for(const events of groups.values()){
    events.sort((a,b)=>a.time-b.time);
    const visit=events.find(e=>e.event==='visit');
    if(!visit){audit.withoutVisit++;continue;}
    const cohort=rows[visit.device==='mobile'?0:1];cohort.counts[0]++;audit.includedUsers++;
    // Equal timestamps do not prove order; never infer a later stage from a tie.
    if(new Set(events.map(e=>e.time)).size<events.length)audit.tiedUsers++;
    let stage=0,lastTime=visit.time;
    for(const e of events){
      const next=eventNames.indexOf(e.event);
      if(next<=stage)continue;
      if(next===stage+1&&e.time>lastTime){stage=next;lastTime=e.time;cohort.counts[stage]++;}
      else audit.outOfOrder++;
    }
  }
  if(!audit.includedUsers)throw Error('선택한 기간에 방문 기록이 없습니다. 기간과 행동 이름을 확인해 주세요.');
  return {rows,audit};
}
export function sampleCSV() {
  const lines=['user_id,event,occurred_at,device'];
  // Deterministic synthetic fixture: 12 visitors, 8 details, 5 starts, 3 completions.
  for(let i=1;i<=12;i++){
    const steps=i<=3?4:i<=5?3:i<=8?2:1;
    for(let j=0;j<steps;j++)lines.push(`demo-${String(i).padStart(2,'0')},${eventNames[j]},2026-10-01T10:${String(j).padStart(2,'0')}:00+09:00,${i<=7?'mobile':'desktop'}`);
  }
  lines.push(lines[1]); // One exact duplicate, intentionally available for the quality check.
  return '\uFEFF'+lines.join('\r\n');
}
