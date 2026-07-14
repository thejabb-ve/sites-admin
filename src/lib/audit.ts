import type { SupabaseClient } from '@supabase/supabase-js';

export type AuditAction =
	| 'create'
	| 'update'
	| 'delete'
	| 'publish'
	| 'archive'
	| 'restore'
	| 'purge_cache'
	| 'configure'
	| 'disconnect';

export type AuditResourceType =
	| 'page'
	| 'asset'
	| 'brand'
	| 'settings'
	| 'template'
	| 'block'
	| 'cache'
	| 'domain';

interface AuditParams {
	supabase: SupabaseClient;
	projectId: string;
	userId: string | null;
	actor: string;
	action: AuditAction;
	resourceType: AuditResourceType;
	resourceId?: string;
	resourceName?: string;
	changed?: string[];
	status?: 'ok' | 'error';
	errorMessage?: string;
}

export async function logAudit({
	supabase,
	projectId,
	userId,
	actor,
	action,
	resourceType,
	resourceId,
	resourceName,
	changed,
	status = 'ok',
	errorMessage,
}: AuditParams): Promise<void> {
	try {
		await supabase.from('audit_log').insert({
			project_id: projectId,
			user_id: userId,
			actor,
			action,
			resource_type: resourceType,
			resource_id: resourceId ?? null,
			resource_name: resourceName ?? null,
			changed: changed ?? null,
			status,
			error_message: errorMessage ?? null,
		});
	} catch {
		// Never throw — logging must not interrupt the main flow
	}
}
