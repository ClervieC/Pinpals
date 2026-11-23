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

// Notes privées multiples (friend_private_notes) : visibles et modifiables uniquement par leur auteur.
const [{id: pn1}] = await expectOk('A adds gift note on B', A, `insert into friend_private_notes(friend_id,kind,body) values ('${B}','gift','un vinyle') returning id`);
await expectOk('A adds address note on B', A, `insert into friend_private_notes(friend_id,kind,body) values ('${B}','address','3 rue du Port, Nantes')`);
await expectOk('A sees her 2 notes', A, `select kind from friend_private_notes where friend_id='${B}'`, r=>r.length===2);
await expectOk('B cannot read notes about him', B, `select * from friend_private_notes`, r=>r.length===0);
await expectErr('A cannot note an outsider (multi)', A, `insert into friend_private_notes(friend_id,body) values ('${C}','x')`);
await expectErr('A cannot forge a note as B (multi)', A, `insert into friend_private_notes(author_id,friend_id,body) values ('${B}','${A}','x')`);
await expectErr('bad kind rejected', A, `insert into friend_private_notes(friend_id,kind,body) values ('${B}','secret','x')`);
await expectErr('empty note rejected', A, `insert into friend_private_notes(friend_id,body) values ('${B}','  ')`);
await expectOk('A edits her note', A, `update friend_private_notes set body='deux vinyles', kind='gift' where id='${pn1}' returning body`, r=>r[0]?.body==='deux vinyles');
await expectErr('A cannot move note to another friend', A, `update friend_private_notes set friend_id='${C}' where id='${pn1}'`);
await expectOk('B cannot edit A note (no-op)', B, `update friend_private_notes set body='hack' where id='${pn1}' returning *`, r=>r.length===0);
await expectOk('B cannot delete A note (no-op)', B, `delete from friend_private_notes where id='${pn1}' returning *`, r=>r.length===0);
await expectOk('A deletes her note', A, `delete from friend_private_notes where id='${pn1}' returning *`, r=>r.length===1);

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
// Tout le groupe ajoute des photos au souvenir d'un autre membre.
await expectOk('A (group member) uploads to B group memory', A, `insert into storage.objects(bucket_id,name) values ('memories','${m2}/a1.jpg')`);
const [{id: pa}] = await expectOk('A registers photo on B group memory', A, `insert into memory_photos(memory_id,path) values ('${m2}','${m2}/a1.jpg') returning id`);
// Date et légende d'une photo.
const [{id: pb}] = await expectOk('get B photo id', B, `select id from memory_photos where path='${m1}/b1.jpg'`, r=>r.length===1);
await expectOk('B (uploader) dates and captions his photo', B, `update memory_photos set taken_on='2025-07-03', caption='Coucher de soleil' where id='${pb}' returning caption`, r=>r[0]?.caption==='Coucher de soleil');
await expectOk('A (memory author) edits caption too', A, `update memory_photos set caption='Belém au coucher du soleil' where id='${pb}' returning caption`, r=>r.length===1);
await expectOk('B (memory author) captions A photo', B, `update memory_photos set caption='Photo de groupe' where id='${pa}' returning caption`, r=>r.length===1);
await expectOk('C cannot caption (no-op)', C, `update memory_photos set caption='hack' where id='${pb}' returning *`, r=>r.length===0);
await expectErr('nobody can move a photo to another path', B, `update memory_photos set path='${m1}/x.jpg' where id='${pb}'`);
await expectErr('caption too long rejected', B, `update memory_photos set caption=repeat('a',501) where id='${pb}'`);
// Likes.
await expectOk('A likes B photo', A, `insert into memory_photo_likes(photo_id) values ('${pb}')`);
await expectErr('A cannot like twice', A, `insert into memory_photo_likes(photo_id) values ('${pb}')`);
await expectOk('B likes his photo', B, `insert into memory_photo_likes(photo_id) values ('${pb}')`);
await expectOk('B sees 2 likes', B, `select * from memory_photo_likes where photo_id='${pb}'`, r=>r.length===2);
await expectErr('C cannot like', C, `insert into memory_photo_likes(photo_id,user_id) values ('${pb}','${C}')`);
await expectErr('B cannot like as A', B, `insert into memory_photo_likes(photo_id,user_id) values ('${pa}','${A}')`);
await expectOk('C sees no likes', C, `select * from memory_photo_likes`, r=>r.length===0);
await expectOk('B cannot remove A like (no-op)', B, `delete from memory_photo_likes where photo_id='${pb}' and user_id='${A}' returning *`, r=>r.length===0);
await expectOk('A unlikes', A, `delete from memory_photo_likes where photo_id='${pb}' and user_id='${A}' returning *`, r=>r.length===1);
// Commentaires sous une photo.
const [{id: pc}] = await expectOk('A comments B photo', A, `insert into memory_photo_comments(photo_id,body) values ('${pb}','Magnifique') returning id`);
await expectOk('B sees the photo comment', B, `select body from memory_photo_comments where photo_id='${pb}'`, r=>r.length===1);
await expectErr('C cannot comment the photo', C, `insert into memory_photo_comments(photo_id,body) values ('${pb}','x')`);
await expectOk('C sees no photo comments', C, `select * from memory_photo_comments`, r=>r.length===0);
await expectErr('photo comment cannot be edited', A, `update memory_photo_comments set body='x' where id='${pc}'`);
await expectOk('B (not author of trip) cannot delete A comment (no-op)', B, `delete from memory_photo_comments where id='${pc}' returning *`, r=>r.length===0);
await expectOk('A comments again', A, `insert into memory_photo_comments(photo_id,body) values ('${pb}','On y retourne ?')`);
await expectOk('get_memories for A: 2', A, `select * from get_memories()`, r=>r.length===2);
await expectOk('get_memories filtered by friend B', A, `select title, photo_count, cover_path, people from get_memories(null,'${B}')`, r=>r.length===2 && r.some(m=>Number(m.photo_count)===1 && m.cover_path===`${m1}/b1.jpg`));
await expectOk('get_memories filtered by group', A, `select * from get_memories('${g2}')`, r=>r.length===1);
await expectOk('C get_memories empty', C, `select * from get_memories()`, r=>r.length===0);
// Étapes (carte des souvenirs)
const stops = `'[{"name":"Lisbonne","country_code":"pt","lat":38.72,"lng":-9.14},{"name":"Porto","country_code":"PT","lat":41.15,"lng":-8.61}]'::jsonb`;
await expectOk('A sets trip stops', A, `select set_memory_stops('${m1}', ${stops})`);
await expectOk('B sees stops in order', B, `select name, country_code from memory_stops where memory_id='${m1}' order by position`, r=>r.length===2 && r[0].name==='Lisbonne' && r[0].country_code==='PT');
await expectOk('C cannot see stops', C, `select * from memory_stops`, r=>r.length===0);
await expectErr('B (not author) cannot set stops', B, `select set_memory_stops('${m1}', '[]'::jsonb)`);
await expectErr('A cannot insert stop directly', A, `insert into memory_stops(memory_id,position,name,lat,lng) values ('${m1}',5,'x',0,0)`);
await expectErr('bad latitude rejected', A, `select set_memory_stops('${m1}', '[{"name":"x","lat":120,"lng":0}]'::jsonb)`);
await expectOk('get_memories returns stops + photo paths', A, `select stops, photo_paths from get_memories() where id='${m1}'`, r=>r.length===1 && r[0].stops.length===2 && r[0].stops[1].name==='Porto' && r[0].photo_paths.length===1);
await expectOk('A replaces stops', A, `select set_memory_stops('${m1}', '[{"name":"Madrid","country_code":"ES","lat":40.4,"lng":-3.7}]'::jsonb)`);
await expectOk('only the new stop remains', B, `select name from memory_stops where memory_id='${m1}'`, r=>r.length===1 && r[0].name==='Madrid');
// Commentaires : l'audience du souvenir commente ; l'auteur du commentaire ou du souvenir supprime.
const [{id: c1}] = await expectOk('B comments A trip', B, `insert into memory_comments(memory_id,body) values ('${m1}','Meilleur voyage !') returning id`);
await expectOk('A sees B comment', A, `select body, author_id from memory_comments where memory_id='${m1}'`, r=>r.length===1 && r[0].author_id===B);
await expectOk('C cannot see comments', C, `select * from memory_comments`, r=>r.length===0);
await expectErr('C cannot comment A trip', C, `insert into memory_comments(memory_id,body) values ('${m1}','x')`);
await expectErr('B cannot comment as A', B, `insert into memory_comments(memory_id,author_id,body) values ('${m1}','${A}','x')`);
await expectErr('empty comment rejected', B, `insert into memory_comments(memory_id,body) values ('${m1}','   ')`);
await expectErr('B cannot edit comment', B, `update memory_comments set body='edited' where id='${c1}'`);
const [{id: c2}] = await expectOk('A comments her trip', A, `insert into memory_comments(memory_id,body) values ('${m1}','Merci 🥹') returning id`);
await expectOk('B cannot delete A comment (no-op)', B, `delete from memory_comments where id='${c2}' returning *`, r=>r.length===0);
await expectOk('A (memory author) deletes B comment', A, `delete from memory_comments where id='${c1}' returning *`, r=>r.length===1);
await expectOk('A deletes own comment', A, `delete from memory_comments where id='${c2}' returning *`, r=>r.length===1);
await expectOk('B comments again (kept for cascade test)', B, `insert into memory_comments(memory_id,body) values ('${m1}','À refaire')`);
await expectOk('A (author) deletes B photo', A, `delete from storage.objects where bucket_id='memories' and name='${m1}/b1.jpg' returning *`, r=>r.length===1);

