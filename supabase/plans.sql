alter table public.orders add column if not exists plan text not null default 'month';
alter table public.profiles add column if not exists premium_until timestamptz;

create or replace function public.mark_order_paid(p_code text, p_amount int)
returns boolean
language plpgsql
security definer
as $$
declare
  o public.orders;
  d int;
begin
  update public.orders
     set status = 'paid', paid_at = now()
   where code = p_code and status = 'pending' and amount <= p_amount
  returning * into o;

  if o.id is null then
    return false;
  end if;

  d := case o.plan when 'year' then 365 else 30 end;

  insert into public.profiles(id, is_premium, premium_until)
  values (o.user_id, true, now() + make_interval(days => d))
  on conflict (id) do update
    set is_premium = true,
        premium_until = greatest(coalesce(public.profiles.premium_until, now()), now())
                        + make_interval(days => d);

  return true;
end;
$$;

revoke execute on function public.mark_order_paid(text, int) from public, anon, authenticated;