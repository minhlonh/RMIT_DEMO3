create or replace function public.mark_order_paid(p_code text, p_amount int)
returns boolean
language plpgsql
security definer
as $$
declare
  o public.orders;
begin
  update public.orders
     set status = 'paid', paid_at = now()
   where code = p_code and status = 'pending' and amount <= p_amount
  returning * into o;

  if o.id is null then
    return false;
  end if;

  insert into public.profiles(id, is_premium)
  values (o.user_id, true)
  on conflict (id) do update set is_premium = true;

  return true;
end;
$$;

revoke execute on function public.mark_order_paid(text, int) from public, anon, authenticated;