// Quand B quitte le groupe, l'adresse partagée et les souvenirs de groupe disparaissent pour lui.
const [{create_memory: m3}] = await expectOk('A creates group memory', A, `select create_memory('Pique-nique','memory',null,null,null,null,'${g2}','{}')`);
await expectOk('B leaves group 2', B, `select leave_group('${g2}')`);
await expectOk('B no longer sees A address', B, `select * from addresses`, r=>r.length===0);
await expectOk('B no longer sees A group memory', B, `select * from memories where id='${m3}'`, r=>r.length===0);
await expectOk('B still sees his own group memory (author)', B, `select * from memories where id='${m2}'`, r=>r.length===1);
await expectOk('B still sees duo trip (tagged)', B, `select * from memories where id='${m1}'`, r=>r.length===1);
await expectOk('A deletes her trip', A, `delete from memories where id='${m1}' returning *`, r=>r.length===1);
await expectOk('comments deleted with the trip', A, `select * from memory_comments where memory_id='${m1}'`, r=>r.length===0);
await expectOk('photo likes/comments deleted with the trip', A, `select (select count(*) from memory_photo_likes) + (select count(*) from memory_photo_comments) as n`, r=>Number(r[0].n)===0);
await expectErr('anon cannot read memories', null, `select * from memories`);
await expectErr('anon cannot read addresses', null, `select * from addresses`);
await expectErr('anon cannot read comments', null, `select * from memory_comments`);
await expectErr('anon cannot read private notes', null, `select * from friend_private_notes`);
await expectErr('anon cannot read photo likes', null, `select * from memory_photo_likes`);
await expectErr('anon cannot read photo comments', null, `select * from memory_photo_comments`);

