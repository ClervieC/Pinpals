import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Rejoue les migrations dans un Postgres embarqué (PGlite) avec des stubs auth/storage,
// puis vérifie les règles RLS et les RPC. Lancer avec : npm run test:db
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'migrations');
const db = new PGlite();
const A='00000000-0000-0000-0000-00000000000a', B='00000000-0000-0000-0000-00000000000b', C='00000000-0000-0000-0000-00000000000c';
await db.exec(`
create role anon; create role authenticated;
create schema auth; create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.uid', true),'')::uuid $$;
grant usage on schema auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;
create schema storage;
create table storage.buckets(id text primary key, name text, public bool, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects(id serial, bucket_id text, name text);
create function storage.foldername(name text) returns text[] language sql as $$ select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1] $$;
alter table storage.objects enable row level security;
grant usage on schema public, storage to anon, authenticated;
grant all on storage.objects to authenticated; grant usage on sequence storage.objects_id_seq to authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
insert into auth.users values ('${A}'),('${B}'),('${C}');
`);
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
  await db.exec(fs.readFileSync(path.join(dir, file), 'utf8'));
  console.log('migration OK:', file);
}

let fails=0;
const as = async (uid, sql, params) => {
  await db.exec(`reset role; select set_config('request.uid','${uid ?? ''}',false); set role ${uid ? 'authenticated':'anon'};`);
  return db.query(sql, params);
};
const expectOk = async (label, uid, sql, check) => { try { const r = await as(uid, sql); const ok = check ? check(r.rows) : true; console.log(ok?'✔':'✘', label, ok?'':JSON.stringify(r.rows)); if(!ok) fails++; return r.rows; } catch(e){ console.log('✘', label, e.message); fails++; } };
const expectErr = async (label, uid, sql) => { try { await as(uid, sql); console.log('✘', label, '(no error)'); fails++; } catch(e){ console.log('✔', label, '->', e.message); } };

await expectOk('A creates profile', A, `insert into profiles(id, display_name) values ('${A}','Alice')`);
await expectOk('B creates profile', B, `insert into profiles(id, display_name, pin_color) values ('${B}','Bob','#CAFFBF')`);
await expectOk('C creates profile', C, `insert into profiles(id, display_name) values ('${C}','Chloé')`);
await expectErr('A cannot create profile for B', A, `insert into profiles(id, display_name) values ('${C}','x')`);
await expectErr('A cannot write lat directly', A, `update profiles set lat = 48.85 where id = '${A}'`);
await expectOk('A sets location via RPC', A, `select set_my_location('Paris','France','fr',48.8566,2.3522)`);
await expectOk('A location jittered but close', A, `select lat,lng,country_code from profiles where id='${A}'`, r => Math.abs(r[0].lat-48.8566)<=0.011 && r[0].lat!==48.8566 && r[0].country_code==='FR');
await expectOk('B sets location', B, `select set_my_location('Bucharest','Romania','RO',44.43,26.10)`);
await expectOk('A cannot see B yet', A, `select * from profiles where id='${B}'`, r => r.length===0);
const [{create_group: gid}] = await expectOk('A creates group', A, `select create_group('Promo 2020','🎓','#B5D8FF')`);
await expectOk('A is admin', A, `select role from group_members where group_id='${gid}'`, r => r.length===1 && r[0].role==='admin');
await expectErr('A cannot insert group directly', A, `insert into groups(name) values ('x')`);
const code = (await as(A, `select invite_code from groups where id='${gid}'`)).rows[0].invite_code;
console.log('  invite code', code);
await expectOk('anon preview by code', null, `select * from get_group_preview('${code.toLowerCase()}')`, r => r.length===1 && Number(r[0].member_count)===1);
await expectErr('anon cannot join', null, `select join_group('${code}')`);
await expectErr('B cannot self-insert membership', B, `insert into group_members(group_id,user_id) values ('${gid}','${B}')`);
await expectErr('B join with bad code', B, `select join_group('NOPE1234')`);
await expectOk('B cannot see group before join', B, `select * from groups`, r=>r.length===0);
await expectOk('B joins', B, `select join_group(' ${code.toLowerCase()} ')`, r => r[0].join_group===gid);
await expectOk('B joins twice (idempotent)', B, `select join_group('${code}')`);
await expectOk('A now sees B profile', A, `select display_name from profiles where id='${B}'`, r=>r.length===1);
await expectOk('C (outsider) sees nothing', C, `select * from profiles where id<>'${C}'`, r=>r.length===0);
await expectOk('C get_group_map empty', C, `select * from get_group_map('${gid}')`, r=>r.length===0);
await expectOk('B get_group_map sees 2', B, `select display_name, role from get_group_map('${gid}')`, r=>r.length===2);
await expectOk('B get_my_groups', B, `select * from get_my_groups()`, r=>r.length===1 && r[0].role==='member' && Number(r[0].member_count)===2);
await expectOk('B update group is a no-op (not admin)', B, `update groups set name='hack' where id='${gid}' returning *`, r=>r.length===0);
await expectErr('B cannot regenerate code', B, `select regenerate_invite_code('${gid}')`);
await expectErr('B cannot remove A', B, `select remove_member('${gid}','${A}')`);
await expectOk('A renames group', A, `update groups set name='Promo ENSAD 2020' where id='${gid}' returning name`, r=>r.length===1);
await expectErr('A cannot change invite_code directly', A, `update groups set invite_code='AAAAAAAA' where id='${gid}'`);
await expectOk('A regenerates code', A, `select regenerate_invite_code('${gid}')`, r=>r[0].regenerate_invite_code!==code);
await expectOk('A leaves -> B promoted admin', A, `select leave_group('${gid}')`);
await expectOk('B is now admin', B, `select role from group_members where group_id='${gid}'`, r=>r.length===1 && r[0].role==='admin');
await expectOk('A no longer sees B', A, `select * from profiles where id='${B}'`, r=>r.length===0);
await expectOk('B leaves -> group deleted', B, `select leave_group('${gid}')`);
await expectOk('group gone', null, `select * from get_group_preview('${code}')`, r=>r.length===0);
await expectOk('A avatar upload own folder', A, `insert into storage.objects(bucket_id,name) values ('avatars','${A}/1.jpg')`);
await expectErr('A avatar upload in B folder', A, `insert into storage.objects(bucket_id,name) values ('avatars','${B}/1.jpg')`);
await expectErr('anon cannot call get_group_map', null, `select * from get_group_map('${gid}')`);
await expectOk('A upsert own profile (PostgREST style)', A, `insert into profiles(id, display_name, pin_color) values ('${A}','Alice2','#FFD6A5') on conflict(id) do update set id=excluded.id, display_name=excluded.display_name, pin_color=excluded.pin_color returning display_name`, r=>r[0].display_name==='Alice2');
await expectErr('A cannot move profile id', A, `update profiles set id='00000000-0000-0000-0000-0000000000ff' where id='${A}'`);
console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
