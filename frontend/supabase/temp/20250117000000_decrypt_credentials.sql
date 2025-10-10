-- Add function to decrypt bot tokens from connected_integrations
CREATE OR REPLACE FUNCTION public.decrypt_bot_token(integration_id_in uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    encrypted_token text;
    decrypted_token text;
BEGIN
    -- Get the encrypted token
    SELECT credentials->>'bot_token' INTO encrypted_token
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