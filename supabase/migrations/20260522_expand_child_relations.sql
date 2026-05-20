-- きょうだい以外（いとこ・再従兄弟・友達）の関係タイプを追加
alter table public.child_sibling_relations
  drop constraint if exists child_sibling_relations_relation_check;

alter table public.child_sibling_relations
  add constraint child_sibling_relations_relation_check
  check (relation in (
    'older_brother', 'older_sister', 'younger_brother', 'younger_sister', 'twin',
    'cousin_older', 'cousin_younger',
    'second_cousin_older', 'second_cousin_younger',
    'friend'
  ));
