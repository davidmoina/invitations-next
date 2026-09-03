DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'invitations_audit_app') THEN
		CREATE ROLE invitations_audit_app NOLOGIN;
	END IF;
END
$$;
--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO invitations_audit_app;
--> statement-breakpoint
GRANT SELECT, INSERT ON TABLE audit_log TO invitations_audit_app;
--> statement-breakpoint
REVOKE UPDATE, DELETE ON TABLE audit_log FROM invitations_audit_app;
--> statement-breakpoint
DO $$
BEGIN
	EXECUTE format('GRANT %I TO %I', 'invitations_audit_app', current_user);
END
$$;
