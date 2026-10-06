create extension if not exists pg_cron;

do $$
begin
  begin
    perform cron.unschedule('reviver-publish-due');
  exception when others then
    null;
  end;
  perform cron.schedule('reviver-publish-due','* * * * *','select public.publish_due_content();');
end $$;
