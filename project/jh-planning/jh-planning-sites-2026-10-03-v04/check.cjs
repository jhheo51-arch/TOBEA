'use strict';
const assert=require('node:assert/strict'),C=require('./dist/core.js');
const p=C.blank('검사 프로젝트');p.id='check-1';
assert(C.issues(p).some(e=>e.key==='selected'),'후보 미선택은 차단');
assert(C.report(p).includes('미선택'),'미선택을 후보 1로 표시하지 않음');
for(const key of C.required)p[key]='검사 내용';
Object.assign(p,{targetValue:'10',baseline:'',start:'2026-10-05',end:'2026-10-18',selected:'0',revisionReason:'첫 검토 완료'});
p.candidates[0]={name:'첫 방향',action:'실행 내용',basis:'가정'};
assert.equal(C.issues(p).length,0);assert(C.report(p).includes('미확인'),'빈 현재값은 미확인');
p.baseline='0';assert(C.report(p).includes('0 건'),'명시한 0은 유지');
p.unit='%';p.targetValue='101';assert(C.issues(p).some(e=>e.key==='targetValue'));p.targetValue='-1';assert(C.issues(p).some(e=>e.key==='targetValue'));p.targetValue='10';
p.end='2026-10-04';assert(C.issues(p).some(e=>e.key==='end'));p.end='2026-02-30';assert(C.issues(p).some(e=>e.key==='end'));p.end='2026-10-18';
p.name='<img src=x onerror=alert(1)>';assert(!C.report(p).includes('<img'),'문서 입력을 HTML로 실행하지 않음');
const snapshot=structuredClone(p);p.revisions=[{version:1,date:'2026-10-01',reason:'검사',snapshot,html:'<script>alert(1)</script>'}];
const imported=C.parseBackup(JSON.stringify({format:'jh-planning-v1',projects:[p]}));assert(!imported[0].revisions[0].html.includes('<script>'),'복원 시 입력 자료로 안전하게 문서 재생성');
p.message='바뀐 메시지';assert.equal(imported[0].revisions[0].snapshot.message,'검사 내용','확정본과 현재 입력 분리');
assert.throws(()=>C.parseBackup('{broken'));assert.throws(()=>C.parseBackup(JSON.stringify({format:'other',projects:[]})));
assert.throws(()=>C.parseBackup(JSON.stringify({format:'jh-planning-v1',projects:[p,p]})),'중복 번호 차단');
assert.throws(()=>C.parseBackup(JSON.stringify({format:'jh-planning-v1',projects:[{...p,candidates:[]}]})));
console.log('통과: 필수 입력, 선택, 미확인/0, 숫자·날짜, 입력 안전성, 확정본 보존, 손상·중복 백업 검사');
const longText=('긴 기획 근거입니다. 🙂 ABC\n').repeat(100);
for(const [columns,rows] of [[10,1],[30,3],[80,8]]){const pages=C.pageText(longText,columns,rows);assert(pages.length>1);assert.equal(pages.map(p=>p.text).join(''),longText,'줄바꿈·이모지 포함 긴 내용 보존');for(let i=1;i<pages.length;i++)assert.equal(pages[i-1].end,pages[i].start,'쪽 사이 문자 누락·중복 없음');}
assert.equal(C.pageText('',20,3)[0].text,'');
console.log('통과: 긴 내용 페이지의 무손실 분할과 연속 위치');

