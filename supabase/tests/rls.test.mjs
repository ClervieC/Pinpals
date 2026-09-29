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

// --- Fiche, adresse, notes privées, souvenirs --------------------------------
console.log('\n— friendship');
const [{create_group: g2}] = await expectOk('A creates group 2', A, `select create_group('Amis','🌸','#FFB5C2')`);
const code2 = (await as(A, `select invite_code from groups where id='${g2}'`)).rows[0].invite_code;
await expectOk('B joins group 2', B, `select join_group('${code2}')`);
await expectOk('A fills birthday + favorites', A, `update profiles set birthday_day=12, birthday_month=3, favorites='{"food":"sushi"}', wishlist='un vinyle' where id='${A}' returning birthday_day`, r=>r[0].birthday_day===12);
await expectErr('birthday day without month rejected', A, `update profiles set birthday_month=null where id='${A}'`);
await expectOk('B sees A birthday', B, `select birthday_day, birthday_month, favorites, wishlist from profiles where id='${A}'`, r=>r.length===1 && r[0].birthday_month===3 && r[0].favorites.food==='sushi');
await expectOk('C cannot see A card', C, `select * from profiles where id='${A}'`, r=>r.length===0);

await expectOk('A saves address', A, `insert into addresses(user_id,line1,city,postal_code) values ('${A}','12 rue des Lilas','Paris','75011')`);
await expectErr('A cannot write B address', A, `insert into addresses(user_id,line1,city) values ('${B}','x','y')`);
await expectOk('B cannot see A address before share', B, `select * from addresses where user_id='${A}'`, r=>r.length===0);
await expectErr('A cannot share address with outsider C', A, `insert into address_shares(owner_id,viewer_id) values ('${A}','${C}')`);
await expectErr('B cannot grant himself A address', B, `insert into address_shares(owner_id,viewer_id) values ('${A}','${B}')`);
await expectOk('A shares address with B', A, `insert into address_shares(owner_id,viewer_id) values ('${A}','${B}')`);
await expectOk('B sees A address', B, `select line1 from addresses where user_id='${A}'`, r=>r.length===1 && r[0].line1==='12 rue des Lilas');
await expectOk('C still cannot see A address', C, `select * from addresses`, r=>r.length===0);
await expectOk('B cannot edit A address (no-op)', B, `update addresses set city='hack' where user_id='${A}' returning *`, r=>r.length===0);
await expectOk('B cannot delete the share (no-op)', B, `delete from address_shares where owner_id='${A}' returning *`, r=>r.length===0);

await expectOk('A writes private note on B', A, `insert into friend_notes(author_id,friend_id,gift_ideas) values ('${A}','${B}','un livre de cuisine')`);
await expectOk('A upserts note (PostgREST style)', A, `insert into friend_notes(author_id,friend_id,gift_ideas) values ('${A}','${B}','une plante') on conflict(author_id,friend_id) do update set author_id=excluded.author_id, friend_id=excluded.friend_id, gift_ideas=excluded.gift_ideas returning gift_ideas`, r=>r[0].gift_ideas==='une plante');
await expectOk('B cannot read notes about him', B, `select * from friend_notes`, r=>r.length===0);
await expectErr('A cannot note an outsider', A, `insert into friend_notes(author_id,friend_id,notes) values ('${A}','${C}','x')`);
await expectErr('A cannot forge a note as B', A, `insert into friend_notes(author_id,friend_id,notes) values ('${B}','${A}','x')`);