// Miniatures : même dossier que la photo ; get_memories les renvoie pour la couverture.
const [{create_memory: m4}] = await expectOk('A creates memory for thumbs', A, `select create_memory('Brunch','memory',null,null,null,null,'${g2}','{}')`);
await expectOk('A registers photo with thumb', A, `insert into memory_photos(memory_id,path,thumb_path) values ('${m4}','${m4}/p.jpg','${m4}/p.thumb.jpg')`);
await expectErr('thumb must live in the memory folder', A, `insert into memory_photos(memory_id,path,thumb_path) values ('${m4}','${m4}/q.jpg','${m1}/q.thumb.jpg')`);
await expectErr('thumb cannot be changed afterwards', A, `update memory_photos set thumb_path='${m4}/x.jpg' where memory_id='${m4}'`);
await expectOk('get_memories returns the thumb as cover', A, `select cover_path, photo_paths from get_memories() where id='${m4}'`, r=>r[0]?.cover_path===`${m4}/p.thumb.jpg` && r[0].photo_paths[0]===`${m4}/p.thumb.jpg`);
await expectErr('friend_notes table is gone', A, `select * from friend_notes`);

// Suppression de compte : groupes quittés proprement, puis tout part en cascade.
await expectErr('anon cannot delete an account', null, `select delete_my_account()`);
const [{create_group: g3}] = await expectOk('B creates group 3', B, `select create_group('G3','🎈','#B5D8FF')`);
const code3 = (await as(B, `select invite_code from groups where id='${g3}'`)).rows[0].invite_code;
await expectOk('A joins group 3', A, `select join_group('${code3}')`);
const [{create_memory: m5}] = await expectOk('B posts in group 3', B, `select create_memory('Adieu','memory',null,null,null,null,'${g3}','{}')`);
await expectOk('A comments B memory', A, `insert into memory_comments(memory_id,body) values ('${m5}','Salut')`);
await expectOk('B deletes his account', B, `select delete_my_account()`);
await expectOk('B profile gone', A, `select * from profiles where id='${B}'`, r=>r.length===0);
await expectOk('B memory gone (with its comments)', A, `select * from memories where id='${m5}'`, r=>r.length===0);
await expectOk('A promoted admin of group 3', A, `select role from group_members where group_id='${g3}' and user_id='${A}'`, r=>r[0]?.role==='admin');
await expectOk('group 3 kept for A', A, `select * from get_my_groups() where id='${g3}'`, r=>r.length===1 && Number(r[0].member_count)===1);
await db.exec('reset role');
const bGone = (await db.query(`select * from auth.users where id='${B}'`)).rows.length===0;
console.log(bGone ? '✔' : '✘', 'B auth user deleted'); if (!bGone) fails++;
await expectOk('A account untouched', A, `select * from profiles where id='${A}'`, r=>r.length===1);

