process.env.SUPABASE_URL = 'https://fake.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'svc';
process.env.TUTOR_ADMIN_PASSWORD = 'pw-1234';

const TABLE = new Map();
global.fetch = async (url, init = {}) => {
  const u = new URL(url);
  const q = u.searchParams;
  const method = (init.method || 'GET').toUpperCase();
  const json = (b, s = 200) => ({ ok: s < 300, status: s, json: async () => b });

  const parse = (v) => { const i = v.indexOf('.'); return [v.slice(0, i), v.slice(i + 1)]; };
  const idFilters = q.getAll('id').map(parse);
  const match = (id) => idFilters.every(([op, val]) =>
    op === 'eq' ? id === val : op === 'gte' ? id >= val : op === 'lt' ? id < val : true);

  if (method === 'GET') {
    const rows = [...TABLE.entries()].filter(([id]) => match(id))
      .map(([id, payload]) => ({ id, payload }))
      .sort((a, b) => a.id < b.id ? -1 : 1);
    return json(rows);
  }
  if (method === 'POST') {
    for (const r of JSON.parse(init.body)) TABLE.set(r.id, r.payload);
    return json(null, 201);
  }
  if (method === 'PATCH') {
    const body = JSON.parse(init.body);
    for (const [id] of TABLE) if (match(id)) TABLE.set(id, body.payload);
    return json(null, 204);
  }
  if (method === 'DELETE') {
    for (const [id] of [...TABLE]) if (match(id)) TABLE.delete(id);
    return json(null, 204);
  }
  return json({}, 400);
};

const { handleTutorSupportRequest: H } = require('/home/user/-/lib/tutor-support-logic.cjs');
let pass = 0, fail = 0;
const ok = (l, v, extra) => { if (v) { pass++; console.log('✅ ' + l); } else { fail++; console.log('❌ ' + l + (extra ? '  → ' + extra : '')); } };

const base = { action:'create', date:'2026-08-24', period:2, grade:3, classNo:2, room:'컴퓨터실', teacher:'김수현', topic:'태블릿 배부 지원' };

