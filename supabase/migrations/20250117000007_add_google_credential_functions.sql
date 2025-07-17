-- Add function to encrypt Google credentials
CREATE OR REPLACE FUNCTION public.encrypt_google_credentials(access_token_in text, refresh_token_in text)
 RETURNS TABLE(access_token_out bytea, refresh_token_out bytea)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  return query
  select
    pgp_sym_encrypt(access_token_in,  '5zk_?Tq]qwV.zug2xqD8Wmv8R?PxDB]R'),
    CASE 
      WHEN refresh_token_in IS NOT NULL THEN pgp_sym_encrypt(refresh_token_in, '5zk_?Tq]qwV.zug2xqD8Wmv8R?PxDB]R')
      ELSE NULL
    END;
end;
$function$;

-- Add function to decrypt Google access tokens from connected_integrations
CREATE OR REPLACE FUNCTION public.decrypt_google_access_token(integration_id_in uuid)
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

-- Add function to decrypt Google refresh tokens from connected_integrations
CREATE OR REPLACE FUNCTION public.decrypt_google_refresh_token(integration_id_in uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    encrypted_token text;
    decrypted_token text;
BEGIN
    -- Get the encrypted refresh token
    SELECT credentials->>'refresh_token' INTO encrypted_token
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