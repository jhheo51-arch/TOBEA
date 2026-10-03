"""로컬 Worker + 격리 저장소 전용. 합성 자료를 실제 성과로 사용하지 않는다."""
import json
from uuid import uuid4
from urllib.request import Request, urlopen
from urllib.error import HTTPError

BASE='http://127.0.0.1:8770'
HEADERS={'Content-Type':'application/json','oai-authenticated-user-id':'local-qa','oai-authenticated-user-email':'qa@example.invalid'}
def call(path,data=None,status=200,auth=True):
    request=Request(BASE+path,data=json.dumps(data).encode() if data is not None else None,headers=HEADERS if auth else {})
    try:
        with urlopen(request,timeout=30) as r: code=r.status; result=json.load(r)
    except HTTPError as e: code=e.code; result=json.load(e)
    assert code==status,(path,code,result)
    return result

call('/api/cases',status=401,auth=False)
source={'source_type':'manual','url':'https://example.com/contextlens-local-qa-'+uuid4().hex,'title':'기능 검증용 합성 자료 — 실제 조사 결과 아님','body':'노래를 들으면서 원하는 곡으로 이동할 수 있는 방법을 소개하는 시험용 본문입니다. 실제 영상이나 고객의 관찰 자료가 아닙니다.','body_kind':'시험용 본문','collected_at':'2026-09-30T00:00:00Z','sampling':'기능 검증용 합성 댓글','comments':[{'id':'qa1','text':'노래 제목과 시간을 알려주세요'},{'id':'qa2','text':'곡 제목과 타임스탬프를 찾고 싶어요'},{'id':'qa3','text':'처음부터 끝까지 들으니 곡 이동 안내는 필요 없어요'},{'id':'qa4','text':'목소리 너무 좋아요'},{'id':'qa5','text':'다음 영상도 듣고 싶어요'}]}
analysis=call('/api/analyze',{'source':source});key=analysis['_storage']['case_key'];snapshot=analysis['_storage']['snapshot_id']
data=call('/api/project?key='+key);assert data['revision']==0
project=data['project'];project.update(title='로컬 검증 프로젝트',snapshot_id=snapshot,evidence_ids=['qa1','qa2'],counterexample_ids=['qa3'])
saved=call('/api/project/save',{'key':key,'project':project,'revision':0});assert saved['revision']==1
call('/api/project/save',{'key':key,'project':project,'revision':0},status=400)
history=call('/api/project/history?key='+key);assert len(history['history'])==1
invalid={**project,'evidence_ids':['missing']};call('/api/project/save',{'key':key,'project':invalid,'revision':1},status=400)
def start(code,variant,kind='actual'):
    return call('/api/study/start',{'snapshot_id':snapshot,'variant':variant,'record_kind':kind,'participant_code':code,'familiarity':'new'})
def finish(s):
    call('/api/study/finish',{'id':s['id'],'evidence_ids':['qa1','qa2'],'counterexample_id':'qa3','hypothesis':'곡 이름과 이동 안내를 제공하면 원하는 곡을 찾는 경험을 개선할 수 있다는 가설입니다.','ease_rating':5})
    call('/api/study/review',{'id':s['id'],'status':'valid','unsupported_claim':False,'note':'격리된 로컬 기능 검사: 실제 참가자의 관찰로 사용하지 않음'})
a=start('QA01','before');finish(a)
call('/api/study/start',{'snapshot_id':snapshot,'variant':'after','participant_code':'QA01','record_kind':'actual'},status=400)
b=start('QA02','balanced');assert b['variant']=='after'
call('/api/study/abandon',{'id':b['id'],'observation':'로컬 중단 집계 기능 검사'})
c=start('QA99','before','test');finish(c)
stats=call('/api/study/dashboard?snapshot_id='+str(snapshot))
assert stats['cohorts']['before']['started']==1 and stats['cohorts']['before']['success']==1
assert stats['cohorts']['after']['started']==1 and stats['cohorts']['after']['success']==0 and stats['cohorts']['after']['abandoned']==1
assert stats['excluded_records']==1
project.update(problem_basis='로컬 기능 검사를 위한 입력 — 실제 고객 관찰 아님')
saved=call('/api/project/save',{'key':key,'project':project,'revision':1});assert saved['revision']==2
report=call('/api/project/report?key='+key);assert '개인 프로젝트' in report['markdown'] and '로컬 중단 집계 기능 검사' in report['markdown']
assert len(call('/api/project/history?key='+key)['history'])==2
print(json.dumps({'result':'passed','checks':['인증','프로젝트 저장·이력·충돌','잘못된 근거 차단','중복 참가자 차단','균형 배정','중단 분모 유지','시험 기록 성과 제외','문서 내보내기'],'case_key':key,'snapshot_id':snapshot},ensure_ascii=False))
