-- Add unique constraints for each integration type to prevent duplicates

-- For Slack, a user can only connect a specific workspace once
CREATE UNIQUE INDEX unique_slack_integration ON public.connected_integrations (user_id, (metadata->>'team_id'))
    WHERE (integration_type = 'slack');

-- For Discord, a user can only connect a specific guild once
CREATE UNIQUE INDEX unique_discord_integration ON public.connected_integrations (user_id, (metadata->>'guild_id'))
    WHERE (integration_type = 'discord');

-- For Alexa, a user can only have one linked account
-- The integration_type check is sufficient here as it's a 1-to-1 mapping per user
CREATE UNIQUE INDEX unique_alexa_integration ON public.connected_integrations (user_id)
    WHERE (integration_type = 'alexa'); 