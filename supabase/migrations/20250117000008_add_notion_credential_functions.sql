-- Add function to encrypt Notion credentials
CREATE OR REPLACE FUNCTION public.encrypt_notion_credentials(access_token_in text, bot_id_in text)
 RETURNS TABLE(access_token_out bytea, bot_id_out bytea)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  return query
  select
    pgp_sym_encrypt(access_token_in, '5zk_?Tq]qwV.zug2xqD8Wmv8R?PxDB]R'),
    pgp_sym_encrypt(bot_id_in, '5zk_?Tq]qwV.zug2xqD8Wmv8R?PxDB]R');
end;
$function$;

-- Add function to decrypt Notion access tokens from connected_integrations
CREATE OR REPLACE FUNCTION public.decrypt_notion_access_token(integration_id_in uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    encrypted_token text;
    decrypted_token text;
BEGIN
    -- Get the encrypted access token
    SELECT credentials->>'access_token' INTO encrypted_token
    FROM connected_integrations 
    WHERE id = integration_id_in;
    
    IF encrypted_token IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Decrypt using the same key as encryption
    SELECT pgp_sym_decrypt(
        encrypted_token::bytea, 
        '5zk_?Tq]qwV.zug2xqD8Wmv8R?PxDB]R'
    ) INTO decrypted_token;
    
    RETURN decrypted_token;
END;
$function$;

-- Add function to decrypt Notion bot IDs from connected_integrations
CREATE OR REPLACE FUNCTION public.decrypt_notion_bot_id(integration_id_in uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    encrypted_bot_id text;
    decrypted_bot_id text;
BEGIN
    -- Get the encrypted bot ID
    SELECT credentials->>'bot_id' INTO encrypted_bot_id
    FROM connected_integrations 
    WHERE id = integration_id_in;
    
    IF encrypted_bot_id IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Decrypt using the same key as encryption
    SELECT pgp_sym_decrypt(
        encrypted_bot_id::bytea, 
        '5zk_?Tq]qwV.zug2xqD8Wmv8R?PxDB]R'
    ) INTO decrypted_bot_id;
    
    RETURN decrypted_bot_id;
END;
$function$; 