-- Add function to encrypt Discord credentials
CREATE OR REPLACE FUNCTION public.encrypt_discord_credentials(bot_token_in text, user_token_in text)
 RETURNS TABLE(bot_token_out bytea, user_token_out bytea)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  return query
  select
    pgp_sym_encrypt(bot_token_in,  '5zk_?Tq]qwV.zug2xqD8Wmv8R?PxDB]R'),
    pgp_sym_encrypt(user_token_in, '5zk_?Tq]qwV.zug2xqD8Wmv8R?PxDB]R');
end;
$function$; 