(async () => {
  // validation
  ok('평일 아닌 날 거부', (await H({...base, date:'2026-08-23'})).status === 400);
  ok('잘못된 날짜 형식 거부', (await H({...base, date:'2026-13-99'})).status === 400);
  ok('범위 밖 교시 거부', (await H({...base, period:9})).status === 400);
  ok('범위 밖 학년 거부', (await H({...base, grade:7})).status === 400);
  ok('범위 밖 반 거부', (await H({...base, classNo:0})).status === 400);
  ok('허용목록 밖 특별실 거부', (await H({...base, room:'옥상'})).status === 400);
  ok('이름 없으면 거부', (await H({...base, teacher:'  '})).status === 400);
  ok('300자 초과 요청내용 거부', (await H({...base, topic:'가'.repeat(301)})).status === 400);
  ok('알 수 없는 action 거부', (await H({action:'drop_table'})).status === 400);

  // create
  const c1 = await H(base);
  ok('정상 신청 생성', c1.status === 200 && c1.json.ok && !!c1.json.cancelKey);
  const id1 = c1.json.id, key1 = c1.json.cancelKey;
  ok('id에 날짜가 고정폭으로 박힘', id1.startsWith('tutorsup_r_2026-08-24_'), id1);

  // cancelKey는 해시로만 저장 — 평문이 DB에 남지 않아야 한다
  ok('cancelKey 평문 미저장', !JSON.stringify(TABLE.get(id1)).includes(key1));

  // list
  const l1 = await H({ action:'list', weekStart:'2026-08-26' });   // 수요일 → 월요일로 정규화
  ok('주 시작 정규화(수→월)', l1.json.weekStart === '2026-08-24');
  ok('목록에 1건', l1.json.requests.length === 1);
  ok('목록에 cancelHash 미노출', !JSON.stringify(l1.json.requests).includes('cancelHash'));
  ok('튜터 설정됨 플래그', l1.json.tutorConfigured === true);

  // pending 끼리는 중복 허용
  const c2 = await H({...base, grade:5, classNo:1});
  ok('대기끼리 같은 특별실 허용', c2.status === 200);
  const id2 = c2.json.id;

  // tutor auth
  ok('토큰 없이 수락 거부', (await H({action:'decide', id:id1, to:'confirmed'})).status === 401);
  ok('틀린 비밀번호 거부', (await H({action:'tutor_login', password:'nope'})).status === 401);
  const lg = await H({action:'tutor_login', password:'pw-1234'});
  ok('올바른 비밀번호 로그인', lg.status === 200 && !!lg.json.token);
  const token = lg.json.token;
  ok('위조 토큰 거부', (await H({action:'decide', token: token.split('.')[0] + '.AAAA', id:id1, to:'confirmed'})).status === 401);
  ok('만료 토큰 거부', (await H({action:'decide', token:'1.' + token.split('.')[1], id:id1, to:'confirmed'})).status === 401);

  // accept
  ok('수락 성공', (await H({action:'decide', token, id:id1, to:'confirmed'})).status === 200);
  ok('확정 반영됨', TABLE.get(id1).status === 'confirmed');

  // conflict now blocks — both on create and on accept
  const c3 = await H({...base, grade:4, classNo:3});
  ok('확정 후 같은 특별실 신청 차단', c3.status === 409);
  if (c3.status === 409) console.log('   → ' + c3.json.error);
  const acc2 = await H({action:'decide', token, id:id2, to:'confirmed'});
  ok('확정 후 같은 특별실 수락도 차단', acc2.status === 409);
  ok('다른 특별실은 신청 통과', (await H({...base, grade:4, classNo:3, room:'과학실'})).status === 200);
  ok('다른 교시는 신청 통과', (await H({...base, grade:4, classNo:3, period:3})).status === 200);
  ok('다른 날은 신청 통과', (await H({...base, grade:4, classNo:3, date:'2026-08-25'})).status === 200);

  // cancel
  ok('키 없이 취소 거부', (await H({action:'cancel', id:id2})).status === 403);
  ok('틀린 키로 취소 거부', (await H({action:'cancel', id:id2, cancelKey:'wrong'})).status === 403);
  ok('확정된 건은 본인도 취소 불가', (await H({action:'cancel', id:id1, cancelKey:key1})).status === 409);
  const k2 = c2.json.cancelKey;
  ok('대기 건은 본인 키로 취소', (await H({action:'cancel', id:id2, cancelKey:k2})).status === 200);
  ok('취소 후 행 삭제됨', !TABLE.has(id2));
  ok('없는 건 취소 시 404', (await H({action:'cancel', id:id2, cancelKey:k2})).status === 404);

  // week isolation
  const l2 = await H({ action:'list', weekStart:'2026-08-31' });
  ok('다음 주는 비어 있음', l2.json.requests.length === 0);
  const l3 = await H({ action:'list', weekStart:'2026-08-24' });
  ok('이번 주 건수 정확', l3.json.requests.length === 4, '실제 ' + l3.json.requests.length);
  ok('반려 건은 목록에서 제외', await (async () => {
    const c = await H({...base, grade:6, classNo:1, room:'음악실'});
    await H({action:'decide', token, id:c.json.id, to:'declined'});
    const l = await H({ action:'list', weekStart:'2026-08-24' });
    return l.json.requests.length === 4;
  })());

  // no password configured
  delete process.env.TUTOR_ADMIN_PASSWORD;
  ok('비밀번호 미설정 시 로그인 503', (await H({action:'tutor_login', password:'x'})).status === 503);
  ok('비밀번호 미설정 시 수락 401', (await H({action:'decide', token, id:id1, to:'pending'})).status === 401);
  ok('비밀번호 미설정 플래그 false', (await H({action:'list', weekStart:'2026-08-24'})).json.tutorConfigured === false);

  console.log(`\n통과 ${pass} · 실패 ${fail}`);
  process.exit(fail ? 1 : 0);
})();