const [{create_memory: m1}] = await expectOk('A creates duo trip with B', A, `select create_memory('Road trip Lisbonne','trip','Trop bien','Lisbonne','2025-07-01','2025-07-10',null,array['${B}']::uuid[])`);
await expectOk('B sees the trip', B, `select title, kind from memories where id='${m1}'`, r=>r.length===1 && r[0].kind==='trip');
await expectOk('C cannot see the trip', C, `select * from memories`, r=>r.length===0);
await expectErr('A cannot tag outsider C', A, `select create_memory('x','memory',null,null,null,null,null,array['${C}']::uuid[])`);
await expectErr('A cannot create memory without audience', A, `select create_memory('solo')`);
await expectErr('A cannot insert memory directly', A, `insert into memories(author_id,title) values ('${A}','x')`);
await expectErr('bad date range rejected', A, `select create_memory('x','trip',null,null,'2025-07-10','2025-07-01',null,array['${B}']::uuid[])`);
await expectErr('C cannot post in group 2', C, `select create_memory('x','memory',null,null,null,null,'${g2}','{}')`);
const [{create_memory: m2}] = await expectOk('B creates group memory', B, `select create_memory('Soirée','memory',null,null,'2025-12-31',null,'${g2}','{}')`);
await expectOk('A sees group memory', A, `select * from memories where id='${m2}'`, r=>r.length===1);
await expectOk('B edits own memory', B, `update memories set title='Soirée du nouvel an' where id='${m2}' returning title`, r=>r.length===1);
await expectOk('A cannot edit B memory (no-op)', A, `update memories set title='hack' where id='${m2}' returning *`, r=>r.length===0);
await expectErr('B cannot move memory to another group', B, `update memories set group_id='${gid}' where id='${m2}'`);
await expectErr('B cannot tag people directly', B, `insert into memory_people(memory_id,user_id) values ('${m1}','${C}')`);
await expectErr('B cannot retag A trip', B, `select set_memory_people('${m1}', array['${B}']::uuid[])`);

await expectOk('B adds photo to A trip (shared scrapbook)', B, `insert into storage.objects(bucket_id,name) values ('memories','${m1}/b1.jpg')`);
await expectOk('B registers the photo', B, `insert into memory_photos(memory_id,path) values ('${m1}','${m1}/b1.jpg')`);
await expectErr('C cannot upload into A trip', C, `insert into storage.objects(bucket_id,name) values ('memories','${m1}/c1.jpg')`);
await expectErr('C cannot register a photo', C, `insert into memory_photos(memory_id,path,uploaded_by) values ('${m1}','${m1}/c1.jpg','${C}')`);
await expectErr('photo path must match memory', B, `insert into memory_photos(memory_id,path) values ('${m1}','${m2}/x.jpg')`);
await expectErr('bad folder name rejected', B, `insert into storage.objects(bucket_id,name) values ('memories','not-a-uuid/x.jpg')`);
await expectOk('C cannot list trip photos', C, `select * from storage.objects where bucket_id='memories'`, r=>r.length===0);
await expectOk('A (author) sees B photo', A, `select * from memory_photos where memory_id='${m1}'`, r=>r.length===1);
await expectOk('get_memories for A: 2', A, `select * from get_memories()`, r=>r.length===2);
await expectOk('get_memories filtered by friend B', A, `select title, photo_count, cover_path, people from get_memories(null,'${B}')`, r=>r.length===2 && r.some(m=>Number(m.photo_count)===1 && m.cover_path===`${m1}/b1.jpg`));
await expectOk('get_memories filtered by group', A, `select * from get_memories('${g2}')`, r=>r.length===1);
await expectOk('C get_memories empty', C, `select * from get_memories()`, r=>r.length===0);
await expectOk('A (author) deletes B photo', A, `delete from storage.objects where bucket_id='memories' and name='${m1}/b1.jpg' returning *`, r=>r.length===1);

// Quand B quitte le groupe, l'adresse partagée et les souvenirs de groupe disparaissent pour lui.
const [{create_memory: m3}] = await expectOk('A creates group memory', A, `select create_memory('Pique-nique','memory',null,null,null,null,'${g2}','{}')`);
await expectOk('B leaves group 2', B, `select leave_group('${g2}')`);
await expectOk('B no longer sees A address', B, `select * from addresses`, r=>r.length===0);
await expectOk('B no longer sees A group memory', B, `select * from memories where id='${m3}'`, r=>r.length===0);
await expectOk('B still sees his own group memory (author)', B, `select * from memories where id='${m2}'`, r=>r.length===1);
await expectOk('B still sees duo trip (tagged)', B, `select * from memories where id='${m1}'`, r=>r.length===1);
await expectOk('A deletes her trip', A, `delete from memories where id='${m1}' returning *`, r=>r.length===1);
await expectErr('anon cannot read memories', null, `select * from memories`);
await expectErr('anon cannot read addresses', null, `select * from addresses`);
console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