// Inviter un·e ami·e existant·e : seulement quelqu'un avec qui je partage un groupe, et il faut accepter.
const D='00000000-0000-0000-0000-00000000000d';
await db.exec(`reset role; insert into auth.users values ('${D}')`);
await expectOk('D creates profile', D, `insert into profiles(id, display_name) values ('${D}','Dan')`);
const [{create_group: g5}] = await expectOk('A creates group 5', A, `select create_group('G5','🍕','#B5D8FF')`);
const code5 = (await as(A, `select invite_code from groups where id='${g5}'`)).rows[0].invite_code;
await expectOk('C joins group 5 (A and C are friends)', C, `select join_group('${code5}')`);
const [{create_group: g4}] = await expectOk('A creates group 4', A, `select create_group('G4','🏖️','#B5D8FF')`);
await expectOk('A sees C as invitable (not D)', A, `select id, invited from get_invitable_friends('${g4}')`, r=>r.length===1 && r[0].id===C && r[0].invited===false);
await expectOk('D sees nobody to invite in group 4', D, `select * from get_invitable_friends('${g4}')`, r=>r.length===0);
await expectErr('A cannot invite D (not a friend)', A, `select invite_to_group('${g4}','${D}')`);
await expectErr('A cannot invite herself', A, `select invite_to_group('${g4}','${A}')`);
await expectErr('D cannot invite into a group he is not in', D, `select invite_to_group('${g4}','${A}')`);
await expectErr('C cannot write invitations directly', C, `insert into group_invitations(group_id,invitee_id,inviter_id) values ('${g4}','${C}','${A}')`);
await expectOk('A invites C', A, `select invite_to_group('${g4}','${C}')`);
await expectOk('A invites C twice (idempotent)', A, `select invite_to_group('${g4}','${C}')`);
await expectOk('C now shows as invited', A, `select invited from get_invitable_friends('${g4}')`, r=>r[0]?.invited===true);
await expectOk('C is not a member yet', C, `select * from get_my_groups() where id='${g4}'`, r=>r.length===0);
await expectOk('C cannot see group 4 itself', C, `select * from groups where id='${g4}'`, r=>r.length===0);
await expectOk('C sees the invitation', C, `select * from get_my_invitations()`, r=>r.length===1 && r[0].group_id===g4 && r[0].inviter_name==='Alice2' && Number(r[0].member_count)===1);
await expectOk('D sees no invitation', D, `select * from group_invitations`, r=>r.length===0);
await expectOk('A cancels the invitation', A, `select cancel_group_invitation('${g4}','${C}')`);
await expectOk('invitation gone after cancel', C, `select * from get_my_invitations()`, r=>r.length===0);
await expectErr('C cannot answer a cancelled invitation', C, `select respond_to_invitation('${g4}', true)`);
await expectOk('A invites C again', A, `select invite_to_group('${g4}','${C}')`);
await expectOk('C declines', C, `select respond_to_invitation('${g4}', false)`);
await expectOk('declined: C not a member, invitation gone', C, `select (select count(*) from get_my_groups() where id='${g4}') + (select count(*) from get_my_invitations()) as n`, r=>Number(r[0].n)===0);
await expectOk('A invites C a third time', A, `select invite_to_group('${g4}','${C}')`);
await expectOk('C accepts', C, `select respond_to_invitation('${g4}', true)`);
await expectOk('C is now a member', C, `select role from group_members where group_id='${g4}' and user_id='${C}'`, r=>r[0]?.role==='member');
await expectOk('invitation consumed', C, `select * from get_my_invitations()`, r=>r.length===0);
await expectErr('cannot invite someone already in the group', A, `select invite_to_group('${g4}','${C}')`);
await expectOk('nobody left to invite', A, `select * from get_invitable_friends('${g4}')`, r=>r.length===0);
const [{create_group: g6}] = await expectOk('A creates group 6', A, `select create_group('G6','🎸','#B5D8FF')`);
const code6 = (await as(A, `select invite_code from groups where id='${g6}'`)).rows[0].invite_code;
await expectOk('A invites C to group 6', A, `select invite_to_group('${g6}','${C}')`);
await expectOk('C joins group 6 by link instead', C, `select join_group('${code6}')`);
await expectOk('joining by link clears the invitation', C, `select * from get_my_invitations()`, r=>r.length===0);
await expectErr('anon cannot list invitations', null, `select * from get_my_invitations()`);
await expectErr('anon cannot read invitations', null, `select * from group_invitations`);

// Notifications dans l'app : écrites par des triggers, chacun ne lit que les siennes.
const notifs = (uid) => as(uid, `select kind, actor_id, memory_id, photo_id, group_id, data, read_at from get_my_notifications()`).then(r=>r.rows);
await as(A, `select mark_notifications_read()`); await as(C, `select mark_notifications_read()`);
await db.exec(`reset role; delete from notifications`);
const [{create_memory: n1}] = await expectOk('A posts a memory in group 4', A, `select create_memory('Pique-nique','memory',null,null,null,null,'${g4}','{}')`);
await expectOk('C notified of the new group memory', C, `select kind, actor_id from get_my_notifications()`, r=>r.length===1 && r[0].kind==='group_memory' && r[0].actor_id===A);
await expectOk('A not notified of her own memory', A, `select * from get_my_notifications()`, r=>r.length===0);
await expectOk('C comments A memory', C, `insert into memory_comments(memory_id,body) values ('${n1}','Trop bien')`);
await expectOk('A notified of the comment', A, `select kind, memory_title from get_my_notifications()`, r=>r.length===1 && r[0].kind==='memory_comment' && r[0].memory_title==='Pique-nique');
await expectOk('A comments her own memory: no notification', A, `insert into memory_comments(memory_id,body) values ('${n1}','Merci')`);
await expectOk('still one notification for A', A, `select * from get_my_notifications()`, r=>r.length===1);
const [{id: np}] = await expectOk('A adds a photo', A, `insert into memory_photos(memory_id,path) values ('${n1}','${n1}/a.jpg') returning id`);
await expectOk('C likes the photo', C, `insert into memory_photo_likes(photo_id) values ('${np}')`);
await expectOk('A notified of the like', A, `select * from get_my_notifications() where kind='photo_like'`, r=>r.length===1 && r[0].photo_id===np);
await expectOk('C unlikes', C, `delete from memory_photo_likes where photo_id='${np}'`);
await expectOk('like notification removed', A, `select * from get_my_notifications() where kind='photo_like'`, r=>r.length===0);
await expectOk('C comments the photo', C, `insert into memory_photo_comments(photo_id,body) values ('${np}','Belle photo')`);
await expectOk('A notified once of the photo comment', A, `select * from get_my_notifications() where kind='photo_comment'`, r=>r.length===1);
const [{create_memory: n2}] = await expectOk('A tags C in a group memory', A, `select create_memory('Concert','memory',null,null,null,null,'${g4}',array['${C}']::uuid[])`);
await expectOk('C gets "tagged", not also "group_memory"', C, `select kind from get_my_notifications() where memory_id='${n2}'`, r=>r.length===1 && r[0].kind==='tagged');
await expectOk('A rewrites the people list', A, `select set_memory_people('${n2}', array['${C}']::uuid[])`);
await expectOk('C still tagged only once', C, `select * from get_my_notifications() where memory_id='${n2}'`, r=>r.length===1);
await expectOk('D joins group 5', D, `select join_group('${code5}')`);
await expectOk('A and C notified that D joined', A, `select (select count(*) from get_my_notifications() where kind='member_joined') as a`, r=>Number(r[0].a)===1);
await expectOk('C notified that D joined', C, `select group_id from get_my_notifications() where kind='member_joined'`, r=>r.length===1 && r[0].group_id===g5);
await expectOk('D sets his first city: nobody notified', D, `select set_my_location('Paris','France','fr',48.85,2.35)`);
await expectOk('no move notification for a first city', A, `select * from get_my_notifications() where kind='moved'`, r=>r.length===0);
await expectOk('D moves to Lyon', D, `select set_my_location('Lyon','France','fr',45.76,4.83)`);
await expectOk('A notified of the move, with the new city', A, `select data from get_my_notifications() where kind='moved'`, r=>r.length===1 && r[0].data.city==='Lyon');
await expectOk('D sees no notification about others', D, `select * from notifications`, r=>r.every(n=>n.user_id===D));
await expectErr('nobody can write a notification directly', C, `insert into notifications(user_id,actor_id,kind) values ('${A}','${C}','moved')`);
await expectErr('notify() is internal', C, `select notify('${A}','${C}','moved')`);
await expectErr('cannot mark notifications read by hand', C, `update notifications set read_at=now()`);
await expectOk('C has unread notifications', C, `select count_unread_notifications() as n`, r=>Number(r[0].n)>=3);
await expectOk('C marks all read', C, `select mark_notifications_read()`);
await expectOk('C has no unread left', C, `select count_unread_notifications() as n`, r=>Number(r[0].n)===0);
await expectOk('A still has unread (separate)', A, `select count_unread_notifications() as n`, r=>Number(r[0].n)>0);
await expectOk('C leaves group 4', C, `select leave_group('${g4}')`);
await expectOk('group 4 notifications hidden once C left, except the memory she is tagged in', C, `select kind, memory_id from get_my_notifications() where group_id='${g4}'`, r=>r.length===1 && r[0].kind==='tagged' && r[0].memory_id===n2);
await expectOk('C deletes a notification', C, `delete from notifications where user_id='${C}' returning *`, r=>r.length>0);
await expectErr('anon cannot list notifications', null, `select * from get_my_notifications()`);
await expectErr('anon cannot read notifications', null, `select * from notifications`);
console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
